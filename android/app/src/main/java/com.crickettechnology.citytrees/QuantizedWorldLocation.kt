package com.crickettechnology.citytrees

// projected coordinates, scaled and quantized to fit UInt32
//  (0, 0) is northwest corner
//  (2^32, 2^32) is southeast corner
data class QuantizedWorldLocation(var x: UInt, var y: UInt) {

    ////////////////////////////////////////

    companion object {

        fun quantize(location: WorldLocation): QuantizedWorldLocation {
            val x = quantize(location.x)
            val y = quantize(location.y)
            return QuantizedWorldLocation(x, y)
        }

        fun unquantize(location: QuantizedWorldLocation): WorldLocation {
            val x = unquantize(location.x)
            val y = unquantize(location.y)
            return WorldLocation(x, y)
        }

        ////////////////////////////////////////

        const val scale = 4294967296.0

        fun quantize(fraction: Double): UInt {
            return (fraction * scale).coerceIn(0.0, scale - 1).toLong().toUInt()
        }

        fun unquantize(value: UInt): Double {
            return value.toDouble() / scale
        }
    }
}
