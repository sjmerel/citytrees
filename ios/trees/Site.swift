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

    func writeBinary(writer: BinaryWriter) {
        location.writeBinary(writer: writer)
        writer.writeUInt16(UInt16(typeIndex))
    }

    static func decimate(sites: [Site], n: Int) -> [Site] {
        assert(n < sites.count)
        return (0..<n).map { sites[$0 * sites.count / n] }
    }

    ////////////////////////////////////////

    let typeIndex: Int


}
