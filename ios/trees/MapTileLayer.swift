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
        self.tileSize = TILE_SIZE_PIXELS
        self.fadeIn = false
    }

    override func tileFor(x: UInt, y: UInt, zoom: UInt) -> UIImage? {
        let tileCount = pow(2.0, Double(zoom))
        let tileSizePixels = Double(TILE_SIZE_PIXELS)

        // calculate site radius in pixels
        let worldCenter = WorldLocation(x: (Double(x) + 0.5) / tileCount, y: (Double(y) + 0.5) / tileCount)
        let mapCenter = Mercator.unproject(worldCenter)
        let metersPerPixel = Mercator.metersPerUnit(atLatitude: mapCenter.lat) / (tileCount * tileSizePixels)
        let diameter = max(SITE_MIN_DIAMETER_PIXELS, SITE_DIAMETER_METERS / metersPerPixel)
        let radius = diameter / 2
        
        // pad the region to include sites just outside the edges of the tile, so sites whose circles
        // cross tile borders aren't cut off
        let outerRadius = self.outlined ? radius + SITE_BORDER_PIXELS : radius
        let padding = outerRadius / tileSizePixels

        let region = WorldRect(minX: (Double(x) - padding) / tileCount,
                               minY: (Double(y) - padding) / tileCount,
                               maxX: (Double(x) + 1 + padding) / tileCount,
                               maxY: (Double(y) + 1 + padding) / tileCount)
        let tiles = MapDb.instance.tiles(covering: region, zoom: Int(zoom))

        if tiles.isEmpty { return kGMSTileLayerNoTile }

        // note: we get an assertion if we use UIGraphicsImageRenderer
        let bytesPerRow = TILE_SIZE_PIXELS * 4
        let context = CGContext(
            data: nil,
            width: TILE_SIZE_PIXELS,
            height: TILE_SIZE_PIXELS,
            bitsPerComponent: 8,
            bytesPerRow: bytesPerRow,
            space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        )!

        // match coordinate systems
        context.translateBy(x: 0, y: CGFloat(TILE_SIZE_PIXELS))
        context.scaleBy(x: 1, y: -1)

        // tile pixel position of a world coordinate
        let pixelsPerUnit = tileCount * tileSizePixels / QuantizedWorldLocation.scale
        let originX = Double(x) * tileSizePixels
        let originY = Double(y) * tileSizePixels
        let lowest = -outerRadius
        let highest = tileSizePixels + outerRadius

        // borders first, so a neighbor's border never covers a site
        if self.outlined {
            context.setFillColor(UIColor.white.cgColor)
            for tile in tiles {
                for site in tile.sites {
                    // pixel coords of site:
                    let tileX = Double(site.location.x) * pixelsPerUnit - originX
                    let tileY = Double(site.location.y) * pixelsPerUnit - originY

                    // don't draw sites outside of view
                    if tileX < lowest || tileX > highest || tileY < lowest || tileY > highest { continue }

                    context.fillEllipse(in: CGRect(x: tileX - outerRadius, y: tileY - outerRadius, width: outerRadius * 2, height: outerRadius * 2))
                }
            }
        }

        // draw site colors
        for tile in tiles {
            for site in tile.sites {
                // pixel coords of site:
                let tileX = Double(site.location.x) * pixelsPerUnit - originX
                let tileY = Double(site.location.y) * pixelsPerUnit - originY

                // don't draw sites outside of view
                if tileX < lowest || tileX > highest || tileY < lowest || tileY > highest { continue }

                context.setFillColor(site.type.color.cgColor)
                context.fillEllipse(in: CGRect(x: tileX - radius, y: tileY - radius, width: diameter, height: diameter))
            }
        }

        let image = context.makeImage()!
        return UIImage(cgImage: image, scale: 1, orientation: .up)
    }


    ////////////////////////////////////////

    private let TILE_SIZE_PIXELS = 512
    private let SITE_DIAMETER_METERS = 4.0
    private let SITE_BORDER_PIXELS = 2.0
    private let SITE_MIN_DIAMETER_PIXELS = 8.0
}
