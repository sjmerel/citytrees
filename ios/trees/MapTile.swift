import Foundation

// Tiles follow the Google Maps / Web Mercator scheme: tile (z, x, y) is the quadtree node
// at depth z, covering the world square cell x, y of a 2^z by 2^z grid.

struct TileKey: Hashable, Comparable {
    let z: Int
    let x: Int
    let y: Int

    static func < (a: TileKey, b: TileKey) -> Bool {
        (a.z, a.x, a.y) < (b.z, b.x, b.y)
    }

    // Name used when the tile is a (flat) bundle resource.
    var fileName: String { "tile_\(z)_\(x)_\(y).bin" }

    // Relative path used when the tile is hosted for download.
    var path: String { "\(z)/\(x)/\(y).bin" }

    var rect: MapRect {
        let count = Double(1 << z)
        let northWest = WorldCoord.location(x: Double(x) / count, y: Double(y) / count)
        let southEast = WorldCoord.location(x: Double(x + 1) / count, y: Double(y + 1) / count)
        return MapRect(northWest: northWest, southEast: southEast)
    }
}


// Web Mercator world coordinates, scaled to 0..<2^32 so that tile and quadrant membership
// are exact bit operations (one unit is about 9 mm at the equator).
enum WorldCoord {

    static let scale = 4294967296.0

    static func project(_ location: MapLocation) -> (x: UInt32, y: UInt32) {
        // Truncating to 0.9999 effectively limits latitude to 89.189.
        let s = min(max(sin(location.lat * .pi / 180), -0.9999), 0.9999)
        let x = 0.5 + location.lon / 360
        let y = 0.5 - log((1 + s) / (1 - s)) / (4 * .pi)
        return (quantize(x), quantize(y))
    }

    // x and y are fractions of the world square, 0...1.
    static func location(x: Double, y: Double) -> MapLocation {
        let lon = (x - 0.5) * 360
        let lat = atan(sinh(.pi * (1 - 2 * y))) * 180 / .pi
        return MapLocation(lat: lat, lon: lon)
    }

    private static func quantize(_ fraction: Double) -> UInt32 {
        UInt32(min(max(fraction * scale, 0), scale - 1))
    }
}


struct QuantizedSite {
    var x: UInt32
    var y: UInt32
    var typeIndex: UInt16

    init(x: UInt32, y: UInt32, typeIndex: UInt16) {
        self.x = x
        self.y = y
        self.typeIndex = typeIndex
    }

    init(_ site: Site) {
        let (x, y) = WorldCoord.project(site.location)
        self.init(x: x, y: y, typeIndex: UInt16(site.typeIndex))
    }
}


// A tile file is a header followed by sites in priority order, so any prefix of the sites
// is a valid lower-density sample.
//
//   UInt8   flags (bit 0: leaf, meaning the tile holds every site in its area)
//   UInt8   shift
//   UInt32  site count
//   UInt32  minX, minY (world coordinates of the sites' bounding box corner)
//   count x (UInt16 dx, UInt16 dy, UInt16 type)
//
// A site's world coordinate is min + (offset << shift). The shift is the smallest that
// fits the bounding box in 16 bits, so precision follows the extent of the data: about
// 1/256 of a pixel at the zoom level where a non-leaf tile is displayed.
struct MapTile {

    static let leafFlag: UInt8 = 1

    let isLeaf: Bool
    let sites: [Site]

    static func write(sites: ArraySlice<QuantizedSite>, isLeaf: Bool, writer: BinaryWriter) {
        var minX = UInt32.max, minY = UInt32.max
        var maxX = UInt32.min, maxY = UInt32.min
        for site in sites {
            minX = min(minX, site.x)
            maxX = max(maxX, site.x)
            minY = min(minY, site.y)
            maxY = max(maxY, site.y)
        }
        if sites.isEmpty { minX = 0; minY = 0 }

        let span = max(maxX &- minX, maxY &- minY)
        var shift: UInt64 = 0
        while (UInt64(span) >> shift) > 0xFFFF { shift += 1 }
        let half: UInt64 = shift > 0 ? 1 << (shift - 1) : 0

        func offset(_ value: UInt32, from origin: UInt32) -> UInt16 {
            UInt16(min((UInt64(value - origin) + half) >> shift, 0xFFFF))
        }

        writer.writeUInt8(isLeaf ? leafFlag : 0)
        writer.writeUInt8(UInt8(shift))
        writer.writeUInt32(UInt32(sites.count))
        writer.writeUInt32(minX)
        writer.writeUInt32(minY)
        for site in sites {
            writer.writeUInt16(offset(site.x, from: minX))
            writer.writeUInt16(offset(site.y, from: minY))
            writer.writeUInt16(site.typeIndex)
        }
    }

    static func readBinary(url: URL) -> MapTile {
        let reader = BinaryReader(url: url)
        let flags = reader.readUInt8()
        let shift = UInt64(reader.readUInt8())
        let count = Int(reader.readUInt32())
        let minX = UInt64(reader.readUInt32())
        let minY = UInt64(reader.readUInt32())

        var sites: [Site] = []
        sites.reserveCapacity(count)
        for _ in 0..<count {
            let x = Double(minX + (UInt64(reader.readUInt16()) << shift))
            let y = Double(minY + (UInt64(reader.readUInt16()) << shift))
            let location = WorldCoord.location(x: x / WorldCoord.scale, y: y / WorldCoord.scale)
            sites.append(Site(location: location, typeIndex: Int(reader.readUInt16())))
        }
        assert(reader.isAtEnd)
        return MapTile(isLeaf: flags & leafFlag != 0, sites: sites)
    }
}


struct TileManifestEntry {
    let key: TileKey
    let isLeaf: Bool
    let siteCount: Int
    let byteCount: Int
    let hash: UInt64
}

// Lists every tile, so a client can tell which tiles exist, and whether a cached copy is current.
enum TileManifest {

    static func write(entries: [TileManifestEntry], to url: URL) throws {
        let writer = BinaryWriter()
        writer.writeUInt32(UInt32(entries.count))
        for entry in entries {
            writer.writeUInt8(UInt8(entry.key.z))
            writer.writeUInt32(UInt32(entry.key.x))
            writer.writeUInt32(UInt32(entry.key.y))
            writer.writeUInt8(entry.isLeaf ? 1 : 0)
            writer.writeUInt32(UInt32(entry.siteCount))
            writer.writeUInt32(UInt32(entry.byteCount))
            writer.writeUInt64(entry.hash)
        }
        try writer.write(to: url)
    }

    static func readBinary(url: URL) -> [TileManifestEntry] {
        let reader = BinaryReader(url: url)
        let count = Int(reader.readUInt32())
        var entries: [TileManifestEntry] = []
        entries.reserveCapacity(count)
        for _ in 0..<count {
            let z = Int(reader.readUInt8())
            let x = Int(reader.readUInt32())
            let y = Int(reader.readUInt32())
            let isLeaf = reader.readUInt8() != 0
            let siteCount = Int(reader.readUInt32())
            let byteCount = Int(reader.readUInt32())
            let hash = reader.readUInt64()
            entries.append(TileManifestEntry(key: TileKey(z: z, x: x, y: y), isLeaf: isLeaf,
                                             siteCount: siteCount, byteCount: byteCount, hash: hash))
        }
        assert(reader.isAtEnd)
        return entries
    }

    // 64-bit FNV-1a.
    static func hash(of data: Data) -> UInt64 {
        var hash: UInt64 = 0xcbf29ce484222325
        for byte in data {
            hash = (hash ^ UInt64(byte)) &* 0x100000001b3
        }
        return hash
    }
}
