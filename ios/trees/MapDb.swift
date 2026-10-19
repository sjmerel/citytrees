import Foundation

class MapDb {

    static let instance = MapDb()


    // Loads the first tile that completely contains rect into tileNode.
    func loadTile(rect: MapRect) -> Bool {
        print("db loadTile \(rect)")
        let prevName = self.tileName
        if let tile = tiles.first(where: { $0.rect.contains(rect) }) {
            print("found tile")
            if tile.name != tileName { 
                let url = Bundle.main.resourceURL!.appendingPathComponent(tile.name)
                self.tileNode = try! MapNode.readBinary(url: url)
                self.tileName = tile.name
            }
        }
        else {
            print("no tile")
            self.tileNode = nil
            self.tileName = nil
        }
        return prevName != self.tileName
    }

    func find(rect: MapRect) -> [Site] {
        let node = self.tileNode ?? self.topNode
        return node.find(rect: rect)
    }

    func findNearest(location: MapLocation, maxDistance: Double) -> Site? {
        let node = self.tileNode ?? self.topNode
        return node.findNearest(location: location, maxDistance: maxDistance)
    }

    // for debugging
    var tileRects: [MapRect] { return tiles.map { $0.rect } }

    ////////////////////////////////////////

    struct TileInfo {
        let name: String
        let rect: MapRect
    }

    private let topNode: MapNode
    private let tiles: [TileInfo]
    private var tileNode: MapNode? = nil
    private var tileName: String? = nil

    private init() {
        let topUrl = Bundle.main.url(forResource: "sites_top", withExtension: "bin")!
        self.topNode = try! MapNode.readBinary(url: topUrl)

        let urls = Bundle.main.urls(forResourcesWithExtension: "bin", subdirectory: nil) ?? []
        self.tiles = urls
            .filter { $0.lastPathComponent.hasPrefix("sites_tile_") }
            .sorted { $0.lastPathComponent < $1.lastPathComponent }
            .map { url in
                let rect = try! MapNode.readBinaryRect(url: url)
                print("\(url.lastPathComponent): \(rect)")
                return TileInfo(name: url.lastPathComponent, rect: rect)
            }
    }
}
