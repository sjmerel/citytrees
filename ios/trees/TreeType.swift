import Foundation

struct TreeType {

    let canonicalName: String
    // let commonNames: [String]

    static let all = loadFromBundle()

    private static func loadFromBundle() -> [TreeType] {
        let url = Bundle.main.url(forResource: "types", withExtension: "bin")!
        let data = try! Data(contentsOf: url)
        var reader = BinaryReader(data: data)

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
