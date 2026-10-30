extension Site: Decodable {

    private enum CodingKeys: String, CodingKey {
        case lat, lon, type
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let mapLocation = MapLocation(lat: try c.decode(Double.self, forKey: .lat),
                                      lon: try c.decode(Double.self, forKey: .lon))
        let worldLocation = Mercator.projectQuantized(mapLocation)
        let typeIndex = try c.decode(Int.self, forKey: .type)
        self.init(location: worldLocation, typeIndex: UInt16(typeIndex))
    }
}

