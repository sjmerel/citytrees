import Foundation

let p = Profiler(name: "main")

// First argument is the data directory (set in the Xcode scheme); defaults to the current directory.
let dataDir = URL(fileURLWithPath: CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : ".", isDirectory: true)

// Second argument is the output directory; defaults to the data directory.
let outDir = CommandLine.arguments.count > 2 ? URL(fileURLWithPath: CommandLine.arguments[2], isDirectory: true) : dataDir


print("reading types.json")
let typesUrl = dataDir.appendingPathComponent("types.json")
let types = try JSONDecoder().decode([TreeType].self, from: Data(contentsOf: typesUrl))
print("read \(types.count) types")

print("reading sites.json")
let sitesUrl = dataDir.appendingPathComponent("sites.json")
var sites = try JSONDecoder().decode([Site].self, from: Data(contentsOf: sitesUrl))
print("read \(sites.count) sites")

sites = Site.decimate(sites: sites, n: 50000)
print("decimated to \(sites.count) sites")

print("writing types.bin")
try TreeType.writeBinary(types: types, url: outDir.appendingPathComponent("types.bin"))

print("writing sites.bin")
try Site.writeBinary(sites: sites, url: outDir.appendingPathComponent("sites.bin"))

p.stop()
