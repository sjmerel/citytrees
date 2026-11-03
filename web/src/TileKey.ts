export class TileKey {
    static readonly root = new TileKey(0, 0, 0);

    constructor(readonly z: number, readonly x: number, readonly y: number) {}

    get id(): string { return `${this.z}/${this.x}/${this.y}`; }
    get path(): string { return `${this.id}.bin`; }
    get parent(): TileKey { return new TileKey(this.z - 1, Math.floor(this.x / 2), Math.floor(this.y / 2)); }

    static compare(a: TileKey, b: TileKey): number {
        return a.z - b.z || a.x - b.x || a.y - b.y;
    }
}
