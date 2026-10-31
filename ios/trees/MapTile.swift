import Foundation


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

    static func write(sites: ArraySlice<Site>, isLeaf: Bool, writer: BinaryWriter) {
        var minX = UInt32.max, minY = UInt32.max
        var maxX = UInt32.min, maxY = UInt32.min
        for site in sites {
            minX = min(minX, site.location.x)
            maxX = max(maxX, site.location.x)
            minY = min(minY, site.location.y)
            maxY = max(maxY, site.location.y)
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
            writer.writeUInt16(offset(site.location.x, from: minX))
            writer.writeUInt16(offset(site.location.y, from: minY))
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
            let x = UInt32(min(minX + (UInt64(reader.readUInt16()) << shift), UInt64(UInt32.max)))
            let y = UInt32(min(minY + (UInt64(reader.readUInt16()) << shift), UInt64(UInt32.max)))
            let location = QuantizedWorldLocation(x: x, y: y)
            sites.append(Site(location: location, typeIndex: reader.readUInt16()))
        }
        assert(reader.isAtEnd)
        return MapTile(isLeaf: flags & leafFlag != 0, sites: sites)
    }
}


