import Foundation

class BinaryReader {

    init(url: URL) {
        self.data = try! Data(contentsOf: url, options: .mappedIfSafe)
    }

    var isAtEnd: Bool {
        offset == data.count
    }

    func readUInt8() -> UInt8 {
        assert(offset <= data.count - 1)
        defer { offset += 1 }
        return data[data.startIndex + offset]
    }

    func readUInt16() -> UInt16 {
        assert(offset <= data.count - 2)
        defer { offset += 2 }
        return data.withUnsafeBytes { bytes in
            UInt16(littleEndian: bytes.loadUnaligned(fromByteOffset: offset, as: UInt16.self))
        }
    }

    func readUInt32() -> UInt32 {
        assert(offset <= data.count - 4)
        defer { offset += 4 }
        return data.withUnsafeBytes { bytes in
            UInt32(littleEndian: bytes.loadUnaligned(fromByteOffset: offset, as: UInt32.self))
        }
    }

    func readUInt64() -> UInt64 {
        assert(offset <= data.count - 8)
        defer { offset += 8 }
        return data.withUnsafeBytes { bytes in
            UInt64(littleEndian: bytes.loadUnaligned(fromByteOffset: offset, as: UInt64.self))
        }
    }

    func readDouble() -> Double {
        assert(offset <= data.count - 8)
        defer { offset += 8 }
        return data.withUnsafeBytes { bytes in
            let bitPattern = UInt64(littleEndian: bytes.loadUnaligned(fromByteOffset: offset, as: UInt64.self))
            return Double(bitPattern: bitPattern)
        }
    }

    func readString(count: Int) -> String {
        assert(count >= 0 && count <= data.count - offset)
        defer { offset += count }
        return String(data: data[offset..<(offset + count)], encoding: .utf8)!
    }


    ////////////////////////////////////////

    private let data: Data
    private var offset = 0

}
