import GoogleMaps

class MapTileLayer: GMSSyncTileLayer {

    override init() {
        super.init()
        self.tileSize = TILE_SIZE
        self.fadeIn = true
    }

    override func tileFor(x: UInt, y: UInt, zoom: UInt) -> UIImage? {
        let tileCount = pow(2.0, Double(zoom))
        let topLeft = unproject(
            x: Double(x) / tileCount,
            y: Double(y) / tileCount
        )
        let bottomRight = unproject(
            x: (Double(x) + 1) / tileCount,
            y: (Double(y) + 1) / tileCount
        )
        let rect = MapRect(
            minX: topLeft.x,
            minY: bottomRight.y,
            maxX: bottomRight.x,
            maxY: topLeft.y
        )
        let sites = TreeNode.all.find(rect: rect)

        if sites.isEmpty { return kGMSTileLayerNoTile }

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
        let radius: CGFloat = 10
        for site in sites {
            let (worldX, worldY) = project(location: site.location)
            let tileX = (worldX * tileCount - Double(x)) * Double(TILE_SIZE)
            let tileY = (worldY * tileCount - Double(y)) * Double(TILE_SIZE)
            let circle = CGRect(x: tileX - Double(radius),
                                y: tileY - Double(radius),
                                width: radius*2, height: radius*2)
            context.fillEllipse(in: circle)
        }

        let image = context.makeImage()!
        return UIImage(cgImage: image, scale: 1, orientation: .up)

        /*
        let tileSize = CGSize(width: TILE_SIZE, height: TILE_SIZE)
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        let renderer = UIGraphicsImageRenderer(size: tileSize, format: format)
        return renderer.image { rendererContext in
            rendererContext.cgContext.setFillColor(UIColor.red.cgColor)
            let radius: CGFloat = 10
            for site in sites {
                let (x, y) = project(location: site.location)
                let circle = CGRect(x: (x - floor(x))*Double(TILE_SIZE),
                                    y: (y - floor(y))*Double(TILE_SIZE),
                                    width: radius*2, height: radius*2)
                rendererContext.cgContext.fillEllipse(in: circle)
            }
        }
        */
    }


    ////////////////////////////////////////

    private let TILE_SIZE = 512

    private func project(location: MapLocation) -> (Double, Double) {
        var s = sin(location.latitude * .pi / 180)

        // Truncating to 0.9999 effectively limits latitude to 89.189. This is
        // about a third of a tile past the edge of the world tile.
        s = min(max(s, -0.9999), 0.9999)

        let x = 0.5 + location.longitude / 360
        let y = 0.5 - log((1+s)/(1-s)) / (4 * .pi)
        return (x, y)
    }

    private func unproject(x: Double, y: Double) -> MapLocation {
        let longitude = (x - 0.5) * 360.0

        let a = exp((0.5 - y)*(4.0 * .pi))
        let latitude = asin((a-1.0)/(a+1.0)) * 180.0 / .pi

        return MapLocation(longitude: longitude, latitude: latitude)
    }
}
