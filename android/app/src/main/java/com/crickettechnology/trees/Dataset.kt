package com.crickettechnology.trees

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.withContext
import okhttp3.CacheControl
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.net.URL
import java.nio.file.Files

class Dataset private constructor() {

    companion object {
        val instance = Dataset()
    }

    val localDir: File
        get() { return getLocalDir(timestamp!!) }

    val serverDir: URL
        get() { return getServerDir(timestamp!!) }

    val tileCacheDir: File
        get() { return File(TreesApplication.context.cacheDir, "tiles") }


    suspend fun checkForNewData() {
        val dataset = this
        withContext(Dispatchers.IO) {
            val timestampUrl = Config.instance.serverUrl.appendingPathComponent("latest.txt")
            val timestampData = download(timestampUrl)

            val newTimestamp = String(timestampData, Charsets.UTF_8).trim()
            val oldTimestamp = dataset.timestamp

            if (newTimestamp != oldTimestamp) {
                val newLocalDir = getLocalDir(newTimestamp)
                if (newLocalDir.exists()) {
                    removeItem(newLocalDir)
                }
                Files.createDirectories(newLocalDir.toPath())

                val serverDir = getServerDir(newTimestamp)

                // download required files
                val paths = listOf("types.bin", "tiles_manifest.bin", "cities.json", "0/0/0.bin")
                val downloads = paths.map { path ->
                    async {
                        download(serverDir, newLocalDir, path)
                    }
                }
                downloads.awaitAll()

                // clear old cached tiles
                if (tileCacheDir.exists()) {
                    removeItem(tileCacheDir)
                }

                dataset.timestamp = newTimestamp

                // remove old downloaded files
                if (oldTimestamp != null) {
                    val oldLocalDir = getLocalDir(oldTimestamp)
                    removeItem(oldLocalDir)
                }
            }
        }
    }

    ////////////////////////////////////////

    private val client = OkHttpClient()

    private var timestamp: String?
        get() { return TreesApplication.defaults.getString("timestamp", null) }
        set(value) { TreesApplication.defaults.edit().putString("timestamp", value).apply() }

    // filesDir is already private to the app, so unlike iOS, no bundle id directory is needed
    private fun getLocalDir(timestamp: String): File {
        return File(TreesApplication.context.filesDir, timestamp)
    }

    private fun getServerDir(timestamp: String): URL {
        return Config.instance.serverUrl.appendingPathComponent(timestamp)
    }


    private fun download(url: URL): ByteArray {
        val request = Request.Builder().url(url).cacheControl(CacheControl.FORCE_NETWORK).build()
        client.newCall(request).execute().use { response ->
            if (response.code != 200) {
                throw TreesError("Couldn’t download data.")
            }
            return response.body.bytes()
        }
    }

    private fun download(fromDir: URL, toDir: File, path: String) {
        val fromUrl = fromDir.appendingPathComponent(path)
        val toFile = File(toDir, path)
        Files.createDirectories(toFile.parentFile!!.toPath())
        val data = download(fromUrl)
        toFile.writeBytesAtomically(data)
    }

    // Android-specific: counterpart of FileManager.removeItem, which throws on failure
    private fun removeItem(file: File) {
        if (!file.deleteRecursively()) {
            throw TreesError("Couldn't remove $file")
        }
    }
}
