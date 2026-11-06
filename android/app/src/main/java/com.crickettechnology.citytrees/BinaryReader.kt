package com.crickettechnology.citytrees

import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.charset.CodingErrorAction

// UInt8/UInt16 use nonnegative Ints for indexing; UInt32/UInt64 retain their full unsigned range.
class BinaryReader(file: File) {
    private val buffer = ByteBuffer.wrap(file.readBytes()).order(ByteOrder.LITTLE_ENDIAN)

    val isAtEnd: Boolean
        get() { return !buffer.hasRemaining() }

    fun readUInt8(): Int { return buffer.get().toInt() and 0xff }
    fun readUInt16(): Int { return buffer.short.toInt() and 0xffff }
    fun readUInt32(): UInt { return buffer.int.toUInt() }
    fun readUInt64(): ULong { return buffer.long.toULong() }
    fun readDouble(): Double { return buffer.double }

    fun readString(count: Int): String {
        check(count >= 0 && count <= buffer.remaining())
        val bytes = buffer.slice()
        bytes.limit(count)
        val string = Charsets.UTF_8.newDecoder()
            .onMalformedInput(CodingErrorAction.REPORT)
            .onUnmappableCharacter(CodingErrorAction.REPORT)
            .decode(bytes).toString()
        buffer.position(buffer.position() + count)
        return string
    }
}
