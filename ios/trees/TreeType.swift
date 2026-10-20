import Foundation

struct TreeType {

    let canonicalName: String
    var commonNames: [String] = []

    // Index into `palette`. The most common genera each get their own color (assigned by
    // build_data); index 0 is shared by everything else.
    var colorIndex: Int = 0

    // Number of colors in the app's palette (see TreeType+Color.swift), including color 0.
    static let colorCount = 25

    // Color index of every type, by type index.
    static private(set) var colorIndices: [UInt8] = []

    static private(set) var all: [TreeType]!

    static func load() {
        let url = Bundle.main.url(forResource: "types", withExtension: "bin")!
        Self.all = readBinary(url: url)
        Self.colorIndices = Self.all.map { UInt8($0.colorIndex) }
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
            let colorIndex = Int(reader.readUInt8())
            assert(colorIndex < colorCount)
            let commonCount = Int(reader.readUInt8())
            var commonNames: [String] = []
            for _ in 0..<commonCount {
                let length = Int(reader.readUInt16())
                commonNames.append(reader.readString(count: length))
            }
            types.append(TreeType(canonicalName: name, commonNames: commonNames, colorIndex: colorIndex))
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
        writer.writeUInt8(UInt8(colorIndex))

        let names = commonNames.prefix(Int(UInt8.max))
        writer.writeUInt8(UInt8(names.count))
        for name in names {
            let bytes = Data(name.utf8)
            assert(bytes.count <= Int(UInt16.max))
            writer.writeUInt16(UInt16(bytes.count))
            writer.writeString(name)
        }
    }
}
