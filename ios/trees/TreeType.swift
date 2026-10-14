import Foundation

struct TreeType {
    let canonicalName: String

    static let all = loadFromBundle()

    private static func loadFromBundle() -> [TreeType] {
        let url = Bundle.main.url(forResource: "types", withExtension: "bin")!
        let data = try! Data(contentsOf: url)
        var reader = TreeTypeFileReader(data: data)

        let count = reader.readUInt32()
        var types: [TreeType] = []
        types.reserveCapacity(Int(count))

        for _ in 0..<count {
            let nameLength = Int(reader.readUInt16())
            let name = reader.readString(count: nameLength)
            types.append(TreeType(canonicalName: name))
        }

        precondition(reader.isAtEnd)
        return types
    }
}

private struct TreeTypeFileReader {
    private let bytes: [UInt8]
    private var offset = 0

    var isAtEnd: Bool {
        offset == bytes.count
    }

    init(data: Data) {
        bytes = Array(data)
    }

    mutating func readUInt16() -> UInt16 {
        let value = UInt16(readByte()) | UInt16(readByte()) << 8
        return value
    }

    mutating func readUInt32() -> UInt32 {
        UInt32(readUInt16()) | UInt32(readUInt16()) << 16
    }

    mutating func readString(count: Int) -> String {
        let end = offset + count
        precondition(count >= 0 && end <= bytes.count)
        let string = String(bytes: bytes[offset..<end], encoding: .utf8)!
        offset = end
        return string
    }

    private mutating func readByte() -> UInt8 {
        precondition(offset < bytes.count)
        defer { offset += 1 }
        return bytes[offset]
    }
}
