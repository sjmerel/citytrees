export class BinaryReader {
    private readonly view: DataView;
    private offset = 0;
    private readonly decoder = new TextDecoder('utf-8', { fatal: true });

    constructor(private readonly data: ArrayBuffer) {
        this.view = new DataView(data);
    }

    get isAtEnd(): boolean { return this.offset === this.data.byteLength; }

    readUInt8(): number {
        const value = this.view.getUint8(this.offset);
        this.offset += 1;
        return value;
    }

    readUInt16(): number {
        const value = this.view.getUint16(this.offset, true);
        this.offset += 2;
        return value;
    }

    readUInt32(): number {
        const value = this.view.getUint32(this.offset, true);
        this.offset += 4;
        return value;
    }

    readString(count: number): string {
        const bytes = new Uint8Array(this.data, this.offset, count);
        this.offset += count;
        return this.decoder.decode(bytes);
    }

    finish() {
        if (!this.isAtEnd) { throw new Error('Unexpected trailing binary data.'); }
    }
}
