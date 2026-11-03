import { BinaryReader } from './BinaryReader';

export class TreeType {
    colorIndex = 0;

    constructor(
        readonly canonicalName: string,
        readonly commonNames: string[],
        readonly wikipediaUrl: string | undefined,
    ) {}

    get color(): string { return TreeType.palette[this.colorIndex % TreeType.palette.length]; }

    static readBinary(data: ArrayBuffer): TreeType[] {
        const reader = new BinaryReader(data);
        const count = reader.readUInt32();
        const types: TreeType[] = [];
        const genera = new Map<string, number>();
        for (let i = 0; i < count; i++) {
            const name = reader.readString(reader.readUInt16());
            const commonCount = reader.readUInt8();
            const commonNames: string[] = [];
            for (let j = 0; j < commonCount; j++) {
                commonNames.push(reader.readString(reader.readUInt16()));
            }
            const url = reader.readString(reader.readUInt16());
            const type = new TreeType(name, commonNames, url ? `https://en.wikipedia.org/wiki/${url}` : undefined);
            const genus = name.split(' ')[0];
            if (!genera.has(genus)) { genera.set(genus, genera.size); }
            type.colorIndex = genera.get(genus)!;
            types.push(type);
        }
        reader.finish();
        return types;
    }

    private static readonly palette = [
        [0.90 * 255, 0.10 * 255, 0.10 * 255], [255, 0.55 * 255, 0],
        [0.12 * 255, 0.35 * 255, 255], [0.90 * 255, 0, 0.80 * 255],
        [0, 0.78 * 255, 0.90 * 255], [0.50 * 255, 0.15 * 255, 0.85 * 255],
        [0.10 * 255, 0.75 * 255, 0.20 * 255], [255, 0.20 * 255, 0.47 * 255],
        [0, 0.58 * 255, 0.50 * 255], [0.63 * 255, 0.31 * 255, 0.08 * 255],
        [0.60 * 255, 0.86 * 255, 0], [0.90 * 255, 0.70 * 255, 0],
        [92, 2, 2], [102, 56, 0], [3, 31, 102], [92, 0, 82],
        [0, 80, 102], [47, 8, 102], [3, 77, 15], [102, 12, 42],
        [0, 61, 48], [66, 30, 3], [63, 92, 0], [92, 71, 0],
        [247, 177, 177], [255, 217, 166], [184, 200, 255], [247, 177, 239],
        [166, 239, 247], [208, 177, 240], [166, 233, 172], [255, 179, 202],
        [166, 219, 211], [216, 179, 154], [217, 240, 166], [247, 227, 166],
    ].map(rgb => `rgb(${rgb.map(Math.round).join(', ')})`);
}
