import Foundation

let p = Profiler(name: "main")

// First argument is the data directory (set in the Xcode scheme); defaults to the current directory.
let dataDir = URL(fileURLWithPath: CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : ".", isDirectory: true)

// Second argument is the output directory for tiles bundled with the app, and types.bin; defaults to the data directory.
let outDir = CommandLine.arguments.count > 2 ? URL(fileURLWithPath: CommandLine.arguments[2], isDirectory: true) : dataDir

// Optional third argument is the output directory for tiles that are downloaded instead of bundled.
let downloadDir = CommandLine.arguments.count > 3 ? URL(fileURLWithPath: CommandLine.arguments[3], isDirectory: true) : nil

try FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)

print("reading types.json")
let typesUrl = dataDir.appendingPathComponent("types.json")
var types = try JSONDecoder().decode([TreeType].self, from: Data(contentsOf: typesUrl))
print("read \(types.count) types")

print("reading sites.json")
let sitesUrl = dataDir.appendingPathComponent("sites.json")
var sites = try JSONDecoder().decode([Site].self, from: Data(contentsOf: sitesUrl))
let siteCount = sites.count
print("read \(siteCount) sites")

// Deterministic shuffle: a site's position is its priority, so each tile's sample of its
// area is stable and nested in the samples of the tiles below it.

// The most common genera each get a color; all other genera share color 0.
var genusCounts: [String: Int] = [:]
var typeCounts = [Int](repeating: 0, count: types.count)
for site in sites { typeCounts[site.typeIndex] += 1 }
func genus(_ type: TreeType) -> String {
    String(type.canonicalName.split(separator: " ").first ?? "")
}
for (index, type) in types.enumerated() {
    genusCounts[genus(type), default: 0] += typeCounts[index]
}
let topGenera = genusCounts.sorted { ($0.value, $1.key) > ($1.value, $0.key) }
    .prefix(TreeType.colorCount - 1)
var genusColors: [String: Int] = [:]
for (rank, entry) in topGenera.enumerated() {
    genusColors[entry.key] = rank + 1
    print(String(format: "color %2d: %@ (%d)", rank + 1, entry.key, entry.value))
}
for index in types.indices {
    types[index].colorIndex = genusColors[genus(types[index])] ?? 0
}

print("writing types.bin")
try TreeType.writeBinary(types: types, url: outDir.appendingPathComponent("types.bin"))

print("quantizing")
var quantized = sites.map { QuantizedSite($0) }
sites = []
var rng = SeededGenerator(seed: 1)
quantized.shuffle(using: &rng)

let maxSitesPerTile = 10_000
let maxZoom = 16
let bundleMaxZoom = 6

// remove tiles from previous runs
let fileManager = FileManager.default
for dir in [outDir, downloadDir].compactMap({ $0 }) {
    for url in (try? fileManager.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil)) ?? [] {
        let name = url.lastPathComponent
        let isTile = name.hasPrefix("tile_") && name.hasSuffix(".bin")
        if isTile || name == "tiles_manifest.bin" || Int(name) != nil {
            try fileManager.removeItem(at: url)
        }
    }
}
if let downloadDir {
    try fileManager.createDirectory(at: downloadDir, withIntermediateDirectories: true)
}

print("writing tiles")
let builder = TileBuilder(maxSites: maxSitesPerTile, maxZoom: maxZoom, bundleMaxZoom: bundleMaxZoom,
                          bundleDir: outDir, downloadDir: downloadDir)
try builder.build(sites: &quantized)
try builder.writeManifest()


////////////////////////////////////////
// summary and checks

let entries = builder.entries
print("zoom  tiles  leaves      sites       bytes")
for z in 0...maxZoom {
    let level = entries.filter { $0.key.z == z }
    if level.isEmpty { continue }
    let leaves = level.filter { $0.isLeaf }.count
    let sitesInLevel = level.reduce(0) { $0 + $1.siteCount }
    let bytes = level.reduce(0) { $0 + $1.byteCount }
    print(String(format: "%4d %6d %7d %10d %11d", z, level.count, leaves, sitesInLevel, bytes))
}
let bundledBytes = entries.filter { $0.key.z <= bundleMaxZoom }.reduce(0) { $0 + $1.byteCount }
let totalBytes = entries.reduce(0) { $0 + $1.byteCount }
print("\(entries.count) tiles, \(totalBytes) bytes (\(bundledBytes) bundled)")

// every site lands in exactly one leaf
let leafSites = entries.filter { $0.isLeaf }.reduce(0) { $0 + $1.siteCount }
assert(leafSites == siteCount, "leaf sites \(leafSites) != \(siteCount)")
let tooBig = entries.filter { $0.siteCount > maxSitesPerTile && $0.key.z < maxZoom }
assert(tooBig.isEmpty, "tiles over the cap before max zoom")

// read back a sample of tiles; sites must fall within the tile's rect
let typeCount = types.count
for entry in entries.enumerated().filter({ $0.offset % 25 == 0 }).map({ $0.element }) {
    let tile = MapTile.readBinary(url: builder.urls[entry.key]!)
    assert(tile.sites.count == entry.siteCount)
    // sites are rounded to the tile's quantization step, so allow a little slack
    let size = Double(1 << (32 - entry.key.z))
    let slack = Double(1 << 16)
    let minX = Double(entry.key.x) * size - slack, maxX = minX + size + 2 * slack
    let minY = Double(entry.key.y) * size - slack, maxY = minY + size + 2 * slack
    for site in tile.sites {
        assert(Double(site.x) >= minX && Double(site.x) <= maxX &&
               Double(site.y) >= minY && Double(site.y) <= maxY,
               "site outside tile \(entry.key)")
        assert(Int(site.typeIndex) < typeCount)
    }
}
print("checks passed")

p.stop()
