import Foundation


// Tiles follow the Google Maps / Web Mercator scheme: tile (z, x, y) is the quadtree node
// at depth z, covering the world square cell x, y of a 2^z by 2^z grid.

struct TileKey: Hashable, Comparable, CustomStringConvertible {

    var description: String { "\(z)/\(x)/\(y)" }

    let z: Int
    let x: Int
    let y: Int

    static func < (a: TileKey, b: TileKey) -> Bool {
        (a.z, a.x, a.y) < (b.z, b.x, b.y)
    }

    var path: String { "\(z)/\(x)/\(y).bin" }

    var parent: TileKey { TileKey(z: z - 1, x: x >> 1, y: y >> 1) }


    static let root = TileKey(z: 0, x: 0, y: 0)
}


