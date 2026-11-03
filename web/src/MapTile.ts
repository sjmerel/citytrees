import { BinaryReader } from './BinaryReader';
import type { WorldLocation } from './Mercator';

export interface Site {
    location: WorldLocation;
    typeIndex: number;
}

export class MapTile {
    constructor(readonly isLeaf: boolean, readonly sites: Site[]) {}

    static readBinary(data: ArrayBuffer, typeCount: number): MapTile {
        const reader = new BinaryReader(data);
        const flags = reader.readUInt8();
        const shift = reader.readUInt8();
        const count = reader.readUInt32();
        const minX = reader.readUInt32();
        const minY = reader.readUInt32();
        if (shift > 32 || data.byteLength !== 14 + count * 6) {
            throw new Error('Invalid map tile header.');
        }
        const sites: Site[] = [];
        for (let i = 0; i < count; i++) {
            // Bitwise shifts would truncate unsigned world coordinates to signed 32-bit integers.
            const x = Math.min(minX + reader.readUInt16() * 2 ** shift, 0xFFFFFFFF);
            const y = Math.min(minY + reader.readUInt16() * 2 ** shift, 0xFFFFFFFF);
            const typeIndex = reader.readUInt16();
            if (typeIndex >= typeCount) { throw new Error('Invalid tree type index.'); }
            sites.push({ location: { x, y }, typeIndex });
        }
        reader.finish();
        return new MapTile((flags & 1) !== 0, sites);
    }
}
