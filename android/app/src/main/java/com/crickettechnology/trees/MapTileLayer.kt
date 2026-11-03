package com.crickettechnology.trees

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.model.Tile
import com.google.android.gms.maps.model.TileOverlay
import com.google.android.gms.maps.model.TileOverlayOptions
import com.google.android.gms.maps.model.TileProvider
import java.io.ByteArrayOutputStream
import kotlin.math.max
import kotlin.math.pow

// Android-specific: GMSSyncTileLayer on iOS combines the tile source and the overlay on the map;
// here, this class is the TileProvider, and adds its own TileOverlay to the map.
class MapTileLayer : TileProvider {

    // Draws a white border around each site so it stands out on satellite imagery.
    @Volatile
    var outlined = false
        set(value) {
            if (value != field) {
                field = value
                clearTileCache()
            }
        }

    // Setting the map adds the layer to it.
    var map: GoogleMap? = null
        set(value) {
            overlay?.remove()
            overlay = null
            field = value
            if (value != null) {
                overlay = value.addTileOverlay(TileOverlayOptions().tileProvider(this).fadeIn(false))
            }
        }

    // Must be called on the main thread.
    fun clearTileCache() {
        overlay?.clearTileCache()
    }

    // Called on a background thread.
    override fun getTile(x: Int, y: Int, zoom: Int): Tile {
        val tileCount = 2.0.pow(zoom)
        val tileSizePixels = TILE_SIZE_PIXELS.toDouble()

        // calculate site radius in pixels
        val worldCenter = WorldLocation((x + 0.5) / tileCount, (y + 0.5) / tileCount)
        val mapCenter = Mercator.unproject(worldCenter)
        val metersPerPixel = Mercator.metersPerUnit(mapCenter.lat) / (tileCount * tileSizePixels)
        val diameter = max(SITE_MIN_DIAMETER_POINTS * tilePixelsPerPoint, SITE_DIAMETER_METERS / metersPerPixel)
        val radius = diameter / 2

        // pad the region to include sites just outside the edges of the tile, so sites whose circles
        // cross tile borders aren't cut off
        val outlined = this.outlined
        val outerRadius = if (outlined) radius + SITE_BORDER_POINTS * tilePixelsPerPoint else radius
        val padding = outerRadius / tileSizePixels

        val region = WorldRect((x - padding) / tileCount,
                               (y - padding) / tileCount,
                               (x + 1 + padding) / tileCount,
                               (y + 1 + padding) / tileCount)
        val tiles = TileDb.instance.tiles(region, zoom)

        if (tiles.isEmpty()) { return TileProvider.NO_TILE }

        val bitmap = Bitmap.createBitmap(TILE_SIZE_PIXELS, TILE_SIZE_PIXELS, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)

        // tile pixel position of a world coordinate
        val pixelsPerUnit = tileCount * tileSizePixels / QuantizedWorldLocation.scale
        val originX = x * tileSizePixels
        val originY = y * tileSizePixels
        val lowest = -outerRadius
        val highest = tileSizePixels + outerRadius

        // borders first, so a neighbor's border never covers a site
        if (outlined) {
            paint.color = Color.WHITE
            for (tile in tiles) {
                for (site in tile.sites) {
                    // pixel coords of site:
                    val tileX = site.location.x.toDouble() * pixelsPerUnit - originX
                    val tileY = site.location.y.toDouble() * pixelsPerUnit - originY

                    // don't draw sites outside of view
                    if (tileX < lowest || tileX > highest || tileY < lowest || tileY > highest) { continue }

                    canvas.drawCircle(tileX.toFloat(), tileY.toFloat(), outerRadius.toFloat(), paint)
                }
            }
        }

        // draw site colors
        for (tile in tiles) {
            for (site in tile.sites) {
                // pixel coords of site:
                val tileX = site.location.x.toDouble() * pixelsPerUnit - originX
                val tileY = site.location.y.toDouble() * pixelsPerUnit - originY

                // don't draw sites outside of view
                if (tileX < lowest || tileX > highest || tileY < lowest || tileY > highest) { continue }

                paint.color = site.type.color
                canvas.drawCircle(tileX.toFloat(), tileY.toFloat(), radius.toFloat(), paint)
            }
        }

        val stream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
        bitmap.recycle()
        return Tile(TILE_SIZE_PIXELS, TILE_SIZE_PIXELS, stream.toByteArray())
    }


    ////////////////////////////////////////

    private val TILE_SIZE_PIXELS = 512
    private val SITE_DIAMETER_METERS = 4.0
    private val SITE_BORDER_POINTS = 2.0 / 3.0
    private val SITE_MIN_DIAMETER_POINTS = 3.0

    // Android-specific: Google Maps displays each tile at 256 dp, regardless of bitmap size.
    private val tilePixelsPerPoint = TILE_SIZE_PIXELS / 256.0

    private var overlay: TileOverlay? = null
}
