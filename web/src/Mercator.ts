export interface MapLocation { lat: number; lon: number }
export interface WorldLocation { x: number; y: number }
export interface WorldRect { minX: number; minY: number; maxX: number; maxY: number }

export class Mercator {
    static readonly radius = 6378137.0;

    static project(location: MapLocation): WorldLocation {
        const s = Math.min(Math.max(Math.sin(location.lat * Math.PI / 180), -0.9999), 0.9999);
        return {
            x: 0.5 + location.lon / 360,
            y: 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI),
        };
    }

    static unproject(location: WorldLocation): MapLocation {
        return {
            lat: Math.atan(Math.sinh(Math.PI * (1 - 2 * location.y))) * 180 / Math.PI,
            lon: (location.x - 0.5) * 360,
        };
    }

    static metersPerUnit(latitude: number): number {
        return Math.cos(latitude * Math.PI / 180) * 2 * Math.PI * this.radius;
    }
}

export class QuantizedWorldLocation {
    static readonly scale = 4294967296;

    static quantize(location: WorldLocation): WorldLocation {
        const quantize = (value: number) => Math.trunc(Math.min(Math.max(value * this.scale, 0), this.scale - 1));
        return { x: quantize(location.x), y: quantize(location.y) };
    }

    static unquantize(location: WorldLocation): WorldLocation {
        return { x: location.x / this.scale, y: location.y / this.scale };
    }
}
