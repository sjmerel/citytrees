import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { BinaryReader } from '../src/BinaryReader';
import { Dataset } from '../src/Dataset';
import { MapTile } from '../src/MapTile';
import { Mercator, QuantizedWorldLocation } from '../src/Mercator';
import { TileDb } from '../src/TileDb';
import { TileKey } from '../src/TileKey';
import { TileManifest, type TileManifestEntry } from '../src/TileManifest';
import { TreeType } from '../src/TreeType';

class Writer {
    private bytes: number[] = [];
    uint(value: number, size: number): this {
        for (let i = 0; i < size; i++) { this.bytes.push(Math.floor(value / 2 ** (i * 8)) % 256); }
        return this;
    }
    string(value: string): this {
        const bytes = new TextEncoder().encode(value);
        this.uint(bytes.length, 2);
        this.bytes.push(...bytes);
        return this;
    }
    get data(): ArrayBuffer { return new Uint8Array(this.bytes).buffer; }
}

function typeData(): ArrayBuffer {
    return new Writer().uint(3, 4)
        .string('Acer rubrum').uint(1, 1).string('Red maple').string('Acer_rubrum')
        .string('Quercus alba').uint(0, 1).string('')
        .string('Acer saccharum').uint(0, 1).string('').data;
}

function tileData(leaf: boolean, x = 0x80000000, y = 0x80000000, shift = 0, dx = 0): ArrayBuffer {
    return new Writer().uint(leaf ? 1 : 0, 1).uint(shift, 1).uint(1, 4)
        .uint(x, 4).uint(y, 4).uint(dx, 2).uint(0, 2).uint(0, 2).data;
}

function manifestData(entries: TileManifestEntry[]): ArrayBuffer {
    const writer = new Writer().uint(entries.length, 4);
    for (const entry of entries) {
        writer.uint(entry.key.z, 1).uint(entry.key.x, 4).uint(entry.key.y, 4)
            .uint(entry.isLeaf ? 1 : 0, 1).uint(entry.siteCount, 4).uint(entry.byteCount, 4);
    }
    return writer.data;
}

function entry(key: TileKey, isLeaf: boolean): TileManifestEntry {
    return { key, isLeaf, siteCount: 1, byteCount: 20 };
}

function mockServer(t: TestContext, entries = [entry(TileKey.root, true)]) {
    const timestamp = '20261102-161137';
    const files = new Map<string, ArrayBuffer | string>([
        ['/v1/latest.txt', timestamp],
        [`/v1/${timestamp}/types.bin`, typeData()],
        [`/v1/${timestamp}/tiles_manifest.bin`, manifestData(entries)],
        [`/v1/${timestamp}/cities.json`, '[{"name":"Test City","country":"US"}]'],
        [`/v1/${timestamp}/0/0/0.bin`, tileData(entries[0].isLeaf)],
    ]);
    const requests: { url: URL; cache: RequestCache | undefined }[] = [];
    t.mock.method(globalThis, 'fetch', async (input: URL | string, init?: RequestInit) => {
        const url = new URL(input);
        requests.push({ url, cache: init?.cache });
        const file = files.get(url.pathname);
        return new Response(file ?? 'Not found', { status: file === undefined ? 404 : 200 });
    });
    return { requests, files, timestamp, serverUrl: new URL('https://example.test/v1/') };
}

test('binary readers preserve little-endian unsigned coordinates and UTF-8', () => {
    const data = new Writer().uint(0xFE, 1).uint(0xABCD, 2).uint(0xF1234567, 4).string('× érable').data;
    const reader = new BinaryReader(data);
    assert.equal(reader.readUInt8(), 0xFE);
    assert.equal(reader.readUInt16(), 0xABCD);
    assert.equal(reader.readUInt32(), 0xF1234567);
    assert.equal(reader.readString(reader.readUInt16()), '× érable');
    reader.finish();
    assert.throws(() => reader.readUInt8());
    assert.throws(() => new BinaryReader(new Uint8Array([0xFF]).buffer).readString(1));
});

test('tree types decode names and Wikipedia suffixes and share colors by genus', () => {
    const types = TreeType.readBinary(typeData());
    assert.deepEqual(types[0].commonNames, ['Red maple']);
    assert.equal(types[0].wikipediaUrl, 'https://en.wikipedia.org/wiki/Acer_rubrum');
    assert.equal(types[1].wikipediaUrl, undefined);
    assert.equal(types[0].color, types[2].color);
    assert.notEqual(types[0].color, types[1].color);
    assert.throws(() => TreeType.readBinary(typeData().slice(0, -1)));
});

test('tile decoding does not overflow signed shifts and saturates at UInt32.max', () => {
    assert.equal(MapTile.readBinary(tileData(true, 0x80000000, 0, 16, 0x7FFF), 1).sites[0].location.x, 0xFFFF0000);
    assert.equal(MapTile.readBinary(tileData(true, 0xFFFFFFFE, 0, 4, 1), 1).sites[0].location.x, 0xFFFFFFFF);
    assert.throws(() => MapTile.readBinary(tileData(true), 0), /type index/);
    assert.throws(() => MapTile.readBinary(tileData(true).slice(0, -1), 1), /header/);
});

test('manifest rejects missing roots and duplicate tile keys', () => {
    const root = entry(TileKey.root, false);
    assert.equal(TileManifest.readBinary(manifestData([root]))[0].key.id, '0/0/0');
    assert.throws(() => TileManifest.readBinary(manifestData([])), /root/);
    assert.throws(() => TileManifest.readBinary(manifestData([root, root])), /entry/);
});

test('Mercator round trips locations and quantization retains unsigned values', () => {
    for (const location of [{ lat: 34.05, lon: -118.25 }, { lat: -37.8, lon: 145 }, { lat: 0, lon: 0 }]) {
        const restored = Mercator.unproject(Mercator.project(location));
        assert.ok(Math.abs(restored.lat - location.lat) < 1e-10);
        assert.ok(Math.abs(restored.lon - location.lon) < 1e-10);
    }
    assert.deepEqual(QuantizedWorldLocation.quantize({ x: 1, y: -1 }), { x: 0xFFFFFFFF, y: 0 });
});

test('dataset checks use distinct no-store URLs and load versioned startup files', async t => {
    const server = mockServer(t);
    const first = await Dataset.load(server.serverUrl);
    await Dataset.load(server.serverUrl);
    const checks = server.requests.filter(request => request.url.pathname.endsWith('latest.txt'));
    assert.equal(checks.length, 2);
    assert.notEqual(checks[0].url.search, checks[1].url.search);
    assert.equal(checks[0].cache, 'no-store');
    assert.equal(first.timestamp, server.timestamp);
    assert.equal(first.types.length, 3);
    assert.equal(first.cities[0].name, 'Test City');
    assert.equal(first.rootTile.sites.length, 1);
    assert.ok(server.requests.filter(request => !request.url.pathname.endsWith('latest.txt'))
        .every(request => request.url.search === ''));
});

test('browser cache reuses versioned files, limits entries, and removes previous versions only after loading', async t => {
    const server = mockServer(t);
    const storage = new Map<string, Map<string, Response>>();
    const prefix = `city-trees:${server.serverUrl.href}:`;
    storage.set(`${prefix}20261101-120000`, new Map());
    storage.set('another-app', new Map());
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'caches');
    Object.defineProperty(globalThis, 'caches', {
        configurable: true,
        value: {
            async open(name: string) {
                if (!storage.has(name)) { storage.set(name, new Map()); }
                const values = storage.get(name)!;
                return {
                    async match(url: string) { return values.get(url)?.clone(); },
                    async put(url: string, response: Response) { values.set(url, response.clone()); },
                    async keys() { return Array.from(values.keys(), url => new Request(url)); },
                    async delete(request: Request) { return values.delete(request.url); },
                };
            },
            async keys() { return Array.from(storage.keys()); },
            async delete(name: string) { return storage.delete(name); },
        },
    });
    t.after(() => {
        if (descriptor) { Object.defineProperty(globalThis, 'caches', descriptor); }
        else { Reflect.deleteProperty(globalThis, 'caches'); }
    });
    const key = new TileKey(1, 0, 0);
    server.files.set(`/v1/${server.timestamp}/${key.path}`, tileData(true));
    const dataset = await Dataset.load(server.serverUrl);
    const firstCount = server.requests.length;
    await Dataset.load(server.serverUrl);
    assert.equal(server.requests.length, firstCount + 1);
    assert.ok(!storage.has(`${prefix}20261101-120000`));
    assert.ok(storage.has('another-app'));
    const current = storage.get(`${prefix}${server.timestamp}`)!;
    for (let i = 0; i < 130; i++) {
        current.set(`https://example.test/unused/${i}`, new Response('cached'));
    }
    await dataset.loadTile(entry(key, true));
    assert.equal(current.size, 128);
});

test('tile lookup uses a leaf ancestor and nearest-site search respects the distance limit', async t => {
    const server = mockServer(t);
    const db = new TileDb(await Dataset.load(server.serverUrl));
    const rect = { minX: 0.49, minY: 0.49, maxX: 0.51, maxY: 0.51 };
    assert.equal(db.tiles(rect, 20).length, 1);
    assert.equal(db.siteCount, 1);
    assert.ok(db.findNearest({ lat: 0, lon: 0 }, 20, 20));
    assert.equal(db.findNearest({ lat: 1, lon: 1 }, 20, 20), undefined);
});

test('missing child tiles use a deduplicated root sample until downloads finish', async t => {
    const children = [new TileKey(1, 0, 0), new TileKey(1, 1, 0)];
    const server = mockServer(t, [entry(TileKey.root, false), ...children.map(key => entry(key, true))]);
    for (const key of children) { server.files.set(`/v1/${server.timestamp}/${key.path}`, tileData(true)); }
    const db = new TileDb(await Dataset.load(server.serverUrl));
    const rect = { minX: 0, minY: 0, maxX: 0.99, maxY: 0.49 };
    assert.equal(db.tiles(rect, 1).length, 1);
    await new Promise<void>(resolve => { db.store.onTilesDownloaded = resolve; });
    assert.equal(db.tiles(rect, 1).length, 2);
    assert.equal(db.tiles({ minX: 0, minY: 0.6, maxX: 0.9, maxY: 0.9 }, 1).length, 0);
});

test('download failures are reported and backed off without losing the root fallback', async t => {
    const key = new TileKey(1, 0, 0);
    const server = mockServer(t, [entry(TileKey.root, false), entry(key, true)]);
    const db = new TileDb(await Dataset.load(server.serverUrl));
    t.mock.method(console, 'error', () => {});
    const failed = new Promise<boolean>(resolve => { db.store.onDownloadFailedChanged = resolve; });
    const rect = { minX: 0, minY: 0, maxX: 0.4, maxY: 0.4 };
    assert.equal(db.tiles(rect, 1).length, 1);
    assert.equal(await failed, true);
    const count = server.requests.length;
    assert.equal(db.tiles(rect, 1).length, 1);
    assert.equal(server.requests.length, count);
});
