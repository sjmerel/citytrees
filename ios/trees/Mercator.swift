import Foundation

// Converts between latitude/longitude and Web Mercator coordinates x,y.
//   x and y are fractions of the world square, 0...1.
//   "quantized" units are scaled to fit in 0..2^32
enum Mercator {

    static let scale = 4294967296.0

    static func project(_ location: MapLocation) -> (x: Double, y: Double) {
        // Truncating to 0.9999 effectively limits latitude to 89.189.
        let s = min(max(sin(location.lat * .pi / 180), -0.9999), 0.9999)
        let x = 0.5 + location.lon / 360
        let y = 0.5 - log((1 + s) / (1 - s)) / (4 * .pi)
        return (x, y)
    }

    static func projectQuantized(_ location: MapLocation) -> (x: UInt32, y: UInt32) {
        let (x, y) = project(location)
        return (quantize(x), quantize(y))
    }

    static func unproject(x: Double, y: Double) -> MapLocation {
        let lon = (x - 0.5) * 360
        let lat = atan(sinh(.pi * (1 - 2 * y))) * 180 / .pi
        return MapLocation(lat: lat, lon: lon)
    }


    static func metersPerUnit(atLatitude lat: Double) -> Double {
        // Web Mercator uses the WGS 84 equatorial radius as its spherical Earth radius.
        cos(lat * .pi / 180) * 2 * .pi * 6_378_137 / scale
    }


    ////////////////////////////////////////

    private static func quantize(_ fraction: Double) -> UInt32 {
        UInt32(min(max(fraction * scale, 0), scale - 1))
    }
}


