import GoogleMaps

class MapTileLayer: GMSSyncTileLayer {

    override init() {
        super.init()
        self.tileSize = TILE_SIZE
        self.fadeIn = true
    }

    override func tileFor(x: UInt, y: UInt, zoom: UInt) -> UIImage? {
        let tileCount = pow(2.0, Double(zoom))
        let tileCenter = unproject(
            x: (Double(x) + 0.5) / tileCount,
            y: (Double(y) + 0.5) / tileCount
        )
        assert(tileCenter.lat > -85 && tileCenter.lat < 85)
        // Web Mercator uses the WGS 84 equatorial radius as its spherical Earth radius.
        let metersPerPixel = cos(tileCenter.lat * .pi / 180) *
            2 * .pi * 6_378_137 / (tileCount * Double(TILE_SIZE))
        let minimumDiameterPixels =
            MIN_DIAMETER_POINTS * Double(TILE_SIZE) / MAP_TILE_SIZE_POINTS
        let diameter = max(minimumDiameterPixels, SITES_DIAMETER_METERS / metersPerPixel)
        let radius = diameter / 2
        let padding = radius / Double(TILE_SIZE)

        let northWest = unproject(
            x: (Double(x) - padding) / tileCount,
            y: (Double(y) - padding) / tileCount
        )
        let southEast = unproject(
            x: (Double(x) + 1 + padding) / tileCount,
            y: (Double(y) + 1 + padding) / tileCount
        )
        let rect = MapRect(northWest: northWest, southEast: southEast)
        var sites = TreeNode.all.find(rect: rect)

        if sites.isEmpty { return kGMSTileLayerNoTile }

        if sites.count > MAX_SITES {
            let allSites = sites
            let sampleCount = MAX_SITES
            sites = (0..<sampleCount).map { index in
                allSites[index * allSites.count / sampleCount]
            }
            print("decimated \(allSites.count) -> \(sites.count)")
        }

        let profiler = Profiler(name: "tile \(x) \(y) (\(sites.count) sites)")
        // note: we get an assertion if we use UIGraphicsImageRenderer
        let pixelSize = Int(TILE_SIZE)
        let bytesPerRow = pixelSize * 4
        let context = CGContext(
            data: nil,
            width: pixelSize,
            height: pixelSize,
            bitsPerComponent: 8,
            bytesPerRow: bytesPerRow,
            space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        )!

        context.translateBy(x: 0, y: CGFloat(pixelSize))
        context.scaleBy(x: 1, y: -1)
        context.setFillColor(UIColor.red.cgColor)

        for site in sites {
            let (worldX, worldY) = project(location: site.location)
            let tileX = (worldX * tileCount - Double(x)) * Double(TILE_SIZE)
            let tileY = (worldY * tileCount - Double(y)) * Double(TILE_SIZE)
            let circle = CGRect(x: tileX - radius,
                                y: tileY - radius,
                                width: diameter, height: diameter)
            context.fillEllipse(in: circle)
        }

        // draw tile borders
        context.setStrokeColor(UIColor.cyan.cgColor)
        context.setLineWidth(1)
        context.stroke(CGRect(x: 0.5, y: 0.5,
                              width: CGFloat(pixelSize - 1),
                              height: CGFloat(pixelSize - 1)))

        let image = context.makeImage()!
        profiler.stop()
        return UIImage(cgImage: image, scale: 1, orientation: .up)
    }


    ////////////////////////////////////////

    private let TILE_SIZE = 512
    private let SITES_DIAMETER_METERS = 4.0
    private let MIN_DIAMETER_POINTS = 4.0
    private let MAP_TILE_SIZE_POINTS = 256.0
    private let MAX_SITES = 5000

    private func project(location: MapLocation) -> (Double, Double) {
        var s = sin(location.lat * .pi / 180)

        // Truncating to 0.9999 effectively limits latitude to 89.189. This is
        // about a third of a tile past the edge of the world tile.
        s = min(max(s, -0.9999), 0.9999)

        let x = 0.5 + location.lon / 360
        let y = 0.5 - log((1+s)/(1-s)) / (4 * .pi)
        return (x, y)
    }

    private func unproject(x: Double, y: Double) -> MapLocation {
        let longitude = (x - 0.5) * 360.0

        let a = exp((0.5 - y)*(4.0 * .pi))
        let latitude = asin((a-1.0)/(a+1.0)) * 180.0 / .pi

        return MapLocation(lat: latitude, lon: longitude)
    }
}
