import Foundation

// Converts between map and world coordinates
//   x and y are fractions of the world square, 0...1.
//   "quantized" units are scaled to fit in 0..2^32
enum Mercator {

    static func project(_ location: MapLocation) -> WorldLocation {
        // Truncating to 0.9999 effectively limits latitude to 89.189.
        let s = min(max(sin(location.lat * .pi / 180), -0.9999), 0.9999)
        let x = 0.5 + location.lon / 360
        let y = 0.5 - log((1 + s) / (1 - s)) / (4 * .pi)
        return WorldLocation(x: x, y: y)
    }

    static func projectQuantized(_ location: MapLocation) -> QuantizedWorldLocation {
        let loc = project(location)
        return QuantizedWorldLocation.quantize(loc);
    }

    static func unproject(_ location: WorldLocation) -> MapLocation {
        let lon = (location.x - 0.5) * 360
        let lat = atan(sinh(.pi * (1 - 2 * location.y))) * 180 / .pi
        return MapLocation(lat: lat, lon: lon)
    }

    static func unprojectQuantized(_ location: QuantizedWorldLocation) -> MapLocation {
        let loc = QuantizedWorldLocation.unquantize(location)
        return unproject(loc)
    }


    static func metersPerUnit(atLatitude lat: Double) -> Double {
        cos(lat * .pi / 180) * (2.0 * .pi * Self.radius)
    }

    static let radius = 6378137.0  // WGS 84 equatorial radius in meters

}

