extension TreeType: Decodable {

    private enum CodingKeys: String, CodingKey {
        case canonicalName = "canonical_name"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        self.init(canonicalName: try c.decode(String.self, forKey: .canonicalName), colorIndex: 0)
    }
}


