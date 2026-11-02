package com.crickettechnology.trees

import java.io.File

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
data class MapTile(val isLeaf: Boolean, val sites: List<Site>) {

    companion object {
        const val leafFlag = 1

        fun write(sites: List<Site>, isLeaf: Boolean, writer: BinaryWriter) {
            var minX = UInt.MAX_VALUE
            var minY = UInt.MAX_VALUE
            var maxX = UInt.MIN_VALUE
            var maxY = UInt.MIN_VALUE
            for (site in sites) {
                minX = minOf(minX, site.location.x)
                maxX = maxOf(maxX, site.location.x)
                minY = minOf(minY, site.location.y)
                maxY = maxOf(maxY, site.location.y)
            }
            if (sites.isEmpty()) { minX = 0u; minY = 0u }

            val span = maxOf(maxX - minX, maxY - minY).toLong()
            var shift = 0
            while ((span shr shift) > 0xffff) shift++
            val half = if (shift > 0) 1L shl (shift - 1) else 0L

            fun offset(value: UInt, origin: UInt): Int {
                return minOf(((value - origin).toLong() + half) shr shift, 0xffffL).toInt()
            }

            writer.writeUInt8(if (isLeaf) leafFlag else 0)
            writer.writeUInt8(shift)
            writer.writeUInt32(sites.size.toUInt())
            writer.writeUInt32(minX)
            writer.writeUInt32(minY)
            for (site in sites) {
                writer.writeUInt16(offset(site.location.x, minX))
                writer.writeUInt16(offset(site.location.y, minY))
                writer.writeUInt16(site.typeIndex)
            }
        }

        fun readBinary(file: File): MapTile {
            val reader = BinaryReader(file)
            val flags = reader.readUInt8()
            val shift = reader.readUInt8()
            val count = reader.readUInt32().toInt()
            val minX = reader.readUInt32().toLong()
            val minY = reader.readUInt32().toLong()

            val sites = ArrayList<Site>(count)
            for (i in 0 until count) {
                val x = minOf(minX + (reader.readUInt16().toLong() shl shift), 0xffffffffL).toUInt()
                val y = minOf(minY + (reader.readUInt16().toLong() shl shift), 0xffffffffL).toUInt()
                val location = QuantizedWorldLocation(x, y)
                sites.add(Site(location, reader.readUInt16()))
            }
            check(reader.isAtEnd)
            return MapTile(flags and leafFlag != 0, sites)
        }
    }
}
