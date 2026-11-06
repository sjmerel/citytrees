package com.crickettechnology.citytrees

import java.io.File

data class TreeType(
    val canonicalName: String,
    var commonNames: List<String> = emptyList(),
    var wikipediaUrl: String? = null,

    // assigned by genus when loaded
    var colorIndex: Int = 0
) {

    companion object {

        lateinit var all: List<TreeType>
            private set

        fun load(file: File) {
            all = readBinary(file)
            assignColors()
        }


        ////////////////////////////////////////

        fun readBinary(file: File): List<TreeType> {
            val profiler = Profiler("read $file")
            val reader = BinaryReader(file)

            val count = reader.readUInt32().toInt()
            val types = ArrayList<TreeType>(count)

            val wikipediaBase = "https://en.wikipedia.org/wiki/"

            for (i in 0 until count) {
                val nameLength = reader.readUInt16()
                val name = reader.readString(nameLength)
                val commonCount = reader.readUInt8()
                val commonNames = ArrayList<String>()
                for (j in 0 until commonCount) {
                    val length = reader.readUInt16()
                    commonNames.add(reader.readString(length))
                }
                val urlLength = reader.readUInt16()
                val wikipediaUrl = if (urlLength > 0) wikipediaBase + reader.readString(urlLength) else null
                types.add(TreeType(name, commonNames, wikipediaUrl))
            }

            check(reader.isAtEnd)
            profiler.stop()

            return types
        }

        fun writeBinary(types: List<TreeType>, file: File) {
            //val profiler = Profiler("write $file")
            val writer = BinaryWriter()

            writer.writeUInt32(types.size.toUInt())
            for (type in types) {
                type.writeBinary(writer)
            }
            writer.write(file)
        }


        ////////////////////////////////////////

        private fun assignColors() {
            // assign colors based on genus
            val genusMap = HashMap<String, Int>()
            for (type in all) {
                val genus = type.canonicalName.split(" ").first()
                var colorIndex = genusMap[genus]
                if (colorIndex == null) {
                    colorIndex = genusMap.size
                    genusMap[genus] = colorIndex
                }
                type.colorIndex = colorIndex
            }
        }
    }


    ////////////////////////////////////////

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
        if (url.isNotEmpty()) writer.writeString(url)
    }

}
