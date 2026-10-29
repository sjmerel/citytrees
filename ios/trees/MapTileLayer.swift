import GoogleMaps

class MapTileLayer: GMSSyncTileLayer {

    // Draws a white border around each site so it stands out on satellite imagery.
    var outlined = false {
        didSet {
            if outlined != oldValue { clearTileCache() }
        }
    }

    override init() {
        super.init()
        self.tileSize = TILE_SIZE
        self.fadeIn = false
    }

    override func tileFor(x: UInt, y: UInt, zoom: UInt) -> UIImage? {
        let tileCount = pow(2.0, Double(zoom))
        let tileCenter = Mercator.unproject(
            x: (Double(x) + 0.5) / tileCount,
            y: (Double(y) + 0.5) / tileCount
        )
        let metersPerPixel = Mercator.metersPerUnit(atLatitude: tileCenter.lat) *
            Mercator.scale / (tileCount * Double(TILE_SIZE))
        let minimumDiameterPixels =
            MIN_DIAMETER_POINTS * Double(TILE_SIZE) / MAP_TILE_SIZE_POINTS
        let diameter = max(minimumDiameterPixels, SITES_DIAMETER_METERS / metersPerPixel)
        let radius = diameter / 2
        let outlined = self.outlined
        let outerRadius = outlined ? radius + BORDER_PIXELS : radius
        let padding = outerRadius / Double(TILE_SIZE)

        let region = MapDb.WorldRect(minX: (Double(x) - padding) / tileCount,
                                     minY: (Double(y) - padding) / tileCount,
                                     maxX: (Double(x) + 1 + padding) / tileCount,
                                     maxY: (Double(y) + 1 + padding) / tileCount)
        let tiles = MapDb.instance.tiles(covering: region, zoom: Int(zoom))

        if tiles.isEmpty { return kGMSTileLayerNoTile }

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

        // tile pixel position of a world coordinate
        let pixelsPerUnit = tileCount * Double(TILE_SIZE) / Mercator.scale
        let originX = Double(x) * Double(TILE_SIZE)
        let originY = Double(y) * Double(TILE_SIZE)
        let lowest = -outerRadius
        let highest = Double(TILE_SIZE) + outerRadius

        // borders first, so a neighbor's border never covers a site
        if outlined {
            context.setFillColor(UIColor.white.cgColor)
            for (_, tile) in tiles {
                for site in tile.sites {
                    let tileX = Double(site.x) * pixelsPerUnit - originX
                    let tileY = Double(site.y) * pixelsPerUnit - originY
                    if tileX < lowest || tileX > highest || tileY < lowest || tileY > highest { continue }
                    context.fillEllipse(in: CGRect(x: tileX - outerRadius, y: tileY - outerRadius,
                                                   width: outerRadius * 2, height: outerRadius * 2))
                }
            }
        }

        // one pass per color, so the fill color is set only once per color
        let colorIndices = TreeType.colorIndices
        for (colorIndex, color) in TreeType.palette.enumerated() {
            context.setFillColor(color.cgColor)
            for (_, tile) in tiles {
                for site in tile.sites where Int(colorIndices[Int(site.typeIndex)]) == colorIndex {
                    let tileX = Double(site.x) * pixelsPerUnit - originX
                    let tileY = Double(site.y) * pixelsPerUnit - originY
                    if tileX < lowest || tileX > highest || tileY < lowest || tileY > highest { continue }
                    context.fillEllipse(in: CGRect(x: tileX - radius, y: tileY - radius,
                                                   width: diameter, height: diameter))
                }
            }
        }

        /*
        // debug: outline the data tiles used
        context.setStrokeColor(UIColor.systemPink.cgColor)
        context.setLineWidth(2)
        for (key, _) in tiles {
            let scale = tileCount * Double(TILE_SIZE) / Double(1 << key.z)
            let left = Double(key.x) * scale - originX
            let top = Double(key.y) * scale - originY
            context.stroke(CGRect(x: left, y: top, width: scale, height: scale))
        }
        */

        /*
        // draw tile borders
        context.setStrokeColor(UIColor.cyan.cgColor)
        context.setLineWidth(1)
        context.stroke(CGRect(x: 0.5, y: 0.5,
                              width: CGFloat(pixelSize - 1),
                              height: CGFloat(pixelSize - 1)))
        */

        let image = context.makeImage()!
        return UIImage(cgImage: image, scale: 1, orientation: .up)
    }


    ////////////////////////////////////////

    private let TILE_SIZE = 512
    private let SITES_DIAMETER_METERS = 4.0
    private let BORDER_PIXELS = 2.0
    private let MIN_DIAMETER_POINTS = 6.0
    private let MAP_TILE_SIZE_POINTS = 256.0
}
