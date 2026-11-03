import { Mercator, QuantizedWorldLocation, type WorldRect } from './Mercator';
import { TileDb } from './TileDb';
import type { TreeType } from './TreeType';

const TILE_SIZE_POINTS = 256;
const SITE_DIAMETER_METERS = 4;
const SITE_BORDER_POINTS = 2 / 3;
const SITE_MIN_DIAMETER_POINTS = 3;

export function tileGeometry(x: number, y: number, zoom: number, outlined: boolean) {
    const tileCount = 2 ** zoom;
    const mapCenter = Mercator.unproject({ x: (x + 0.5) / tileCount, y: (y + 0.5) / tileCount });
    const metersPerPoint = Mercator.metersPerUnit(mapCenter.lat) / (tileCount * TILE_SIZE_POINTS);
    const radius = Math.max(SITE_MIN_DIAMETER_POINTS, SITE_DIAMETER_METERS / metersPerPoint) / 2;
    const outerRadius = outlined ? radius + SITE_BORDER_POINTS : radius;
    const padding = outerRadius / TILE_SIZE_POINTS;
    const region = {
        minX: (x - padding) / tileCount,
        minY: Math.max(0, (y - padding) / tileCount),
        maxX: (x + 1 + padding) / tileCount,
        maxY: Math.min(1, (y + 1 + padding) / tileCount),
    };
    return { tileCount, radius, outerRadius, region };
}

// Edge tiles also need trees across the antimeridian whose circles overlap their borders.
export function wrappedRegions(region: WorldRect): WorldRect[] {
    const regions = [{ ...region, minX: Math.max(0, region.minX), maxX: Math.min(1, region.maxX) }];
    if (region.minX < 0) { regions.push({ ...region, minX: region.minX + 1, maxX: 1 }); }
    if (region.maxX > 1) { regions.push({ ...region, minX: 0, maxX: region.maxX - 1 }); }
    return regions;
}

export class MapTileLayer implements google.maps.MapType {
    readonly tileSize = new google.maps.Size(TILE_SIZE_POINTS, TILE_SIZE_POINTS);
    readonly minZoom = 0;
    readonly maxZoom = 30;
    readonly name = 'Trees';
    readonly alt = 'Tree locations';
    readonly projection = null;
    readonly radius = Mercator.radius;

    private readonly activeTiles = new Map<HTMLCanvasElement, { x: number; y: number; zoom: number }>();
    private isOutlined = false;

    constructor(private readonly tileDb: TileDb, private readonly types: TreeType[]) {}

    get outlined(): boolean { return this.isOutlined; }
    set outlined(value: boolean) {
        if (value !== this.isOutlined) {
            this.isOutlined = value;
            this.clearTileCache();
        }
    }

    getTile(coord: google.maps.Point, zoom: number, ownerDocument: Document): HTMLElement {
        const canvas = ownerDocument.createElement('canvas');
        canvas.style.width = `${TILE_SIZE_POINTS}px`;
        canvas.style.height = `${TILE_SIZE_POINTS}px`;
        const count = 2 ** zoom;
        if (coord.y < 0 || coord.y >= count) { return canvas; }
        const x = ((coord.x % count) + count) % count;
        this.activeTiles.set(canvas, { x, y: coord.y, zoom });
        this.drawTile(canvas, x, coord.y, zoom);
        return canvas;
    }

    releaseTile(tile: Element | null) {
        if (tile instanceof HTMLCanvasElement) {
            this.activeTiles.delete(tile);
            tile.width = 0;
            tile.height = 0;
        }
    }

    clearTileCache() {
        for (const [canvas, { x, y, zoom }] of this.activeTiles) {
            this.drawTile(canvas, x, y, zoom);
        }
    }

    private drawTile(canvas: HTMLCanvasElement, x: number, y: number, zoom: number) {
        const scale = window.devicePixelRatio || 1;
        canvas.width = Math.ceil(TILE_SIZE_POINTS * scale);
        canvas.height = Math.ceil(TILE_SIZE_POINTS * scale);
        const context = canvas.getContext('2d');
        if (!context) { throw new Error('Could not create a canvas for tree tiles.'); }
        context.scale(canvas.width / TILE_SIZE_POINTS, canvas.height / TILE_SIZE_POINTS);

        const { tileCount, radius, outerRadius, region } = tileGeometry(x, y, zoom, this.isOutlined);
        const tiles = new Set(wrappedRegions(region).flatMap(rect => this.tileDb.tiles(rect, zoom)));
        const worldSize = tileCount * TILE_SIZE_POINTS;
        const pixelsPerUnit = worldSize / QuantizedWorldLocation.scale;
        const lowest = -outerRadius;
        const highest = TILE_SIZE_POINTS + outerRadius;
        const circles: { x: number; y: number; typeIndex: number }[] = [];
        for (const tile of tiles) {
            for (const site of tile.sites) {
                const tileY = site.location.y * pixelsPerUnit - y * TILE_SIZE_POINTS;
                if (tileY < lowest || tileY > highest) { continue; }
                const tileX = site.location.x * pixelsPerUnit - x * TILE_SIZE_POINTS;
                for (const shift of [-worldSize, 0, worldSize]) {
                    const wrappedX = tileX + shift;
                    if (wrappedX >= lowest && wrappedX <= highest) {
                        circles.push({ x: wrappedX, y: tileY, typeIndex: site.typeIndex });
                    }
                }
            }
        }

        // Borders first, so a neighbor's border never covers a site.
        if (this.isOutlined) {
            context.fillStyle = '#ffffff';
            for (const circle of circles) {
                context.beginPath();
                context.arc(circle.x, circle.y, outerRadius, 0, 2 * Math.PI);
                context.fill();
            }
        }
        for (const circle of circles) {
            context.fillStyle = this.types[circle.typeIndex].color;
            context.beginPath();
            context.arc(circle.x, circle.y, radius, 0, 2 * Math.PI);
            context.fill();
        }
    }
}
