import Foundation

struct TreeSite {

    let location: MapLocation

    var type: TreeType {
        TreeType.all[typeIndex]
    }

    static func load(reader: BinaryReader) -> TreeSite {
        let location = MapLocation.load(reader: reader) //MapLocation(longitude: longitude, latitude: latitude)
        let typeIndex = Int(reader.readUInt16())
        return TreeSite(location: location, typeIndex: typeIndex)
    }


    ////////////////////////////////////////

    private let typeIndex: Int
}
