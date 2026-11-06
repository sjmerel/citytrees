package com.crickettechnology.citytrees

import java.io.File
import java.net.URL
import java.nio.file.Files
import java.nio.file.StandardCopyOption

// Android-specific helpers for Foundation methods that have no direct Java equivalent.

// counterpart of URL.appendingPathComponent
fun URL.appendingPathComponent(path: String): URL {
    return URL(toString().trimEnd('/') + "/" + path)
}

// counterpart of Data.write(to:options: .atomic)
fun File.writeBytesAtomically(data: ByteArray) {
    val temp = File(parentFile, "$name.tmp")
    temp.writeBytes(data)
    Files.move(temp.toPath(), toPath(), StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING)
}
