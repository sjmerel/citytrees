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
        [255, 126, 87], [229, 0, 0], [255, 155, 0], [202, 47, 0],
        [200, 189, 0], [135, 111, 0], [91, 214, 88], [0, 144, 0],
        [0, 222, 186], [0, 154, 114], [0, 212, 255], [0, 137, 209],
        [60, 187, 255], [0, 97, 255], [178, 158, 255], [113, 45, 255],
        [242, 133, 255], [180, 0, 201], [255, 119, 180], [219, 0, 107],
    ].map(rgb => `rgb(${rgb.map(Math.round).join(', ')})`);
}
