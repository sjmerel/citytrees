package com.crickettechnology.trees

import kotlin.math.PI
import kotlin.math.atan
import kotlin.math.cos
import kotlin.math.ln
import kotlin.math.sin
import kotlin.math.sinh

// Converts between map and world coordinates
//   x and y are fractions of the world square, 0...1.
//   "quantized" units are scaled to fit in 0..2^32
object Mercator {

    fun project(location: MapLocation): WorldLocation {
        // Truncating to 0.9999 effectively limits latitude to 89.189.
        val s = sin(location.lat * PI / 180).coerceIn(-0.9999, 0.9999)
        val x = 0.5 + location.lon / 360
        val y = 0.5 - ln((1 + s) / (1 - s)) / (4 * PI)
        return WorldLocation(x, y)
    }

    fun projectQuantized(location: MapLocation): QuantizedWorldLocation =
        QuantizedWorldLocation.quantize(project(location))

    fun unproject(location: WorldLocation): MapLocation {
        val lon = (location.x - 0.5) * 360
        val lat = atan(sinh(PI * (1 - 2 * location.y))) * 180 / PI
        return MapLocation(lat, lon)
    }

    fun unprojectQuantized(location: QuantizedWorldLocation): MapLocation =
        unproject(QuantizedWorldLocation.unquantize(location))

    fun metersPerUnit(atLatitude: Double): Double =
        cos(atLatitude * PI / 180) * (2.0 * PI * radius)

    const val radius = 6378137.0  // WGS 84 equatorial radius in meters
}
