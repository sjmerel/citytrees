package com.crickettechnology.trees

// projected coordinates, scaled and quantized to fit UInt32
//  (0, 0) is northwest corner
//  (2^32, 2^32) is southeast corner
data class QuantizedWorldLocation(var x: UInt, var y: UInt) {

    companion object {
        fun quantize(location: WorldLocation): QuantizedWorldLocation =
            QuantizedWorldLocation(quantize(location.x), quantize(location.y))

        fun unquantize(location: QuantizedWorldLocation): WorldLocation =
            WorldLocation(unquantize(location.x), unquantize(location.y))

        const val scale = 4294967296.0

        fun quantize(fraction: Double): UInt =
            (fraction * scale).coerceIn(0.0, scale - 1).toLong().toUInt()

        fun unquantize(value: UInt): Double = value.toDouble() / scale
    }
}
