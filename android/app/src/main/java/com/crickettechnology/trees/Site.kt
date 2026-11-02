package com.crickettechnology.trees

data class Site(
    // Mercator coordinates, scaled to 0..<2^32
    // at zoom z, the top z bits indicate the tile index
    var location: QuantizedWorldLocation,


    // index into TreeType array (UInt16)
    var typeIndex: Int
) {

    val type: TreeType
        get() { return TreeType.all[typeIndex] }
}
