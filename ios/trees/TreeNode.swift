class TreeNode {
    
    init(rect: MapRect, sites: [TreeSite]) {
        self.rect = rect
        add(sites: sites)
    }

    func findNearest(location: MapLocation) -> TreeSite? {
        return nil // TODO
    }

    func find(rect: MapRect) -> [TreeSite] {
        var result = [TreeSite]()
        find(rect: rect, result: &result)
        return result
    }

    let rect: MapRect

    static let all = load() // XXX

    var first: TreeSite? { // XXX
        if let site = self.sites?.first { return site }
        if let nodes = self.nodes {
            for node in nodes {
                if let site = node.first { return site }
            }
        }
        return nil
    }

    static func load() -> TreeNode {
        let profiler = Profiler(name: "read sites.bin")

        let reader = BinaryReader(fileName: "sites.bin")

        let count = reader.readUInt32()

        // stored rect is min/max; nudge max so all sites are contained
        var rect = MapRect.load(reader: reader)
        rect.northWest.lat += rect.northWest.lat.ulp
        rect.southEast.lon += rect.southEast.lon.ulp

        profiler.mark(label: "read start")
        var sites: [TreeSite] = []
        sites.reserveCapacity(Int(count))

        for _ in 0..<count {
            sites.append(TreeSite.load(reader: reader))
        }
        assert(reader.isAtEnd)
        profiler.mark(label: "read \(count) sites")

        let node = TreeNode(rect: rect, sites: sites)
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

    private var sites: [TreeSite]? = nil
    private var nodes: [TreeNode]? = nil 

    private let maxSites = 32
    
    private let northWest = 0
    private let northEast = 1
    private let southWest = 2
    private let southEast = 3

    private func maxDepth() -> Int {
        guard let nodes = self.nodes else { return 0 }
        return 1 + nodes.map { $0.maxDepth() }.max()!
    }


    private func find(rect: MapRect, result: inout [TreeSite]) {
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

    private func add(sites: [TreeSite]) {
        if (sites.count <= self.maxSites) {
            self.sites = sites
        }
        else {
            var nodeSites = [
                [TreeSite](), 
                [TreeSite](), 
                [TreeSite](), 
                [TreeSite](), 
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
                TreeNode(rect: MapRect(north: self.rect.north, west: self.rect.west, south: self.rect.midLat, east: self.rect.midLon), sites: nodeSites[0]),
                TreeNode(rect: MapRect(north: self.rect.north, west: self.rect.midLon, south: self.rect.midLat, east: self.rect.east), sites: nodeSites[1]),
                TreeNode(rect: MapRect(north: self.rect.midLat, west: self.rect.west, south: self.rect.south, east: self.rect.midLon), sites: nodeSites[2]),
                TreeNode(rect: MapRect(north: self.rect.midLat, west: self.rect.midLon, south: self.rect.south, east: self.rect.east), sites: nodeSites[3]),
            ]
        }
    }

}
