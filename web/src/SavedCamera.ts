export interface Camera {
    lat: number;
    lng: number;
    zoom: number;
}

export function parseCamera(value: string): Camera {
    const camera: unknown = JSON.parse(value);
    if (camera === null || typeof camera !== 'object' ||
        !('lat' in camera) || typeof camera.lat !== 'number' || !Number.isFinite(camera.lat) || Math.abs(camera.lat) > 85 ||
        !('lng' in camera) || typeof camera.lng !== 'number' || !Number.isFinite(camera.lng) || Math.abs(camera.lng) > 180 ||
        !('zoom' in camera) || typeof camera.zoom !== 'number' || !Number.isFinite(camera.zoom) || camera.zoom < 0 || camera.zoom > 30) {
        throw new Error('Invalid saved map position.');
    }
    return { lat: camera.lat, lng: camera.lng, zoom: camera.zoom };
}

export class SavedCamera {
    private static readonly key = 'city-trees-camera';

    static load(): Camera | undefined {
        try {
            const value = localStorage.getItem(this.key);
            return value === null ? undefined : parseCamera(value);
        }
        catch (error) {
            console.warn('Could not restore the map position.', error);
            return undefined;
        }
    }

    static save(map: google.maps.Map) {
        const center = map.getCenter();
        const zoom = map.getZoom();
        if (!center || zoom === undefined) { return; }
        try {
            localStorage.setItem(this.key, JSON.stringify({ lat: center.lat(), lng: center.lng(), zoom }));
        }
        catch (error) {
            console.warn('Could not save the map position.', error);
        }
    }
}
