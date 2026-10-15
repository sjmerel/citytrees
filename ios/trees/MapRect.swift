struct MapRect {

    init(northWest: MapLocation, southEast: MapLocation) {
        assert(northWest.lat >= southEast.lat)
        assert(northWest.lon <= southEast.lon)
        self.northWest = northWest
        self.southEast = southEast
    }

    init(north: Double, west: Double, south: Double, east: Double) {
        self.init(northWest: MapLocation(lat: north, lon: west),
                  southEast: MapLocation(lat: south, lon: east))
    }

    var northWest: MapLocation
    var southEast: MapLocation

    var west: Double { return self.northWest.lon }
    var east: Double { return self.southEast.lon }
    var minLon: Double { return self.west }
    var midLon: Double { return (self.west + self.east)/2 }
    var maxLon: Double { return self.east }

    var north: Double { return self.northWest.lat }
    var south: Double { return self.southEast.lat }
    var minLat: Double { return self.south }
    var midLat: Double { return (self.north + self.south)/2 }
    var maxLat: Double { return self.north }

    func contains(_ location: MapLocation) -> Bool {
        return location.lat >= self.minLat && location.lat < self.maxLat &&
               location.lon >= self.minLon && location.lon < self.maxLon
    }

    func intersects(_ rect: MapRect) -> Bool {
        return !(self.maxLat <= rect.minLat ||
                 self.minLat >= rect.maxLat ||
                 self.maxLon <= rect.minLon ||
                 self.minLon >= rect.maxLon)
    }


    static func load(reader: BinaryReader) -> MapRect {
        let northWest = MapLocation.load(reader: reader)
        let bottomRight = MapLocation.load(reader: reader)
        return MapRect(northWest: northWest, southEast: bottomRight)
    }
}
