package com.crickettechnology.citytrees

import java.io.ByteArrayOutputStream
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder

class BinaryWriter {
    private val output = ByteArrayOutputStream()
    private val buffer = ByteBuffer.allocate(8).order(ByteOrder.LITTLE_ENDIAN)

    val data: ByteArray
        get() { return output.toByteArray() }

    fun writeUInt8(value: Int) {
        check(value in 0..0xff)
        output.write(value)
    }

    fun writeUInt16(value: Int) {
        check(value in 0..0xffff)
        buffer.putShort(0, value.toShort())
        output.write(buffer.array(), 0, 2)
    }

    fun writeUInt32(value: UInt) {
        buffer.putInt(0, value.toInt())
        output.write(buffer.array(), 0, 4)
    }

    fun writeUInt64(value: ULong) {
        buffer.putLong(0, value.toLong())
        output.write(buffer.array(), 0, 8)
    }

    fun writeDouble(value: Double) {
        buffer.putDouble(0, value)
        output.write(buffer.array(), 0, 8)
    }

    // Raw UTF-8, without a length prefix.
    fun writeString(string: String): Int {
        val bytes = string.toByteArray(Charsets.UTF_8)
        output.write(bytes)
        return bytes.size
    }

    fun write(file: File) {
        file.writeBytes(data)
    }
}
