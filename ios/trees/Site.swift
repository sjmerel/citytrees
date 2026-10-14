import Foundation

struct Site {

    let latitude: Double
    let longitude: Double

    var type: TreeType {
        TreeType.all[typeIndex]
    }

    static let all = loadFromBundle()

    ////////////////////////////////////////

    private let typeIndex: Int

    private static func loadFromBundle() -> [Site] {
        let url = Bundle.main.url(forResource: "sites", withExtension: "bin")!
        let data = try! Data(contentsOf: url)
        var reader = BinaryReader(data: data)

        let count = reader.readUInt32()
        var sites: [Site] = []
        sites.reserveCapacity(Int(count))

        for _ in 0..<count {
            let latitude = reader.readDouble()
            let longitude = reader.readDouble()
            let typeIndex = Int(reader.readUInt32())
            sites.append(Site(latitude: latitude, longitude: longitude, typeIndex: typeIndex))
        }

        precondition(reader.isAtEnd)
        return sites
    }
}

