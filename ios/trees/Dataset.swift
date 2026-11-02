import Foundation

class Dataset {

    static let instance = Dataset()

    var localDir: URL {
        getLocalDir(for: timestamp!)
    }

    var serverDir: URL {
        getServerDir(for: timestamp!)
    }

    var tileCacheDir: URL {
        FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("tiles", isDirectory: true)
    }


    func checkForNewData() async throws -> Void {
        let timestampUrl = Config.instance.serverUrl.appendingPathComponent("latest.txt")
        let timestampData = try await download(url: timestampUrl)

        let newTimestamp = String(data: timestampData, encoding: .utf8)!.trimmingCharacters(in: .whitespacesAndNewlines)
        let oldTimestamp = self.timestamp

        let fileManager = FileManager.default

        if newTimestamp != oldTimestamp {
            let newLocalDir = getLocalDir(for: newTimestamp)
            if fileManager.fileExists(atPath: newLocalDir.path) {
                try fileManager.removeItem(at: newLocalDir)
            }
            try fileManager.createDirectory(at: newLocalDir, withIntermediateDirectories: true)

            let serverDir = getServerDir(for: newTimestamp)

            // TODO parallel
            try await download(fromDir: serverDir, toDir: newLocalDir, path: "types.bin")
            try await download(fromDir: serverDir, toDir: newLocalDir, path: "tiles_manifest.bin")
            try await download(fromDir: serverDir, toDir: newLocalDir, path: "cities.json")
            try await download(fromDir: serverDir, toDir: newLocalDir, path: "0/0/0.bin")

            // must happen before the new timestamp is saved, so old tiles are never used with new data
            if fileManager.fileExists(atPath: tileCacheDir.path) {
                try fileManager.removeItem(at: tileCacheDir)
            }

            self.timestamp = newTimestamp

            if let oldTimestamp {
                let oldLocalDir = getLocalDir(for: oldTimestamp)
                try fileManager.removeItem(at: oldLocalDir)
            }
        }
    }

    ////////////////////////////////////////

    private init() {}

    private var timestamp: String? {
        get { return UserDefaults.standard.string(forKey: "timestamp") }
        set { UserDefaults.standard.set(newValue, forKey: "timestamp") }
    }

    private func getLocalDir(for timestamp: String) -> URL {
        let bundleId = Bundle.main.bundleIdentifier!
        let localDataUrl = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent(bundleId, isDirectory: true)
        return localDataUrl.appendingPathComponent(timestamp, isDirectory: true)
    }

    private func getServerDir(for timestamp: String) -> URL {
        return Config.instance.serverUrl.appendingPathComponent(timestamp)
    }


    private func download(url: URL) async throws -> Data {
        let request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalAndRemoteCacheData)
        let (data, response) = try await URLSession.shared.data(for: request)
        let httpResponse = response as! HTTPURLResponse
        if httpResponse.statusCode != 200 {
            throw TreesError(errorDescription: "Couldn't download file")
        }
        return data
    }

    private func download(fromDir: URL, toDir: URL, path: String) async throws -> Void {
        let fromUrl = fromDir.appendingPathComponent(path)
        let toUrl = toDir.appendingPathComponent(path)
        try FileManager.default.createDirectory(at: toUrl.deletingLastPathComponent(), withIntermediateDirectories: true)
        let data = try await download(url: fromUrl)
        try data.write(to: toUrl, options: .atomic)
    }
}
