package com.crickettechnology.trees

import java.io.File

data class TreeType(
    val canonicalName: String,
    var commonNames: List<String> = emptyList(),
    var wikipediaUrl: String? = null,
    var colorIndex: Int = 0
) {
    private fun writeBinary(writer: BinaryWriter) {
        writer.writeUInt16(canonicalName.toByteArray(Charsets.UTF_8).size)
        writer.writeString(canonicalName)
        writer.writeUInt8(colorIndex)

        val names = commonNames.take(0xff)
        writer.writeUInt8(names.size)
        for (name in names) {
            writer.writeUInt16(name.toByteArray(Charsets.UTF_8).size)
            writer.writeString(name)
        }

        val url = wikipediaUrl.orEmpty()
        writer.writeUInt16(url.toByteArray(Charsets.UTF_8).size)
        writer.writeString(url)
    }

    companion object {
        const val colorCount = 25

        fun readBinary(data: ByteArray): List<TreeType> {
            val reader = BinaryReader(data)
            val count = reader.readUInt32()
            check(count in 1u..65536u)
            val types = List(count.toInt()) {
                val name = reader.readString(reader.readUInt16())
                val colorIndex = reader.readUInt8()
                check(colorIndex < colorCount)
                val commonNames = List(reader.readUInt8()) {
                    reader.readString(reader.readUInt16())
                }
                val urlLength = reader.readUInt16()
                val wikipediaUrl = if (urlLength > 0) reader.readString(urlLength) else null
                TreeType(name, commonNames, wikipediaUrl, colorIndex)
            }
            check(reader.isAtEnd)
            return types
        }

        fun writeBinary(types: List<TreeType>, file: File) {
            val writer = BinaryWriter()
            writer.writeUInt32(types.size.toUInt())
            for (type in types) {
                type.writeBinary(writer)
            }
            writer.write(file)
        }
    }
}
