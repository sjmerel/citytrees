import Foundation

let p = Profiler(name: "main")


// set directories

let inDir = URL(fileURLWithPath: CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : ".", isDirectory: true)
let outDir = CommandLine.arguments.count > 2 ? URL(fileURLWithPath: CommandLine.arguments[2], isDirectory: true) : inDir


// read files

print("reading types.json...")
let typesUrl = inDir.appendingPathComponent("types.json")
var types = try JSONDecoder().decode([TreeType].self, from: Data(contentsOf: typesUrl))
print("read \(types.count) types")

print("reading sites.json... ")
let sitesUrl = inDir.appendingPathComponent("sites.json")
var sites = try JSONDecoder().decode([Site].self, from: Data(contentsOf: sitesUrl))
let siteCount = sites.count
print("read \(siteCount) sites")


// create output dir

let formatter = DateFormatter()
formatter.calendar = Calendar(identifier: .iso8601)
formatter.locale = Locale(identifier: "en_US_POSIX")
formatter.timeZone = .current
formatter.dateFormat = "yyyyMMdd-HHmmss"

let timestamp = formatter.string(from: Date())
let tileDir = outDir.appendingPathComponent(timestamp)

let fileManager = FileManager.default
try fileManager.createDirectory(at: tileDir, withIntermediateDirectories: true)


// write tree types

print("writing types.bin")
try TreeType.writeBinary(types: types, url: tileDir.appendingPathComponent("types.bin"))


// generate tiles

// shuffle the sites deterministically
// the position of sites in the list is used as its priority when generating levels of detail
var rng = SeededGenerator(seed: 1)
sites.shuffle(using: &rng)

print("writing tiles")
let builder = TileBuilder(maxSitesPerTile: 10_000, maxZoom: 16, outDir: tileDir)
try builder.build(sites: &sites)


// write latest.txt

let latestUrl = outDir.appendingPathComponent("latest.txt")
try timestamp.write(to: latestUrl, atomically: true, encoding: .utf8)


p.stop()
