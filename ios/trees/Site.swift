import Foundation

struct Site {

    // Mercator coordinates, scaled to 0..<2^32
    // at zoom z, the top z bits indicate the tile index
    var x: UInt32
    var y: UInt32

    // index into TreeType array
    var typeIndex: UInt16

    init(x: UInt32, y: UInt32, typeIndex: UInt16) {
        self.x = x
        self.y = y
        self.typeIndex = typeIndex
    }

    init(location: MapLocation, typeIndex: UInt16) {
        let (x, y) = Mercator.projectQuantized(location)
        self.init(x: x, y: y, typeIndex: UInt16(typeIndex))
    }

    var location: MapLocation {
        Mercator.unproject(x: Double(x) / Mercator.scale, y: Double(y) / Mercator.scale)
    }

    var type: TreeType {
        TreeType.all[Int(typeIndex)]
    }

}
