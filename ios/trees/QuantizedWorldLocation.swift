// projected coordinates, scaled and quantized to fit UInt32
//  (0, 0) is northwest corner
//  (2^32, 2^32) is southeast corner

struct QuantizedWorldLocation {

    var x: UInt32 
    var y: UInt32 

    ////////////////////////////////////////

    static func quantize(_ location: WorldLocation) -> QuantizedWorldLocation {
        let x = quantize(location.x)
        let y = quantize(location.y)
        return QuantizedWorldLocation(x: x, y: y)
    }

    static func unquantize(_ location: QuantizedWorldLocation) -> WorldLocation {
        let x = unquantize(location.x)
        let y = unquantize(location.y)
        return WorldLocation(x: x, y: y)
    }

    ////////////////////////////////////////

    static let scale = 4294967296.0

    static func quantize(_ fraction: Double) -> UInt32 {
        return UInt32(min(max(fraction * scale, 0), scale - 1))
    }

    static func unquantize(_ value: UInt32) -> Double {
        return Double(value) / scale
    }
}

