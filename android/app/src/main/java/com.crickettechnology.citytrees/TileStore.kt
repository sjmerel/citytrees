package com.crickettechnology.citytrees

import android.os.Handler
import android.os.Looper
import okhttp3.Call
import okhttp3.Callback
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import java.io.File
import java.io.IOException
import java.util.concurrent.locks.ReentrantLock
import kotlin.concurrent.withLock

// Finds tile files for TileDb: bundled tiles first, then tiles downloaded earlier into the
// caches directory, and downloads missing ones in the background. Safe to use from any thread.
//
// Dataset clears the cache directory when a new data version is found, so cached tiles always
// belong to the current version.
class TileStore(entries: List<TileManifestEntry>) {

    // Called on the main thread, shortly after tiles were downloaded.
    var onTilesDownloaded: (() -> Unit)? = null

    // Called on the main thread with true when a download fails, and false when one next succeeds.
    var onDownloadFailedChanged: ((Boolean) -> Unit)? = null

    // The file holding the tile, if it is available now. Otherwise starts a download (if the
    // tile exists) and returns null.
    fun getFile(key: TileKey): File? {
        if (key == TileKey.root) {
            return File(Dataset.instance.localDir, key.path)
        }
        val entry = entryMap[key]
        if (entry != null) {
            val cached = getCacheFile(entry)
            if (cached.exists()) {
                return cached
            }
            else {
                request(entry)
                return null
            }
        }
        else {
            return null
        }
    }


    ////////////////////////////////////////

    private val MAX_CONCURRENT = 4
    private val MAX_PENDING = 64
    private val RETRY_DELAY_MS = 30_000L
    private val NOTIFY_DELAY_MS = 1_000L

    private val entryMap: Map<TileKey, TileManifestEntry> = entries.associateBy { it.key }
    private val cacheDir: File = Dataset.instance.tileCacheDir
    private val client = OkHttpClient()
    private val mainHandler = Handler(Looper.getMainLooper())

    private val lock = ReentrantLock()
    private val pending = ArrayList<TileKey>()  // most recently requested last
    private val inFlight = HashSet<TileKey>()
    private val retryAfter = HashMap<TileKey, Long>()  // System.currentTimeMillis()
    private var notifyScheduled = false
    private var downloadFailed = false

    // must follow the property declarations, which are initialized in order
    init {
        cacheDir.mkdirs()
    }

    private fun getCacheFile(entry: TileManifestEntry): File {
        val key = entry.key
        return File(cacheDir, "${key.z}_${key.x}_${key.y}.bin")
    }

    private fun request(entry: TileManifestEntry) {
        lock.withLock {
            val key = entry.key
            if (inFlight.contains(key)) { return }
            val retry = retryAfter[key]
            if (retry != null && retry > System.currentTimeMillis()) { return }

            // Most recently requested tiles are the ones on screen now, so they go first.
            pending.remove(key)
            pending.add(key)
            if (pending.size > MAX_PENDING) {
                pending.subList(0, pending.size - MAX_PENDING).clear()
            }
            startDownloads()
        }
    }

    // Lock must be held.
    private fun startDownloads() {
        while (inFlight.size < MAX_CONCURRENT && pending.isNotEmpty()) {
            val key = pending.removeAt(pending.size - 1)
            val entry = entryMap[key]
            if (entry != null) {
                inFlight.add(key)
                println("tile $key: download started (${entry.byteCount} bytes)")
                val request = Request.Builder().url(Dataset.instance.serverDir.appendingPathComponent(key.path)).build()
                client.newCall(request).enqueue(object : Callback {
                    override fun onFailure(call: Call, e: IOException) {
                        finish(entry, null, 0, e)
                    }

                    override fun onResponse(call: Call, response: Response) {
                        var data: ByteArray? = null
                        var error: IOException? = null
                        try {
                            data = response.body.bytes()
                        }
                        catch (e: IOException) {
                            error = e
                        }
                        response.close()
                        finish(entry, data, response.code, error)
                    }
                })
            }
        }
    }

    private fun finish(entry: TileManifestEntry, data: ByteArray?, statusCode: Int, error: IOException?) {
        var succeeded = false
        if (data != null && error == null && statusCode == 200) {
            if (data.size == entry.byteCount) {
                try {
                    getCacheFile(entry).writeBytesAtomically(data)
                    succeeded = true
                    println("tile ${entry.key}: download finished")
                }
                catch (e: IOException) {
                    println("tile ${entry.key}: can't write: $e")
                }
            }
            else {
                println("tile ${entry.key}: downloaded data doesn't match the manifest")
            }
        }
        else {
            println("tile ${entry.key}: download failed: ${error?.message ?: "HTTP $statusCode"}")
        }

        lock.lock()
        inFlight.remove(entry.key)
        if (succeeded) {
            retryAfter.remove(entry.key)
        }
        else {
            retryAfter[entry.key] = System.currentTimeMillis() + RETRY_DELAY_MS
        }
        startDownloads()
        val notify = succeeded && !notifyScheduled
        if (notify) { notifyScheduled = true }
        val failedChanged = downloadFailed == succeeded
        downloadFailed = !succeeded
        lock.unlock()

        if (failedChanged) {
            mainHandler.post {
                onDownloadFailedChanged?.invoke(!succeeded)
            }
        }

        if (notify) {
            // batches the tiles that finish close together into a single redraw
            mainHandler.postDelayed({
                lock.withLock {
                    notifyScheduled = false
                }
                onTilesDownloaded?.invoke()
            }, NOTIFY_DELAY_MS)
        }
    }
}
