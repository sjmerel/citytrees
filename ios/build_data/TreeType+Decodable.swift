extension TreeType: Decodable {

    private enum CodingKeys: String, CodingKey {
        case canonicalName = "canonical_name"
        case commonNames = "common_names"
        case wikipediaUrl = "wikipedia_url"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        self.init(canonicalName: try c.decode(String.self, forKey: .canonicalName),
                  commonNames: try c.decodeIfPresent([String].self, forKey: .commonNames) ?? [],
                  wikipediaUrl: try c.decodeIfPresent(String.self, forKey: .wikipediaUrl),
                  colorIndex: 0)
    }
}


