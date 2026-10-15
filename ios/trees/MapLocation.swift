struct MapLocation {

    init(x: Double, y: Double) { 
        self.x = x
        self.y = y
    }

    var x: Double // longitude
    var y: Double // latitude


    // aliases

    init(longitude: Double, latitude: Double) { 
        self.init(x: longitude, y: latitude)
    }

    var longitude: Double { 
        get { return self.x }
        set { self.x = newValue }
    }

    var latitude: Double { 
        get { return self.y }
        set { self.y = newValue }
    }


    static func load(reader: BinaryReader) -> MapLocation {
        let latitude = reader.readDouble()
        let longitude = reader.readDouble()
        return MapLocation(longitude: longitude, latitude: latitude)
    }
}
