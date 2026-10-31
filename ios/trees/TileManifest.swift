import Foundation

struct TileManifestEntry {
    let key: TileKey
    let isLeaf: Bool
    let siteCount: Int
    let byteCount: Int
    let hash: UInt64
}

// Lists every tile, so a client can tell which tiles exist, and whether a cached copy is current.
enum TileManifest {

    static func write(entries: [TileManifestEntry], to url: URL) throws {
        let writer = BinaryWriter()
        writer.writeUInt32(UInt32(entries.count))
        for entry in entries {
            writer.writeUInt8(UInt8(entry.key.z))
            writer.writeUInt32(UInt32(entry.key.x))
            writer.writeUInt32(UInt32(entry.key.y))
            writer.writeUInt8(entry.isLeaf ? 1 : 0)
            writer.writeUInt32(UInt32(entry.siteCount))
            writer.writeUInt32(UInt32(entry.byteCount))
            writer.writeUInt64(entry.hash)
        }
        try writer.write(to: url)
    }

    static func readBinary(url: URL) -> [TileManifestEntry] {
        let reader = BinaryReader(url: url)
        let count = Int(reader.readUInt32())
        var entries: [TileManifestEntry] = []
        entries.reserveCapacity(count)
        for _ in 0..<count {
            let z = Int(reader.readUInt8())
            let x = Int(reader.readUInt32())
            let y = Int(reader.readUInt32())
            let isLeaf = reader.readUInt8() != 0
            let siteCount = Int(reader.readUInt32())
            let byteCount = Int(reader.readUInt32())
            let hash = reader.readUInt64()
            entries.append(TileManifestEntry(key: TileKey(z: z, x: x, y: y), isLeaf: isLeaf,
                                             siteCount: siteCount, byteCount: byteCount, hash: hash))
        }
        assert(reader.isAtEnd)
        return entries
    }

    // 64-bit FNV-1a.
    static func hash(of data: Data) -> UInt64 {
        var hash: UInt64 = 0xcbf29ce484222325
        for byte in data {
            hash = (hash ^ UInt64(byte)) &* 0x100000001b3
        }
        return hash
    }
}

