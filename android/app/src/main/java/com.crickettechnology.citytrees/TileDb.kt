package com.crickettechnology.citytrees

import java.io.File
import java.util.concurrent.locks.ReentrantLock
import kotlin.concurrent.withLock
import kotlin.math.floor

// Provides the sites in the tile pyramid (see MapTile.kt). Safe to use from any thread.
class TileDb private constructor() {

    companion object {
        val instance = TileDb()
    }

    val siteCount: Int

    // Get the tiles needed to show a region at a zoom level
    fun tiles(rect: WorldRect, zoom: Int): List<MapTile> {
        val z = minOf(zoom, maxZoom)
        val count = 1 shl z
        fun index(fraction: Double): Int {
            return minOf(maxOf(floor(fraction * count).toInt(), 0), count - 1)
        }

        // for each tile in the rect at the current zoom, get the key for the tile actually in the manifest.
        val keys = HashSet<TileKey>()
        for (y in index(rect.minY)..index(rect.maxY)) {
            for (x in index(rect.minX)..index(rect.maxX)) {
                var key = TileKey(z, x, y)
                if (tileKeySet.contains(key)) {
                    keys.add(getAvailableTileKey(key))
                }
                else {
                    // A missing tile is either empty, or inside an ancestor that is a leaf
                    // (which holds every site in its area).
                    while (key.z > 0) {
                        key = key.parent
                        if (leafKeySet.contains(key)) {
                            keys.add(getAvailableTileKey(key))
                            break
                        }
                    }
                }
            }
        }

        // sort so drawing order is deterministic
        return keys.sorted().map { getTile(it) }
    }

    fun findNearest(location: MapLocation, maxDistance: Double, zoom: Int): Site? {
        val center = Mercator.project(location)
        val radius = maxDistance / Mercator.metersPerUnit(location.lat)
        val rect = WorldRect(center.x - radius,
                             center.y - radius,
                             center.x + radius,
                             center.y + radius)

        var best: Site? = null
        var bestDistance = radius * radius
        for (tile in tiles(rect, zoom)) {
            for (site in tile.sites) {
                val location = QuantizedWorldLocation.unquantize(site.location)
                val dx = location.x - center.x
                val dy = location.y - center.y
                val distance = dx * dx + dy * dy
                if (distance <= bestDistance) {
                    best = site
                    bestDistance = distance
                }
            }
        }

        return best
    }

    // Called on the main thread when more tiles became available, so the map can redraw.
    var onTilesDownloaded: (() -> Unit)?
        get() { return store.onTilesDownloaded }
        set(value) { store.onTilesDownloaded = value }

    // Called on the main thread with true when a tile download fails, and false when one next succeeds.
    var onDownloadFailedChanged: ((Boolean) -> Unit)?
        get() { return store.onDownloadFailedChanged }
        set(value) { store.onDownloadFailedChanged = value }

    ////////////////////////////////////////

    // The tile itself if it is on the device; otherwise starts downloading it, and uses its
    // closest ancestor that is available (a coarser sample of the same area) in the meantime.
    // Tiles up to the bundled zoom level are always available.
    private fun getAvailableTileKey(key: TileKey): TileKey {
        var key = key
        while (key.z > 0 && store.getFile(key) == null) {
            key = key.parent
        }
        return key
    }

    private val store: TileStore
    private val tileKeySet: Set<TileKey>
    private val leafKeySet: Set<TileKey>
    private val maxZoom: Int

    private val lock = ReentrantLock()
    private val cache = HashMap<TileKey, MapTile>()
    private val recentKeys = ArrayList<TileKey>()  // least recently used first
    private val CACHE_CAPACITY = 64

    init {
        val file = File(Dataset.instance.localDir, "tiles_manifest.bin")
        val entries = TileManifest.readBinary(file)
        siteCount = entries.filter { it.isLeaf }.sumOf { it.siteCount }
        store = TileStore(entries)

        tileKeySet = entries.map { it.key }.toSet()
        leafKeySet = entries.filter { it.isLeaf }.map { it.key }.toSet()
        maxZoom = entries.maxOfOrNull { it.key.z } ?: 0
    }

    private fun getTile(key: TileKey): MapTile {
        lock.withLock {
            val tile = cache[key]
            if (tile != null) {
                recentKeys.remove(key)
                recentKeys.add(key)
                return tile
            }

            // the file can be missing if the system cleared the caches directory
            val file = store.getFile(key)
            if (file == null) { return MapTile(false, emptyList()) }
            val profiler = Profiler("load tile $key")
            val newTile = MapTile.readBinary(file)
            profiler.stop()
            cache[key] = newTile
            recentKeys.add(key)
            if (recentKeys.size > CACHE_CAPACITY) {
                val evicted = recentKeys.removeAt(0)
                cache.remove(evicted)
                println("unload tile $evicted")
            }
            println("tile cache: ${cache.size} tiles")
            return newTile
        }
    }
}
