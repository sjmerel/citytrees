package com.crickettechnology.citytrees

// Tiles follow the Google Maps / Web Mercator scheme: tile (z, x, y) is the quadtree node
// at depth z, covering the world square cell x, y of a 2^z by 2^z grid.
data class TileKey(val z: Int, val x: Int, val y: Int) : Comparable<TileKey> {

    override fun toString(): String { return "$z/$x/$y" }

    override fun compareTo(other: TileKey): Int {
        return compareValuesBy(this, other, TileKey::z, TileKey::x, TileKey::y)
    }

    val path: String
        get() { return "$z/$x/$y.bin" }

    val parent: TileKey
        get() { return TileKey(z - 1, x shr 1, y shr 1) }


    companion object {
        val root = TileKey(0, 0, 0)
    }
}
