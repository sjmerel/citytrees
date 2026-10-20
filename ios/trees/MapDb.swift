import Foundation

// Provides the sites in the tile pyramid (see MapTile.swift). Safe to use from any thread.
final class MapDb {

    static let instance = MapDb()

    // A region of the world square, as fractions 0...1 of its width and height.
    struct WorldRect {
        var minX: Double, minY: Double, maxX: Double, maxY: Double
    }

    // The tiles needed to show a region at a zoom level. Zoom levels deeper than the data
    // use the deepest tiles.
    func tiles(covering rect: WorldRect, zoom: Int) -> [(key: TileKey, tile: MapTile)] {
        let z = min(zoom, maxZoom)
        let count = 1 << z
        func index(_ fraction: Double) -> Int {
            min(max(Int((fraction * Double(count)).rounded(.down)), 0), count - 1)
        }

        var keys = Set<TileKey>()
        for y in index(rect.minY)...index(rect.maxY) {
            for x in index(rect.minX)...index(rect.maxX) {
                var key = TileKey(z: z, x: x, y: y)
                if tileExists.contains(key) {
                    keys.insert(key)
                    continue
                }
                // A missing tile is either empty, or inside an ancestor that is a leaf
                // (which holds every site in its area).
                while key.z > 0 {
                    key = key.parent
                    if leaves.contains(key) {
                        keys.insert(key)
                        break
                    }
                }
            }
        }
        return keys.sorted().map { ($0, tile($0)) }
    }

    func findNearest(location: MapLocation, maxDistance: Double, zoom: Int) -> QuantizedSite? {
        let center = WorldCoord.project(location)
        let radius = maxDistance / WorldCoord.metersPerUnit(atLatitude: location.lat)
        let scale = WorldCoord.scale
        let rect = WorldRect(minX: (Double(center.x) - radius) / scale,
                             minY: (Double(center.y) - radius) / scale,
                             maxX: (Double(center.x) + radius) / scale,
                             maxY: (Double(center.y) + radius) / scale)

        var best: QuantizedSite?
        var bestDistance = radius * radius
        for (_, tile) in tiles(covering: rect, zoom: zoom) {
            for site in tile.sites {
                let dx = Double(site.x) - Double(center.x)
                let dy = Double(site.y) - Double(center.y)
                let distance = dx * dx + dy * dy
                if distance <= bestDistance {
                    best = site
                    bestDistance = distance
                }
            }
        }
        return best
    }

    ////////////////////////////////////////

    private let tileExists: Set<TileKey>
    private let leaves: Set<TileKey>
    private let maxZoom: Int

    private let lock = NSLock()
    private var cache: [TileKey: MapTile] = [:]
    private var recentKeys: [TileKey] = []  // least recently used first
    private let CACHE_CAPACITY = 64

    private init() {
        let url = Bundle.main.url(forResource: "tiles_manifest", withExtension: "bin")!
        let entries = TileManifest.readBinary(url: url)
        tileExists = Set(entries.map { $0.key })
        leaves = Set(entries.filter { $0.isLeaf }.map { $0.key })
        maxZoom = entries.map { $0.key.z }.max() ?? 0
    }

    private func tile(_ key: TileKey) -> MapTile {
        lock.lock()
        defer { lock.unlock() }

        if let tile = cache[key] {
            recentKeys.removeAll { $0 == key }
            recentKeys.append(key)
            return tile
        }

        let url = Bundle.main.resourceURL!.appendingPathComponent(key.fileName)
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
