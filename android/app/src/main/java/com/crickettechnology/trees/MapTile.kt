package com.crickettechnology.trees

import java.io.File
import kotlin.math.PI
import kotlin.math.atan
import kotlin.math.cos
import kotlin.math.ln
import kotlin.math.sin
import kotlin.math.sinh

// Google Maps / Web Mercator tiles: (z, x, y) indexes a cell in a 2^z square grid.
data class TileKey(val z: Int, val x: Int, val y: Int) : Comparable<TileKey> {
    override fun compareTo(other: TileKey): Int =
        compareValuesBy(this, other, TileKey::z, TileKey::x, TileKey::y)

    override fun toString(): String = "$z/$x/$y"

    val path: String get() = "$z/$x/$y.bin"
    val parent: TileKey get() = TileKey(z - 1, x shr 1, y shr 1)

    val rect: MapRect
        get() {
            val count = (1 shl z).toDouble()
            return MapRect(
                WorldCoord.location(x / count, y / count),
                WorldCoord.location((x + 1) / count, (y + 1) / count)
            )
        }
}

// Coordinates span 0..<2^32; UInt keeps tile membership exact over the whole world.
object WorldCoord {
    const val scale = 4294967296.0

    fun project(location: MapLocation): Pair<UInt, UInt> {
        val s = sin(location.lat * PI / 180).coerceIn(-0.9999, 0.9999)
        val x = 0.5 + location.lon / 360
        val y = 0.5 - ln((1 + s) / (1 - s)) / (4 * PI)
        return Pair(quantize(x), quantize(y))
    }

    fun location(x: Double, y: Double): MapLocation =
        MapLocation(atan(sinh(PI * (1 - 2 * y))) * 180 / PI, (x - 0.5) * 360)

    fun metersPerUnit(atLatitude: Double): Double =
        cos(atLatitude * PI / 180) * 2 * PI * 6_378_137 / scale

    private fun quantize(fraction: Double): UInt {
        check(fraction.isFinite())
        return (fraction * scale).coerceIn(0.0, scale - 1).toLong().toUInt()
    }
}

data class QuantizedSite(var x: UInt, var y: UInt, var typeIndex: Int) {
    init {
        check(typeIndex in 0..0xffff)
    }

    private constructor(coordinates: Pair<UInt, UInt>, typeIndex: Int) :
        this(coordinates.first, coordinates.second, typeIndex)

    constructor(site: Site) : this(WorldCoord.project(site.location), site.typeIndex)

    val location: MapLocation
        get() = WorldCoord.location(x.toDouble() / WorldCoord.scale, y.toDouble() / WorldCoord.scale)
}

// Little-endian header: UInt8 flags, UInt8 shift, UInt32 count, UInt32 minX, minY.
// Each site is UInt16 dx, dy, type; its coordinate is min + (offset << shift).
data class MapTile(val isLeaf: Boolean, val sites: List<QuantizedSite>) {
    companion object {
        const val leafFlag = 1

        fun write(sites: List<QuantizedSite>, isLeaf: Boolean, writer: BinaryWriter) {
            var minX = UInt.MAX_VALUE
            var minY = UInt.MAX_VALUE
            var maxX = UInt.MIN_VALUE
            var maxY = UInt.MIN_VALUE
            for (site in sites) {
                minX = minOf(minX, site.x)
                maxX = maxOf(maxX, site.x)
                minY = minOf(minY, site.y)
                maxY = maxOf(maxY, site.y)
            }
            if (sites.isEmpty()) {
                minX = 0u
                minY = 0u
            }
            val span = maxOf(maxX - minX, maxY - minY).toLong()
            var shift = 0
            while ((span shr shift) > 0xffff) shift++
            val half = if (shift > 0) 1L shl (shift - 1) else 0L

            fun offset(value: UInt, origin: UInt): Int =
                minOf(((value - origin).toLong() + half) shr shift, 0xffffL).toInt()

            writer.writeUInt8(if (isLeaf) leafFlag else 0)
            writer.writeUInt8(shift)
            writer.writeUInt32(sites.size.toUInt())
            writer.writeUInt32(minX)
            writer.writeUInt32(minY)
            for (site in sites) {
                writer.writeUInt16(offset(site.x, minX))
                writer.writeUInt16(offset(site.y, minY))
                writer.writeUInt16(site.typeIndex)
            }
        }

        fun readBinary(data: ByteArray, typeCount: Int): MapTile {
            val reader = BinaryReader(data)
            val flags = reader.readUInt8()
            val shift = reader.readUInt8()
            val count = reader.readUInt32().toLong()
            check(flags <= 1 && shift <= 16 && data.size.toLong() == 14 + count * 6)
            val minX = reader.readUInt32().toLong()
            val minY = reader.readUInt32().toLong()
            val sites = List(count.toInt()) {
                val x = minOf(minX + (reader.readUInt16().toLong() shl shift), 0xffffffffL).toUInt()
                val y = minOf(minY + (reader.readUInt16().toLong() shl shift), 0xffffffffL).toUInt()
                val typeIndex = reader.readUInt16()
                check(typeIndex < typeCount)
                QuantizedSite(x, y, typeIndex)
            }
            check(reader.isAtEnd)
            return MapTile(flags and leafFlag != 0, sites)
        }
    }
}

data class TileManifestEntry(
    val key: TileKey,
    val isLeaf: Boolean,
    val siteCount: Int,
    val byteCount: Int
)

object TileManifest {
    fun write(entries: List<TileManifestEntry>, file: File) {
        val writer = BinaryWriter()
        writer.writeUInt32(entries.size.toUInt())
        for (entry in entries) {
            writer.writeUInt8(entry.key.z)
            writer.writeUInt32(entry.key.x.toUInt())
            writer.writeUInt32(entry.key.y.toUInt())
            writer.writeUInt8(if (entry.isLeaf) 1 else 0)
            writer.writeUInt32(entry.siteCount.toUInt())
            writer.writeUInt32(entry.byteCount.toUInt())
        }
        writer.write(file)
    }

    fun readBinary(data: ByteArray): List<TileManifestEntry> {
        val reader = BinaryReader(data)
        val count = reader.readUInt32().toLong()
        check(count in 1..1_000_000 && data.size.toLong() == 4 + count * 18)
        val entries = List(count.toInt()) {
            val z = reader.readUInt8()
            val x = reader.readUInt32().toLong()
            val y = reader.readUInt32().toLong()
            val flags = reader.readUInt8()
            val siteCount = reader.readUInt32().toLong()
            val byteCount = reader.readUInt32().toLong()
            check(z in 0..16 && x < (1L shl z) && y < (1L shl z))
            check(flags <= 1 && siteCount > 0 && byteCount == 14 + siteCount * 6)
            check(siteCount <= Int.MAX_VALUE && byteCount <= Int.MAX_VALUE)
            TileManifestEntry(
                TileKey(z, x.toInt(), y.toInt()), flags == 1,
                siteCount.toInt(), byteCount.toInt()
            )
        }
        check(reader.isAtEnd)
        val byKey = entries.associateBy { it.key }
        check(byKey.size == entries.size)
        check(TileKey(0, 0, 0) in byKey)
        for (entry in entries) {
            if (entry.key.z > 0) {
                val parent = byKey[entry.key.parent]
                check(parent != null && !parent.isLeaf)
            }
            if (!entry.isLeaf) {
                check(entry.key.z < 16)
                val childSites = (0..<4).sumOf { index ->
                    byKey[TileKey(
                        entry.key.z + 1, entry.key.x * 2 + index % 2,
                        entry.key.y * 2 + index / 2
                    )]?.siteCount?.toLong() ?: 0L
                }
                check(childSites > 0 && childSites >= entry.siteCount)
            }
        }
        return entries
    }
}
