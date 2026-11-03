import { BinaryReader } from './BinaryReader';
import { TileKey } from './TileKey';

export interface TileManifestEntry {
    key: TileKey;
    isLeaf: boolean;
    siteCount: number;
    byteCount: number;
}

export class TileManifest {
    static readBinary(data: ArrayBuffer): TileManifestEntry[] {
        const reader = new BinaryReader(data);
        const count = reader.readUInt32();
        if (data.byteLength !== 4 + count * 18) { throw new Error('Invalid tile manifest size.'); }
        const entries: TileManifestEntry[] = [];
        const ids = new Set<string>();
        for (let i = 0; i < count; i++) {
            const key = new TileKey(reader.readUInt8(), reader.readUInt32(), reader.readUInt32());
            const isLeaf = reader.readUInt8() !== 0;
            const siteCount = reader.readUInt32();
            const byteCount = reader.readUInt32();
            if (key.z > 32 || key.x >= 2 ** key.z || key.y >= 2 ** key.z ||
                ids.has(key.id) || byteCount !== 14 + siteCount * 6) {
                throw new Error('Invalid tile manifest entry.');
            }
            ids.add(key.id);
            entries.push({ key, isLeaf, siteCount, byteCount });
        }
        if (!ids.has(TileKey.root.id)) { throw new Error('Tile manifest has no root tile.'); }
        reader.finish();
        return entries;
    }
}
