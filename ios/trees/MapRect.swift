struct MapRect {

    var topLeft: MapLocation
    var bottomRight: MapLocation

    var minX: Double { return self.topLeft.x }
    var midX: Double { return (self.minX + self.maxX)/2 }
    var maxX: Double { return self.bottomRight.x }

    var minY: Double { return self.topLeft.y }
    var midY: Double { return (self.minY + self.maxY)/2 }
    var maxY: Double { return self.bottomRight.y }

    func contains(_ location: MapLocation) -> Bool {
        return location.x >= self.minX && location.x < self.maxX &&
               location.y >= self.minY && location.y < self.maxY
    }

    func intersects(_ rect: MapRect) -> Bool {
        return !(self.maxY <= rect.minY ||
                 self.minY >= rect.maxY ||
                 self.maxX <= rect.minX ||
                 self.minX >= rect.maxX)
    }


    static func load(reader: BinaryReader) -> MapRect {
        let topLeft = MapLocation.load(reader: reader)
        let bottomRight = MapLocation.load(reader: reader)
        return MapRect(topLeft: topLeft, bottomRight: bottomRight)
    }
}
