extension TreeSite: Decodable {

    private enum CodingKeys: String, CodingKey {
        case lat, lon, type
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let location = MapLocation(lat: try c.decode(Double.self, forKey: .lat),
                                   lon: try c.decode(Double.self, forKey: .lon))
        self.init(location: location, typeIndex: try c.decode(Int.self, forKey: .type))
    }
}

