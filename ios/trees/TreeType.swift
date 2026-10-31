import Foundation

struct TreeType {

    let canonicalName: String
    var commonNames: [String] = []
    var wikipediaUrl: String?

    // colors are defined in TreeType+Colors extension (so this type can be used in build_data)
    var colorIndex: Int = 0

    static private(set) var all: [TreeType]!

    static func load() {
        let url = Bundle.main.url(forResource: "types", withExtension: "bin")!
        Self.all = readBinary(url: url)
        assignColors()
    }


    ////////////////////////////////////////

    static func readBinary(url: URL) -> [TreeType] {
        let profiler = Profiler(name: "read \(url)")
        let reader = BinaryReader(url: url)

        let count = reader.readUInt32()
        var types: [TreeType] = []
        types.reserveCapacity(Int(count))

        let wikipediaBase = "https://en.wikipedia.org/wiki/"

        for _ in 0..<count {
            let nameLength = Int(reader.readUInt16())
            let name = reader.readString(count: nameLength)
            let commonCount = Int(reader.readUInt8())
            var commonNames: [String] = []
            for _ in 0..<commonCount {
                let length = Int(reader.readUInt16())
                commonNames.append(reader.readString(count: length))
            }
            let urlLength = Int(reader.readUInt16())
            let wikipediaUrl = urlLength > 0 ? wikipediaBase + reader.readString(count: urlLength) : nil
            types.append(TreeType(canonicalName: name, commonNames: commonNames, wikipediaUrl: wikipediaUrl))
        }

        assert(reader.isAtEnd)
        profiler.stop()

        return types
    }

    static func writeBinary(types: [TreeType], url: URL) throws {
        //let profiler = Profiler(name: "write \(url)")
        let writer = BinaryWriter()

        writer.writeUInt32(UInt32(types.count))
        for type in types {
            type.writeBinary(writer: writer)
        }
        try writer.write(to: url)

        //profiler.stop()
    }


    ////////////////////////////////////////

    private func writeBinary(writer: BinaryWriter) {
        let bytes = Data(canonicalName.utf8)
        assert(bytes.count <= Int(UInt16.max))
        writer.writeUInt16(UInt16(bytes.count))
        writer.writeString(canonicalName)

        let names = commonNames.prefix(Int(UInt8.max))
        writer.writeUInt8(UInt8(names.count))
        for name in names {
            let bytes = Data(name.utf8)
            assert(bytes.count <= Int(UInt16.max))
            writer.writeUInt16(UInt16(bytes.count))
            writer.writeString(name)
        }

        let urlBytes = Data((wikipediaUrl ?? "").utf8)
        assert(urlBytes.count <= Int(UInt16.max))
        writer.writeUInt16(UInt16(urlBytes.count))
        if !urlBytes.isEmpty { writer.writeString(wikipediaUrl!) }
    }

    private static func assignColors() {
        // assign colors based on genus
        var genusMap = [String : Int]()
        for i in all.indices {
            let genus = String(all[i].canonicalName.split(separator: " ").first ?? "")
            var colorIndex = genusMap[genus] 
            if colorIndex == nil {
                colorIndex = genusMap.count
                genusMap[genus] = colorIndex
            }
            all[i].colorIndex = colorIndex!
        }
    }

}
