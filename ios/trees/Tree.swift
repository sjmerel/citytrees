import Foundation

struct Tree {
    let latitude: Double
    let longitude: Double
    private let typeIndex: Int

    var type: TreeType {
        TreeType.all[typeIndex]
    }

    static let all = loadFromBundle()

    private static func loadFromBundle() -> [Tree] {
        let url = Bundle.main.url(forResource: "trees", withExtension: "bin")!
        let data = try! Data(contentsOf: url)
        var reader = TreeFileReader(data: data)

        let count = reader.readUInt32()
        var trees: [Tree] = []
        trees.reserveCapacity(Int(count))

        for _ in 0..<count {
            let latitude = reader.readDouble()
            let longitude = reader.readDouble()
            let typeIndex = Int(reader.readUInt32())
            trees.append(Tree(latitude: latitude, longitude: longitude, typeIndex: typeIndex))
        }

        precondition(reader.isAtEnd)
        return trees
    }
}

private struct TreeFileReader {
    private let bytes: [UInt8]
    private var offset = 0

    var isAtEnd: Bool {
        offset == bytes.count
    }

    init(data: Data) {
        bytes = Array(data)
    }

    mutating func readUInt32() -> UInt32 {
        UInt32(readByte())
            | UInt32(readByte()) << 8
            | UInt32(readByte()) << 16
            | UInt32(readByte()) << 24
    }

    mutating func readDouble() -> Double {
        let low = UInt64(readUInt32())
        let high = UInt64(readUInt32()) << 32
        return Double(bitPattern: high | low)
    }

    private mutating func readByte() -> UInt8 {
        precondition(offset < bytes.count)
        defer { offset += 1 }
        return bytes[offset]
    }
}
