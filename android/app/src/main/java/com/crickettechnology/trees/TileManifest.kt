package com.crickettechnology.trees

import java.io.File

data class TileManifestEntry(
    val key: TileKey,
    val isLeaf: Boolean,
    val siteCount: Int,
    val byteCount: Int
)

// Lists every tile, so a client can tell which tiles exist.
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

    fun readBinary(file: File): List<TileManifestEntry> {
        val reader = BinaryReader(file)
        val count = reader.readUInt32().toInt()
        val entries = ArrayList<TileManifestEntry>(count)
        for (i in 0 until count) {
            val z = reader.readUInt8()
            val x = reader.readUInt32().toInt()
            val y = reader.readUInt32().toInt()
            val isLeaf = reader.readUInt8() != 0
            val siteCount = reader.readUInt32().toInt()
            val byteCount = reader.readUInt32().toInt()
            entries.add(TileManifestEntry(TileKey(z, x, y), isLeaf, siteCount, byteCount))
        }
        check(reader.isAtEnd)
        return entries
    }
}
