import Foundation

struct TreeType {

    let canonicalName: String
    // let commonNames: [String]

    static let all = load()

    private static func load() -> [TreeType] {
        let profiler = Profiler(name: "read sites.bin")

        let reader = BinaryReader(fileName: "types.bin")

        let count = reader.readUInt32()
        var types: [TreeType] = []
        types.reserveCapacity(Int(count))

        for _ in 0..<count {
            let nameLength = Int(reader.readUInt16())
            let name = reader.readString(count: nameLength)
            types.append(TreeType(canonicalName: name))
        }

        precondition(reader.isAtEnd)
        profiler.stop()
        return types
    }
}
