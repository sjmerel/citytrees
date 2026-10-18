import Foundation

struct TreeType {

    let canonicalName: String
    // let commonNames: [String]

    static private(set) var all: [TreeType]!

    static func load() {
        let url = Bundle.main.url(forResource: "types", withExtension: "bin")!
        Self.all = readBinary(url: url)
    }


    ////////////////////////////////////////

    static func readBinary(url: URL) -> [TreeType] {
        let profiler = Profiler(name: "read \(url)")
        let reader = BinaryReader(url: url)

        let count = reader.readUInt32()
        var types: [TreeType] = []
        types.reserveCapacity(Int(count))

        for _ in 0..<count {
            let nameLength = Int(reader.readUInt16())
            let name = reader.readString(count: nameLength)
            types.append(TreeType(canonicalName: name))
        }

        assert(reader.isAtEnd)
        profiler.stop()

        return types
    }

    static func writeBinary(types: [TreeType], url: URL) throws {
        let profiler = Profiler(name: "write \(url)")
        let writer = BinaryWriter()

        writer.writeUInt32(UInt32(types.count))
        for type in types {
            type.writeBinary(writer: writer)
        }
        try writer.write(to: url)

        profiler.stop()
    }


    ////////////////////////////////////////

    private func writeBinary(writer: BinaryWriter) {
        let bytes = Data(canonicalName.utf8)
        assert(bytes.count <= Int(UInt16.max))
        writer.writeUInt16(UInt16(bytes.count))
        writer.writeString(canonicalName)
    }
}
