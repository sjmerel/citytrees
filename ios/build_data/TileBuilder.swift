import Foundation

// Writes the tile pyramid. A tile holds at most maxSites sites, in priority order. Where
// there are more sites than that in a tile's area, the tile holds the highest priority ones
// and the area is split into four child tiles (the next zoom level), which repeat those
// sites and add the rest. A tile holding every site in its area is a leaf.

class TileBuilder {

    // Both directories use z/x/y.bin. Tiles up to bundleMaxZoom go to bundleDir;
    // deeper tiles go to downloadDir. Without a downloadDir everything goes to bundleDir.
    init(maxSites: Int, maxZoom: Int, bundleMaxZoom: Int, bundleDir: URL, downloadDir: URL?) {
        self.maxSites = maxSites
        self.maxZoom = maxZoom
        self.bundleMaxZoom = bundleMaxZoom
        self.bundleDir = bundleDir
        self.downloadDir = downloadDir
    }

    private(set) var entries: [TileManifestEntry] = []
    private(set) var urls: [TileKey: URL] = [:]

    // Sites must be in priority order; the array is emptied to release memory as it goes.
    func writeTiles(sites: inout [Site]) throws {
        try writeTiles(key: TileKey.root, sites: &sites)
    }

    func writeManifest() throws {
        let sorted = entries.sorted { $0.key < $1.key }
        try TileManifest.write(entries: sorted, to: bundleDir.appendingPathComponent("tiles_manifest.bin"))
        if let downloadDir {
            try TileManifest.write(entries: sorted, to: downloadDir.appendingPathComponent("tiles_manifest.bin"))
        }
    }

    ////////////////////////////////////////

    private let maxSites: Int
    private let maxZoom: Int
    private let bundleMaxZoom: Int
    private let bundleDir: URL
    private let downloadDir: URL?

    private func writeTiles(key: TileKey, sites: inout [Site]) throws {
        if sites.isEmpty { return }

        // write sites in this tile itself
        let isLeaf = sites.count <= maxSites || key.z == maxZoom
        try write(key: key, sites: sites.prefix(isLeaf ? sites.count : maxSites), isLeaf: isLeaf)
        if isLeaf { return }

        // build child tiles
        var children = [[Site]](repeating: [], count: 4)
        let bit = UInt32(31 - key.z)
        for site in sites {
            let cx = Int((site.x >> bit) & 1)
            let cy = Int((site.y >> bit) & 1)
            children[cy * 2 + cx].append(site)
        }
        sites = [] // release memory

        for index in 0..<4 {
            let child = TileKey(z: key.z + 1, x: key.x * 2 + index % 2, y: key.y * 2 + index / 2)
            try writeTiles(key: child, sites: &children[index])
            children[index] = []
        }
    }

    private func write(key: TileKey, sites: ArraySlice<Site>, isLeaf: Bool) throws {
        let writer = BinaryWriter()
        MapTile.write(sites: sites, isLeaf: isLeaf, writer: writer)

        let url: URL
        if let downloadDir, key.z > bundleMaxZoom {
            url = downloadDir.appendingPathComponent(key.path)
        } else {
            url = bundleDir.appendingPathComponent(key.path)
        }
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try writer.write(to: url)

        entries.append(TileManifestEntry(key: key, isLeaf: isLeaf, siteCount: sites.count,
                                         byteCount: writer.data.count, hash: TileManifest.hash(of: writer.data)))
        urls[key] = url
    }
}
