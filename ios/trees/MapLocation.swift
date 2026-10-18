struct MapLocation: Equatable {

    var lat: Double // latitude
    var lon: Double // longitude

    static func readBinary(reader: BinaryReader) -> MapLocation {
        let lat = reader.readDouble()
        let lon = reader.readDouble()
        return MapLocation(lat: lat, lon: lon)
    }

    func writeBinary(writer: BinaryWriter) {
        writer.writeDouble(lat)
        writer.writeDouble(lon)
    }
}
