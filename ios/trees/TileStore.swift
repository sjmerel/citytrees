import Foundation

// Finds tile files for MapDb: bundled tiles first, then tiles downloaded earlier into the
// caches directory, and downloads missing ones in the background. Safe to use from any thread.
//
// TreeData clears the cache directory when a new data version is found, so cached tiles always
// belong to the current version.
final class TileStore {

    // Called on the main thread, shortly after tiles were downloaded.
    var onTilesDownloaded: (() -> Void)?

    // Called on the main thread with true when a download fails, and false when one next succeeds.
    var onDownloadFailedChanged: ((Bool) -> Void)?

    init(entries: [TileManifestEntry]) {
        self.entryMap = Dictionary(uniqueKeysWithValues: entries.map { ($0.key, $0) })

        cacheDir = Dataset.instance.tileCacheDir
        try? FileManager.default.createDirectory(at: cacheDir, withIntermediateDirectories: true)
    }

    // The file holding the tile, if it is available now. Otherwise starts a download (if the
    // tile exists) and returns nil.
    func getUrl(for key: TileKey) -> URL? {
        if key == TileKey.root {
            return Dataset.instance.localDir.appendingPathComponent(key.path)
        }
        if let entry = entryMap[key] {
            let cached = getCacheUrl(for: entry)
            if FileManager.default.fileExists(atPath: cached.path) { 
                return cached 
            }
            else {
                request(entry)
                return nil
            }
        }
        else {
            return nil
        }
    }


    ////////////////////////////////////////

    private let MAX_CONCURRENT = 4
    private let MAX_PENDING = 64
    private let RETRY_DELAY_SECONDS = 30.0
    private let NOTIFY_DELAY_SECONDS = 1.0

    private let entryMap: [TileKey: TileManifestEntry]
    private let cacheDir: URL
    private let session = URLSession(configuration: .ephemeral)

    private let lock = NSLock()
    private var pending: [TileKey] = []  // most recently requested last
    private var inFlight = Set<TileKey>()
    private var retryAfter: [TileKey: Date] = [:]
    private var notifyScheduled = false
    private var downloadFailed = false

    private func getCacheUrl(for entry: TileManifestEntry) -> URL {
        let key = entry.key
        return cacheDir.appendingPathComponent("\(key.z)_\(key.x)_\(key.y).bin")
    }

    private func request(_ entry: TileManifestEntry) {
        lock.lock()
        defer { lock.unlock() }

        let key = entry.key
        if inFlight.contains(key) { return }
        if let retry = retryAfter[key], retry > Date() { return }

        // Most recently requested tiles are the ones on screen now, so they go first.
        pending.removeAll { $0 == key }
        pending.append(key)
        if pending.count > MAX_PENDING {
            pending.removeFirst(pending.count - MAX_PENDING)
        }
        startDownloads()
    }

    // Lock must be held.
    private func startDownloads() {
        while inFlight.count < MAX_CONCURRENT, let key = pending.popLast() {
            if let entry = entryMap[key] {
                inFlight.insert(key)
                print("tile \(key): download started (\(entry.byteCount) bytes)")
                let task = session.dataTask(with: Dataset.instance.serverDir.appendingPathComponent(key.path)) { [self] data, response, error in
                    finish(entry: entry, data: data, response: response, error: error)
                }
                task.resume()
            }
        }
    }

    private func finish(entry: TileManifestEntry, data: Data?, response: URLResponse?, error: Error?) {
        var succeeded = false
        if let data, error == nil, (response as? HTTPURLResponse)?.statusCode == 200 {
            if data.count == entry.byteCount {
                do {
                    try data.write(to: getCacheUrl(for: entry), options: .atomic)
                    succeeded = true
                    print("tile \(entry.key): download finished")
                }
                catch {
                    print("tile \(entry.key): can't write: \(error)")
                }
            }
            else {
                print("tile \(entry.key): downloaded data doesn't match the manifest")
            }
        }
        else {
            print("tile \(entry.key): download failed: \(error?.localizedDescription ?? "HTTP \((response as? HTTPURLResponse)?.statusCode ?? 0)")")
        }

        lock.lock()
        inFlight.remove(entry.key)
        if succeeded {
            retryAfter[entry.key] = nil
        }
        else {
            retryAfter[entry.key] = Date().addingTimeInterval(RETRY_DELAY_SECONDS)
        }
        startDownloads()
        let notify = succeeded && !notifyScheduled
        if notify { notifyScheduled = true }
        let failedChanged = downloadFailed == succeeded
        downloadFailed = !succeeded
        lock.unlock()

        if failedChanged {
            DispatchQueue.main.async { [self] in
                onDownloadFailedChanged?(!succeeded)
            }
        }

        if notify {
            // batches the tiles that finish close together into a single redraw
            DispatchQueue.main.asyncAfter(deadline: .now() + NOTIFY_DELAY_SECONDS) { [self] in
                lock.lock()
                notifyScheduled = false
                lock.unlock()
                onTilesDownloaded?()
            }
        }
    }
}
