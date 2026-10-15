struct MapLocation {

    var lat: Double // latitude
    var lon: Double // longitude

    static func load(reader: BinaryReader) -> MapLocation {
        let lat = reader.readDouble()
        let lon = reader.readDouble()
        return MapLocation(lat: lat, lon: lon)
    }
}
