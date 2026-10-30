import Foundation

struct Site {

    // Mercator coordinates, scaled to 0..<2^32
    // at zoom z, the top z bits indicate the tile index
    var location: QuantizedWorldLocation

    // index into TreeType array
    var typeIndex: UInt16


    /*
    init(location: QuantizedWorldLocation, typeIndex: UInt16) {
        self.location = location
        self.typeIndex = typeIndex
    }

    init(location: MapLocation, typeIndex: UInt16) {
        self.location = Mercator.projectQuantized(location)
        self.typeIndex = typeIndex
    }
    */


    /*
    var location: MapLocation {
        Mercator.unproject(x: Double(x) / Mercator.scale, y: Double(y) / Mercator.scale)
    }
    */

    var type: TreeType {
        TreeType.all[Int(typeIndex)]
    }

}
