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

    let typeIndex: Int


}
