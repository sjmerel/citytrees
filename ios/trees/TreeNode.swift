class TreeNode {
    
    init(rect: MapRect) {
        self.rect = rect
    }

    func findNearest(location: MapLocation) -> TreeSite? {
        return nil // TODO
    }

    func find(rect: MapRect) -> [TreeSite] {
        var result = [TreeSite]()
        find(rect: rect, result: &result)
        return result
    }

    func add(site: TreeSite) {
        assert(self.rect.contains(site.location))
        if self.sites != nil {
            self.sites!.append(site)
            if (self.sites!.count > maxSites) {
                // build subtree
                self.nodes = [
                    TreeNode(rect: MapRect(topLeft: self.rect.topLeft, bottomRight: MapLocation(x: self.rect.midX, y: self.rect.midY))),
                    TreeNode(rect: MapRect(topLeft: MapLocation(x: self.rect.midX, y: self.rect.minY), bottomRight: MapLocation(x: self.rect.maxX, y: self.rect.midY))),
                    TreeNode(rect: MapRect(topLeft: MapLocation(x: self.rect.minX, y: self.rect.midY), bottomRight: MapLocation(x: self.rect.midX, y: self.rect.maxY))),
                    TreeNode(rect: MapRect(topLeft: MapLocation(x: self.rect.midX, y: self.rect.midY), bottomRight: self.rect.bottomRight))
                ]
                for site in self.sites! {
                    addToNodes(site: site)
                }
                self.sites = nil
            }
        }
        else {
            addToNodes(site: site)
        }
    }

    private func addToNodes(site: TreeSite) {
        if (site.location.x < self.rect.midX) {
            if (site.location.y < self.rect.midY) {
                self.nodes![topLeft].add(site: site)
            }
            else {
                self.nodes![bottomLeft].add(site: site)
            }
        }
        else {
            if (site.location.y < self.rect.midY) {
                self.nodes![topRight].add(site: site)
            }
            else {
                self.nodes![bottomRight].add(site: site)
            }
        }
    }

    let rect: MapRect

    static let all = load() // XXX
    var first: TreeSite? {
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
        rect.bottomRight.x += rect.bottomRight.x.ulp
        rect.bottomRight.y += rect.bottomRight.y.ulp

        let node = TreeNode(rect: rect)

        for _ in 0..<count {
            let site = TreeSite.load(reader: reader)
            node.add(site: site)
        }

        precondition(reader.isAtEnd)
        profiler.stop()
        //node.printNode()
        return node
    }

    func printNode(depth: Int = 0) {
        var s = ""
        for i in 0..<depth { s += "  " }
        
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

    private var sites: [TreeSite]? = [TreeSite]()
    private var nodes: [TreeNode]? = nil 

    private let maxSites = 10
    
    private let topLeft = 0
    private let topRight = 1
    private let bottomLeft = 2
    private let bottomRight = 3


    private func find(rect: MapRect, result: inout [TreeSite]) {
        if !rect.intersects(self.rect) { return }

        if let sites = self.sites {
            result.append(contentsOf: sites.filter { self.rect.contains($0.location) })
        }
        else {
            for node in self.nodes! {
                node.find(rect: rect, result: &result)
            }
        }
    }

}
