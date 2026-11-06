import { MapTile } from './MapTile';
import { TileKey } from './TileKey';
import { TileManifest, type TileManifestEntry } from './TileManifest';
import { TreeType } from './TreeType';

export interface City {
    name: string;
    state?: string | null;
    country: string;
    license?: License | string | null;
}

export interface License {
    url?: string | null;
    api_url?: string | null;
    portal_url?: string | null;
    dataset_name?: string | null;
    attribution_name?: string | null;
    license?: string | null;
    license_name?: string | null;
    terms_url?: string | null;
    notices?: string[] | null;
    attribution_url?: string | null;
    last_updated?: string | null;
}

export class Dataset {
    private constructor(
        readonly timestamp: string,
        readonly serverDir: URL,
        readonly types: TreeType[],
        readonly entries: TileManifestEntry[],
        readonly cities: City[],
        readonly rootTile: MapTile,
        private readonly cache: Cache | undefined,
    ) {}

    static async load(serverUrl: URL): Promise<Dataset> {
        const latestUrl = new URL('latest.txt', serverUrl);
        latestUrl.searchParams.set('request', crypto.randomUUID());
        const latest = await this.download(latestUrl, 'no-store');
        const timestamp = (await latest.text()).trim();
        if (!/^\d{8}-\d{6}$/.test(timestamp)) { throw new Error('Invalid dataset timestamp.'); }
        const serverDir = new URL(`${timestamp}/`, serverUrl);
        const cachePrefix = `city-trees:${serverUrl.href}:`;
        const cacheName = `${cachePrefix}${timestamp}`;
        let cache: Cache | undefined;
        if (globalThis.caches) {
            try {
                cache = await caches.open(cacheName);
            }
            catch (error) {
                console.warn('Browser storage unavailable; dataset downloads will not be saved.', error);
            }
        }

        const [typeData, manifestData, cityData, rootData] = await Promise.all(
            ['types.bin', 'tiles_manifest.bin', 'cities.json', TileKey.root.path]
                .map(path => this.readFile(new URL(path, serverDir), cache)),
        );
        const types = TreeType.readBinary(typeData);
        const entries = TileManifest.readBinary(manifestData);
        const cities: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(cityData));
        if (!Array.isArray(cities) || !cities.every(this.validCity)) {
            throw new Error('Invalid city data.');
        }
        const rootTile = MapTile.readBinary(rootData, types.length);
        this.validateTile(rootTile, rootData, entries.find(entry => entry.key.id === TileKey.root.id)!);
        if (cache) {
            try {
                for (const name of await caches.keys()) {
                    if (name.startsWith(cachePrefix) && name !== cacheName) { await caches.delete(name); }
                }
            }
            catch (error) {
                console.warn('Could not remove older browser dataset caches.', error);
            }
        }
        return new Dataset(timestamp, serverDir, types, entries, cities, rootTile, cache);
    }

    async loadTile(entry: TileManifestEntry): Promise<MapTile> {
        const data = await Dataset.readFile(new URL(entry.key.path, this.serverDir), this.cache);
        const tile = MapTile.readBinary(data, this.types.length);
        Dataset.validateTile(tile, data, entry);
        return tile;
    }

    private static validCity(value: unknown): value is City {
        return typeof value === 'object' && value !== null &&
            'name' in value && typeof value.name === 'string' &&
            'country' in value && typeof value.country === 'string' &&
            (!('state' in value) || value.state == null || typeof value.state === 'string') &&
            (!('license' in value) || value.license == null ||
                typeof value.license === 'string' || Dataset.validLicense(value.license));
    }

    private static validLicense(value: unknown): value is License {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            return false;
        }
        if (!('api_url' in value && typeof value.api_url === 'string') &&
            !('url' in value && typeof value.url === 'string')) {
            return false;
        }
        if ('notices' in value && value.notices != null &&
            (!Array.isArray(value.notices) || !value.notices.every(notice => typeof notice === 'string'))) {
            return false;
        }
        const fields = ['url', 'api_url', 'portal_url', 'dataset_name', 'attribution_name', 'license', 'license_name', 'terms_url',
            'attribution_url', 'last_updated'];
        return Object.entries(value).every(([key, field]) =>
            !fields.includes(key) || field == null || typeof field === 'string');
    }

    private static validateTile(tile: MapTile, data: ArrayBuffer, entry: TileManifestEntry) {
        if (data.byteLength !== entry.byteCount || tile.sites.length !== entry.siteCount || tile.isLeaf !== entry.isLeaf) {
            throw new Error(`Tile ${entry.key.id} does not match the manifest.`);
        }
    }

    private static async download(url: URL, cache: RequestCache = 'default'): Promise<Response> {
        const response = await fetch(url, { cache });
        if (!response.ok) { throw new Error(`Could not download ${url.pathname}: HTTP ${response.status}.`); }
        return response;
    }

    private static async readFile(url: URL, cache: Cache | undefined): Promise<ArrayBuffer> {
        if (cache) {
            try {
                const cached = await cache.match(url.href);
                if (cached) { return await cached.arrayBuffer(); }
            }
            catch (error) {
                console.warn('Could not read the browser dataset cache.', error);
            }
        }
        const response = await this.download(url);
        const data = await response.arrayBuffer();
        if (cache) {
            try {
                await cache.put(url.href, new Response(data));
                // Cache Storage does not evict automatically. Keep downloads bounded per version.
                const keys = await cache.keys();
                for (const key of keys.slice(0, Math.max(0, keys.length - 128))) {
                    await cache.delete(key);
                }
            }
            catch (error) {
                console.warn('Could not save the browser dataset cache.', error);
            }
        }
        return data;
    }
}
