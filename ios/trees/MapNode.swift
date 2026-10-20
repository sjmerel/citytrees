import Foundation

class MapNode {
    
    init(sites: [Site], rect: MapRect) {
        self.rect = rect
        add(sites: sites)
    }

    // Nearest site to location within maxDistance meters, if any.
    func findNearest(location: MapLocation, maxDistance: Double) -> Site? {
        var best: Site?
        var bestDistance = maxDistance
        findNearest(location: location, best: &best, bestDistance: &bestDistance)
        return best
    }

    func find(rect: MapRect) -> [Site] {
        var result = [Site]()
        find(rect: rect, result: &result)
        return result
    }

    let rect: MapRect


    /*
    // Breadth-first: prints the site counts of all nodes at each level, one level per line.
    func printNode() {
        var level = [self]
        var depth = 0
        while !level.isEmpty {
            let counts = level.map { $0.siteCount() }.filter { $0 > 0 }
            print("level \(depth): " + counts.map { String($0) }.joined(separator: " "))
            level = level.flatMap { $0.nodes ?? [] }
            depth += 1
        }
    }
    */

    func siteCount() -> Int {
        if let sites = self.sites { return sites.count }
        return self.nodes!.reduce(0) { $0 + $1.siteCount() }
    }

    func maxDepth() -> Int {
        guard let nodes = self.nodes else { return 0 }
        return 1 + nodes.map { $0.maxDepth() }.max()!
    }

    static func readBinaryRect(url: URL) throws -> MapRect {
        let reader = BinaryReader(url: url)
        return MapRect.readBinary(reader: reader)
    }

    static func readBinary(url: URL) throws -> MapNode {
        let reader = BinaryReader(url: url)

        let rect = MapRect.readBinary(reader: reader)
        let count = reader.readUInt32()

        var sites: [Site] = []
        sites.reserveCapacity(Int(count))

        for _ in 0..<count {
            sites.append(Site.readBinary(reader: reader))
        }
        assert(reader.isAtEnd)

        return MapNode(sites: sites, rect: rect)
    }

    ////////////////////////////////////////

    private var sites: [Site]? = nil
    private var nodes: [MapNode]? = nil 

    private let MAX_SITES = 32
    
    private let northWest = 0
    private let northEast = 1
    private let southWest = 2
    private let southEast = 3



    private static let metersPerDegree = 111_320.0

    // Approximate (equirectangular) distance in meters; accurate enough at tap scale.
    private static func distance(from a: MapLocation, to b: MapLocation) -> Double {
        let dy = (b.lat - a.lat) * metersPerDegree
        let dx = (b.lon - a.lon) * metersPerDegree * cos(a.lat * .pi / 180)
        return (dx * dx + dy * dy).squareRoot()
    }

    private func findNearest(location: MapLocation, best: inout Site?, bestDistance: inout Double) {
        // distance to the closest point of this node's rect; skip if it can't beat the best
        let closest = MapLocation(lat: min(max(location.lat, rect.minLat), rect.maxLat),
                                  lon: min(max(location.lon, rect.minLon), rect.maxLon))
        if MapNode.distance(from: location, to: closest) > bestDistance { return }

        if let sites = self.sites {
            for site in sites {
                let d = MapNode.distance(from: location, to: site.location)
                if d <= bestDistance {
                    bestDistance = d
                    best = site
                }
            }
        }
        else {
            for node in self.nodes! {
                node.findNearest(location: location, best: &best, bestDistance: &bestDistance)
            }
        }
    }

    private func find(rect: MapRect, result: inout [Site]) {
        if !rect.intersects(self.rect) { return }

        if let sites = self.sites {
            result.append(contentsOf: sites.filter { rect.contains($0.location) })
        }
        else {
            for node in self.nodes! {
                node.find(rect: rect, result: &result)
            }
        }
    }

    private func add(sites: [Site]) {
        if (sites.count <= self.MAX_SITES) {
            self.sites = sites
        }
        else {
            var nodeSites = [
                [Site](), 
                [Site](), 
                [Site](), 
                [Site](), 
            ]
            for site in sites {
                let east = site.location.lon >= self.rect.midLon
                let north = site.location.lat >= self.rect.midLat
                let index: Int
                if north {
                    index = east ? self.northEast : self.northWest
                } else {
                    index = east ? self.southEast : self.southWest
                }
                nodeSites[index].append(site)
            }
            self.nodes = [
                MapNode(sites: nodeSites[0], rect: MapRect(north: self.rect.north, west: self.rect.west, south: self.rect.midLat, east: self.rect.midLon)),
                MapNode(sites: nodeSites[1], rect: MapRect(north: self.rect.north, west: self.rect.midLon, south: self.rect.midLat, east: self.rect.east)),
                MapNode(sites: nodeSites[2], rect: MapRect(north: self.rect.midLat, west: self.rect.west, south: self.rect.south, east: self.rect.midLon)),
                MapNode(sites: nodeSites[3], rect: MapRect(north: self.rect.midLat, west: self.rect.midLon, south: self.rect.south, east: self.rect.east)),
            ]
        }
    }

}
