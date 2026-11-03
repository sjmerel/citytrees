import { Dataset } from './Dataset';
import { MapTile } from './MapTile';
import { TileKey } from './TileKey';
import type { TileManifestEntry } from './TileManifest';

export class TileStore {
    onTilesDownloaded?: () => void;
    onDownloadFailedChanged?: (failed: boolean) => void;

    private readonly entries: Map<string, TileManifestEntry>;
    private readonly tiles = new Map<string, MapTile>();
    private readonly pending = new Map<string, TileManifestEntry>();
    private readonly inFlight = new Set<string>();
    private readonly retryAfter = new Map<string, number>();
    private downloadFailed = false;
    private notifyTimer: ReturnType<typeof setTimeout> | undefined;

    constructor(private readonly dataset: Dataset) {
        this.entries = new Map(dataset.entries.map(entry => [entry.key.id, entry]));
    }

    getTile(key: TileKey): MapTile | undefined {
        if (key.id === TileKey.root.id) { return this.dataset.rootTile; }
        const tile = this.tiles.get(key.id);
        if (tile) {
            this.tiles.delete(key.id);
            this.tiles.set(key.id, tile);
            return tile;
        }
        const entry = this.entries.get(key.id);
        if (entry && !this.inFlight.has(key.id) && (this.retryAfter.get(key.id) ?? 0) <= Date.now()) {
            this.pending.delete(key.id);
            this.pending.set(key.id, entry);
            if (this.pending.size > 64) { this.pending.delete(this.pending.keys().next().value!); }
            this.startDownloads();
        }
        return undefined;
    }

    private startDownloads() {
        while (this.inFlight.size < 4 && this.pending.size > 0) {
            const entry = Array.from(this.pending.values()).pop()!;
            this.pending.delete(entry.key.id);
            this.inFlight.add(entry.key.id);
            void this.download(entry);
        }
    }

    private async download(entry: TileManifestEntry) {
        let failed = false;
        try {
            const tile = await this.dataset.loadTile(entry);
            this.tiles.set(entry.key.id, tile);
            if (this.tiles.size > 64) { this.tiles.delete(this.tiles.keys().next().value!); }
            this.retryAfter.delete(entry.key.id);
            if (this.notifyTimer === undefined) {
                this.notifyTimer = setTimeout(() => {
                    this.notifyTimer = undefined;
                    this.onTilesDownloaded?.();
                }, 1000);
            }
        }
        catch (error) {
            failed = true;
            console.error(`Tile ${entry.key.id} download failed:`, error);
            this.retryAfter.set(entry.key.id, Date.now() + 30000);
        }
        finally {
            this.inFlight.delete(entry.key.id);
            this.startDownloads();
            if (this.downloadFailed !== failed) {
                this.downloadFailed = failed;
                this.onDownloadFailedChanged?.(failed);
            }
        }
    }
}
