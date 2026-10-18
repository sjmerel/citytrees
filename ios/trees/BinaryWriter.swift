import Foundation

class BinaryWriter {

    func writeUInt16(_ value: UInt16) {
        withUnsafeBytes(of: value.littleEndian) { data.append(contentsOf: $0) }
    }

    func writeUInt32(_ value: UInt32) {
        withUnsafeBytes(of: value.littleEndian) { data.append(contentsOf: $0) }
    }

    func writeDouble(_ value: Double) {
        withUnsafeBytes(of: value.bitPattern.littleEndian) { data.append(contentsOf: $0) }
    }

    // Writes the raw UTF-8 bytes with no length prefix; returns the byte count
    // so callers can write the length (see BinaryReader.readString(count:)).
    @discardableResult
    func writeString(_ string: String) -> Int {
        let bytes = Data(string.utf8)
        data.append(bytes)
        return bytes.count
    }

    func write(to url: URL) throws {
        try data.write(to: url)
    }


    ////////////////////////////////////////

    private var data = Data()
}
