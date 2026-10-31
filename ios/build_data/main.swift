import Foundation

let p = Profiler(name: "main")


////////////////////////////////////////
// set directories

// inDir contains json files; binary files are written to outDir 
let inDir = URL(fileURLWithPath: CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : ".", isDirectory: true)
let outDir = CommandLine.arguments.count > 2 ? URL(fileURLWithPath: CommandLine.arguments[2], isDirectory: true) : inDir

let fileManager = FileManager.default
try fileManager.createDirectory(at: outDir, withIntermediateDirectories: true)


////////////////////////////////////////
// read files

print("reading types.json")
let typesUrl = inDir.appendingPathComponent("types.json")
var types = try JSONDecoder().decode([TreeType].self, from: Data(contentsOf: typesUrl))
print("read \(types.count) types")

print("reading sites.json")
let sitesUrl = inDir.appendingPathComponent("sites.json")
var sites = try JSONDecoder().decode([Site].self, from: Data(contentsOf: sitesUrl))
let siteCount = sites.count
print("read \(siteCount) sites")


////////////////////////////////////////
// Write tree types

print("writing types.bin")
try TreeType.writeBinary(types: types, url: outDir.appendingPathComponent("types.bin"))



////////////////////////////////////////
// shuffle the sites deterministically
// the position of sites in the list is used as its priority when generating levels of detail

print("shuffling")
var rng = SeededGenerator(seed: 1)
sites.shuffle(using: &rng)



////////////////////////////////////////
// remove tiles from previous runs

for url in (try? fileManager.contentsOfDirectory(at: outDir, includingPropertiesForKeys: nil)) ?? [] {
    let name = url.lastPathComponent
    let isTile = name.hasPrefix("tile_") && name.hasSuffix(".bin")
    if isTile || name == "tiles_manifest.bin" || Int(name) != nil {
        try fileManager.removeItem(at: url)
    }
}


////////////////////////////////////////
// generate tiles

print("writing tiles")
let builder = TileBuilder(maxSitesPerTile: 10_000, maxZoom: 16, outDir: outDir)
try builder.build(sites: &sites)


p.stop()
