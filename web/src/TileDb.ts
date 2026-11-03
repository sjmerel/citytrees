import { Dataset } from './Dataset';
import { MapTile, type Site } from './MapTile';
import { Mercator, QuantizedWorldLocation, type MapLocation, type WorldRect } from './Mercator';
import { TileKey } from './TileKey';
import { TileStore } from './TileStore';

export class TileDb {
    readonly siteCount: number;
    readonly store: TileStore;
    private readonly tileKeys: Set<string>;
    private readonly leafKeys: Set<string>;
    private readonly maxZoom: number;

    constructor(dataset: Dataset) {
        this.store = new TileStore(dataset);
        this.siteCount = dataset.entries.filter(entry => entry.isLeaf).reduce((sum, entry) => sum + entry.siteCount, 0);
        this.tileKeys = new Set(dataset.entries.map(entry => entry.key.id));
        this.leafKeys = new Set(dataset.entries.filter(entry => entry.isLeaf).map(entry => entry.key.id));
        this.maxZoom = dataset.entries.reduce((max, entry) => Math.max(max, entry.key.z), 0);
    }

    tiles(rect: WorldRect, zoom: number): MapTile[] {
        const z = Math.min(Math.max(Math.floor(zoom), 0), this.maxZoom);
        const count = 2 ** z;
        const index = (fraction: number) => Math.min(Math.max(Math.floor(fraction * count), 0), count - 1);
        const keys = new Map<string, TileKey>();
        for (let y = index(rect.minY); y <= index(rect.maxY); y++) {
            for (let x = index(rect.minX); x <= index(rect.maxX); x++) {
                let key = new TileKey(z, x, y);
                if (this.tileKeys.has(key.id)) {
                    keys.set(key.id, key);
                }
                else {
                    while (key.z > 0) {
                        key = key.parent;
                        if (this.leafKeys.has(key.id)) {
                            keys.set(key.id, key);
                            break;
                        }
                    }
                }
            }
        }

        const available = new Map<string, { key: TileKey; tile: MapTile }>();
        for (let key of keys.values()) {
            let tile = this.store.getTile(key);
            while (!tile && key.z > 0) {
                key = key.parent;
                tile = this.store.getTile(key);
            }
            if (!tile) { throw new Error('Root tile is unavailable.'); }
            available.set(key.id, { key, tile });
        }
        return Array.from(available.values())
            .sort((a, b) => TileKey.compare(a.key, b.key))
            .map(value => value.tile);
    }

    findNearest(location: MapLocation, maxDistance: number, zoom: number): Site | undefined {
        const center = Mercator.project(location);
        const radius = maxDistance / Mercator.metersPerUnit(location.lat);
        const rect = {
            minX: center.x - radius, minY: center.y - radius,
            maxX: center.x + radius, maxY: center.y + radius,
        };
        let best: Site | undefined;
        let bestDistance = radius * radius;
        for (const tile of this.tiles(rect, zoom)) {
            for (const site of tile.sites) {
                const position = QuantizedWorldLocation.unquantize(site.location);
                const distance = (position.x - center.x) ** 2 + (position.y - center.y) ** 2;
                if (distance <= bestDistance) {
                    best = site;
                    bestDistance = distance;
                }
            }
        }
        return best;
    }
}
