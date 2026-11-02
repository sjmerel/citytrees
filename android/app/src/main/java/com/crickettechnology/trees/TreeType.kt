package com.crickettechnology.trees

import java.io.File

data class TreeType(
    val canonicalName: String,
    var commonNames: List<String> = emptyList(),
    var wikipediaUrl: String? = null,

    // assigned by genus when loaded
    var colorIndex: Int = 0
) {
    private fun writeBinary(writer: BinaryWriter) {
        writer.writeUInt16(canonicalName.toByteArray(Charsets.UTF_8).size)
        writer.writeString(canonicalName)

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
        lateinit var all: List<TreeType>
            private set

        fun load(file: File) {
            all = readBinary(file)
            assignColors()
        }

        fun readBinary(file: File): List<TreeType> {
            val reader = BinaryReader(file)

            val count = reader.readUInt32().toInt()
            val wikipediaBase = "https://en.wikipedia.org/wiki/"

            val types = List(count) {
                val name = reader.readString(reader.readUInt16())
                val commonNames = List(reader.readUInt8()) {
                    reader.readString(reader.readUInt16())
                }
                val urlLength = reader.readUInt16()
                val wikipediaUrl = if (urlLength > 0) wikipediaBase + reader.readString(urlLength) else null
                TreeType(name, commonNames, wikipediaUrl)
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

        private fun assignColors() {
            // assign colors based on genus
            val genusMap = mutableMapOf<String, Int>()
            for (type in all) {
                val genus = type.canonicalName.split(" ").first()
                type.colorIndex = genusMap.getOrPut(genus) { genusMap.size }
            }
        }
    }
}
