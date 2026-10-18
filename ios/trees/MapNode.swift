import Foundation

class MapNode {
    
    init(rect: MapRect, sites: [Site]) {
        assert(rect.maxLat > rect.minLat)
        assert(rect.maxLon > rect.minLon)
        self.rect = rect
        add(sites: sites)
    }

    func findNearest(location: MapLocation) -> Site? {
        return nil // TODO
    }

    func find(rect: MapRect) -> [Site] {
        var result = [Site]()
        find(rect: rect, result: &result)
        return result
    }

    let rect: MapRect

    static let all = load() // XXX
    static func load() -> MapNode {
        let profiler = Profiler(name: "read sites.bin")
        let url = Bundle.main.url(forResource: "sites", withExtension: "bin")!
        let reader = BinaryReader(url: url)

        let count = reader.readUInt32()

        // stored rect is min/max; nudge max so all sites are contained
        var rect = MapRect.readBinary(reader: reader)
        rect.northWest.lat += rect.northWest.lat.ulp
        rect.southEast.lon += rect.southEast.lon.ulp

        profiler.mark(label: "read start")
        var sites: [Site] = []
        sites.reserveCapacity(Int(count))

        for _ in 0..<count {
            sites.append(Site.readBinary(reader: reader))
        }
        assert(reader.isAtEnd)
        profiler.mark(label: "read \(count) sites")

        let node = MapNode(rect: rect, sites: sites)
        profiler.mark(label: "build tree")

        profiler.stop()

        //node.printNode()
        print("depth: \(node.maxDepth())")

        return node
    }

    func printNode(depth: Int = 0) {
        var s = ""
        for _ in 0..<depth { s += "  " }
        
        if let sites = self.sites {
            print("\(s)\(sites.count)")
            assert(self.nodes == nil)
        }
        else {
            print("\(s)-")
            assert(self.sites == nil)
            assert(self.nodes!.count == 4)
            for node in self.nodes! {
                node.printNode(depth: depth+1)
            }
        }
    }

    ////////////////////////////////////////

    private var sites: [Site]? = nil
    private var nodes: [MapNode]? = nil 

    private let maxSites = 32
    
    private let northWest = 0
    private let northEast = 1
    private let southWest = 2
    private let southEast = 3

    private func maxDepth() -> Int {
        guard let nodes = self.nodes else { return 0 }
        return 1 + nodes.map { $0.maxDepth() }.max()!
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
        if (sites.count <= self.maxSites) {
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
                MapNode(rect: MapRect(north: self.rect.north, west: self.rect.west, south: self.rect.midLat, east: self.rect.midLon), sites: nodeSites[0]),
                MapNode(rect: MapRect(north: self.rect.north, west: self.rect.midLon, south: self.rect.midLat, east: self.rect.east), sites: nodeSites[1]),
                MapNode(rect: MapRect(north: self.rect.midLat, west: self.rect.west, south: self.rect.south, east: self.rect.midLon), sites: nodeSites[2]),
                MapNode(rect: MapRect(north: self.rect.midLat, west: self.rect.midLon, south: self.rect.south, east: self.rect.east), sites: nodeSites[3]),
            ]
        }
    }

}
