import GoogleMaps

class SiteTileLayer: GMSSyncTileLayer {

    override init() {
        super.init()
        self.tileSize = TILE_SIZE
        self.fadeIn = true
    }

    override func tileFor(x: UInt, y: UInt, zoom: UInt) -> UIImage? {
        guard let site = TreeNode.all.first else {
            return kGMSTileLayerNoTile
        }

        let tileCount = pow(2.0, Double(zoom))
        let latitude = min(max(site.location.latitude, -85.05112878), 85.05112878)
        let latitudeRadians = latitude * .pi / 180
        let worldX = (site.location.longitude + 180) / 360 * tileCount
        let worldY = (1 - asinh(tan(latitudeRadians)) / .pi) / 2 * tileCount
        let siteTileX = UInt(floor(worldX))
        let siteTileY = UInt(floor(worldY))

        guard x == siteTileX, y == siteTileY else {
            return kGMSTileLayerNoTile
        }

        let tileSize = CGSize(width: TILE_SIZE, height: TILE_SIZE)
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        let renderer = UIGraphicsImageRenderer(size: tileSize, format: format)
        return renderer.image { rendererContext in
            let localX = CGFloat((worldX - Double(siteTileX)) * Double(TILE_SIZE))
            let localY = CGFloat((worldY - Double(siteTileY)) * Double(TILE_SIZE))
            let radius: CGFloat = 10
            let circle = CGRect(
                x: localX - radius,
                y: localY - radius,
                width: radius * 2,
                height: radius * 2
            )
            rendererContext.cgContext.setFillColor(UIColor.red.cgColor)
            rendererContext.cgContext.fillEllipse(in: circle)
        }
    }

    private let TILE_SIZE = 512
}
