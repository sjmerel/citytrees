import GoogleMaps

class MapTileLayer: GMSSyncTileLayer {

    override init() {
        super.init()
        self.tileSize = TILE_SIZE
        self.fadeIn = true
    }

    // Safe to set from the main thread while tiles render on background threads.
    var selectedSite: QuantizedSite? {
        get { selectionLock.withLock { _selectedSite } }
        set {
            selectionLock.withLock { _selectedSite = newValue }
            clearTileCache()
        }
    }

    override func tileFor(x: UInt, y: UInt, zoom: UInt) -> UIImage? {
        let tileCount = pow(2.0, Double(zoom))
        let tileCenter = WorldCoord.location(
            x: (Double(x) + 0.5) / tileCount,
            y: (Double(y) + 0.5) / tileCount
        )
        let metersPerPixel = WorldCoord.metersPerUnit(atLatitude: tileCenter.lat) *
            WorldCoord.scale / (tileCount * Double(TILE_SIZE))
        let minimumDiameterPixels =
            MIN_DIAMETER_POINTS * Double(TILE_SIZE) / MAP_TILE_SIZE_POINTS
        let diameter = max(minimumDiameterPixels, SITES_DIAMETER_METERS / metersPerPixel)
        let radius = diameter / 2
        let padding = radius / Double(TILE_SIZE)

        let region = MapDb.WorldRect(minX: (Double(x) - padding) / tileCount,
                                     minY: (Double(y) - padding) / tileCount,
                                     maxX: (Double(x) + 1 + padding) / tileCount,
                                     maxY: (Double(y) + 1 + padding) / tileCount)
        let selectedSite = self.selectedSite
        let tiles = MapDb.instance.tiles(covering: region, zoom: Int(zoom))

        if tiles.isEmpty && selectedSite == nil { return kGMSTileLayerNoTile }

        //let profiler = Profiler(name: "tile \(x),\(y) \(zoom) (\(sites.count) sites)")
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

        // tile pixel position of a world coordinate
        let pixelsPerUnit = tileCount * Double(TILE_SIZE) / WorldCoord.scale
        let originX = Double(x) * Double(TILE_SIZE)
        let originY = Double(y) * Double(TILE_SIZE)
        let lowest = -radius
        let highest = Double(TILE_SIZE) + radius

        func draw(_ site: QuantizedSite) {
            let tileX = Double(site.x) * pixelsPerUnit - originX
            let tileY = Double(site.y) * pixelsPerUnit - originY
            if tileX < lowest || tileX > highest || tileY < lowest || tileY > highest { return }
            context.fillEllipse(in: CGRect(x: tileX - radius, y: tileY - radius,
                                           width: diameter, height: diameter))
        }

        for (_, tile) in tiles {
            for site in tile.sites {
                draw(site)
            }
        }

        // drawn last so it is always visible
        if let selectedSite {
            context.setFillColor(UIColor.yellow.cgColor)
            draw(selectedSite)
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
        // profiler.stop()
        return UIImage(cgImage: image, scale: 1, orientation: .up)
    }


    ////////////////////////////////////////

    private let selectionLock = NSLock()
    private var _selectedSite: QuantizedSite?

    private let TILE_SIZE = 512
    private let SITES_DIAMETER_METERS = 4.0
    private let MIN_DIAMETER_POINTS = 4.0
    private let MAP_TILE_SIZE_POINTS = 256.0
}
