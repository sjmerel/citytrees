import Foundation
import GoogleMaps

// Provides the sites in the tile pyramid (see MapTile.swift). Safe to use from any thread.
final class TileDb {

    static let instance = TileDb()

    let siteCount: Int

    // Get the tiles needed to show a region at a zoom level
    func tiles(covering rect: WorldRect, zoom: Int) -> [MapTile] {
        let z = min(zoom, maxZoom)
        let count = 1 << z
        func index(_ fraction: Double) -> Int {
            min(max(Int((fraction * Double(count)).rounded(.down)), 0), count - 1)
        }

        // for each tile in the rect at the current zoom, get the key for the tile actually in the manifest.
        var keys = Set<TileKey>()
        for y in index(rect.minY)...index(rect.maxY) {
            for x in index(rect.minX)...index(rect.maxX) {
                var key = TileKey(z: z, x: x, y: y)
                if tileKeySet.contains(key) {
                    keys.insert(getAvailableTileKey(for: key))
                }
                else {
                    // A missing tile is either empty, or inside an ancestor that is a leaf
                    // (which holds every site in its area).
                    while key.z > 0 {
                        key = key.parent
                        if leafKeySet.contains(key) {
                            keys.insert(getAvailableTileKey(for: key))
                            break
                        }
                    }
                }
            }
        }

        // sort so drawing order is deterministic
        return keys.sorted().map { getTile($0) }
    }

    func findNearest(location: MapLocation, maxDistance: Double, zoom: Int) -> Site? {
        let center = Mercator.project(location)
        let radius = maxDistance / Mercator.metersPerUnit(atLatitude: location.lat)
        let rect = WorldRect(minX: (center.x - radius),
                             minY: (center.y - radius),
                             maxX: (center.x + radius),
                             maxY: (center.y + radius))

        var best: Site?
        var bestDistance = radius * radius
        for tile in tiles(covering: rect, zoom: zoom) {
            for site in tile.sites {
                let location = QuantizedWorldLocation.unquantize(site.location)
                let dx = Double(location.x) - Double(center.x)
                let dy = Double(location.y) - Double(center.y)
                let distance = dx * dx + dy * dy
                if distance <= bestDistance {
                    best = site
                    bestDistance = distance
                }
            }
        }

        return best
    }

    // Called on the main thread when more tiles became available, so the map can redraw.
    var onTilesDownloaded: (() -> Void)? {
        get { store.onTilesDownloaded }
        set { store.onTilesDownloaded = newValue }
    }

    ////////////////////////////////////////

    // The tile itself if it is on the device; otherwise starts downloading it, and uses its
    // closest ancestor that is available (a coarser sample of the same area) in the meantime.
    // Tiles up to the bundled zoom level are always available.
    private func getAvailableTileKey(for key: TileKey) -> TileKey {
        var key = key
        while key.z > 0 && store.url(for: key) == nil {
            key = key.parent
        }
        return key
    }

    private let store: TileStore
    private let tileKeySet: Set<TileKey>
    private let leafKeySet: Set<TileKey>
    private let maxZoom: Int

    private let lock = NSLock()
    private var cache: [TileKey: MapTile] = [:]
    private var recentKeys: [TileKey] = []  // least recently used first
    private let CACHE_CAPACITY = 64

    private init() {
        let url = Bundle.main.url(forResource: "tiles_manifest", withExtension: "bin")!
        let entries = TileManifest.readBinary(url: url)
        siteCount = entries.lazy.filter { $0.isLeaf }.reduce(0) { $0 + $1.siteCount }
        store = TileStore(entries: entries)

        tileKeySet = Set(entries.map { $0.key })
        leafKeySet = Set(entries.filter { $0.isLeaf }.map { $0.key })
        maxZoom = entries.map { $0.key.z }.max() ?? 0
    }

    private func getTile(_ key: TileKey) -> MapTile {
        lock.lock()
        defer { lock.unlock() }

        if let tile = cache[key] {
            recentKeys.removeAll { $0 == key }
            recentKeys.append(key)
            return tile
        }

        // the file can be missing if the system cleared the caches directory
        guard let url = store.url(for: key) else { return MapTile(isLeaf: false, sites: []) }
        let profiler = Profiler(name: "load tile \(key)")
        let tile = MapTile.readBinary(url: url)
        profiler.stop()
        cache[key] = tile
        recentKeys.append(key)
        if recentKeys.count > CACHE_CAPACITY {
            let evicted = recentKeys.removeFirst()
            cache[evicted] = nil
            print("unload tile \(evicted)")
        }
        print("tile cache: \(cache.count) tiles")
        return tile
    }
}
