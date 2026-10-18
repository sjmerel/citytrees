import Foundation

struct Site {

    init(location: MapLocation, typeIndex: Int) {
        self.location = location
        self.typeIndex = typeIndex
    }

    let location: MapLocation

    var type: TreeType {
        TreeType.all[typeIndex]
    }


    ////////////////////////////////////////

    static func readBinary(reader: BinaryReader) -> Site {
        let location = MapLocation.readBinary(reader: reader)
        let typeIndex = Int(reader.readUInt16())
        return Site(location: location, typeIndex: typeIndex)
    }

    static func writeBinary(sites: [Site], url: URL) throws {
        let profiler = Profiler(name: "write \(url)")

        var north = -Double.infinity, south = Double.infinity
        var west = Double.infinity, east = -Double.infinity
        for site in sites {
            north = max(north, site.location.lat)
            south = min(south, site.location.lat)
            west = min(west, site.location.lon)
            east = max(east, site.location.lon)
        }

        let writer = BinaryWriter()
        writer.writeUInt32(UInt32(sites.count))
        MapRect(north: north, west: west, south: south, east: east).writeBinary(writer: writer)
        for site in sites {
            site.writeBinary(writer: writer)
        }
        try writer.write(to: url)

        profiler.stop()
    }


    static func decimate(sites: [Site], n: Int) -> [Site] {
        assert(n < sites.count)
        return (0..<n).map { sites[$0 * sites.count / n] }
    }

    ////////////////////////////////////////

    private let typeIndex: Int

    private func writeBinary(writer: BinaryWriter) {
        location.writeBinary(writer: writer)
        writer.writeUInt16(UInt16(typeIndex))
    }

}
