import crosshairIcon from '../../assets/crosshair.svg';
import layersIcon from '../../assets/layers.svg';
import infoIcon from '../../assets/info.svg';
import closeIcon from '../../assets/x.svg';
import wikipediaIcon from '../../assets/wikipedia.svg';
import selectionRing from '../../assets/selection_ring.svg';
import { AboutView } from './AboutView';
import type { Dataset } from './Dataset';
import type { Site } from './MapTile';
import { MapTileLayer } from './MapTileLayer';
import { Mercator, QuantizedWorldLocation, type MapLocation } from './Mercator';
import { SavedCamera } from './SavedCamera';
import { TileDb } from './TileDb';

export class MapView {
    private readonly card = document.querySelector<HTMLElement>('#selection')!;
    private readonly selection = document.createElement('img');
    private readonly location = document.createElement('div');
    private readonly overlay = new google.maps.OverlayView();
    private selectedLocation: MapLocation | undefined;
    private myLocation: MapLocation | undefined;
    private locating = false;

    constructor(
        private readonly map: google.maps.Map,
        private readonly dataset: Dataset,
        private readonly tileDb: TileDb,
        private readonly tileLayer: MapTileLayer,
        private readonly showStatus: (message: string, retry?: () => void) => void,
        private readonly clearStatus: () => void,
    ) {
        const about = new AboutView(dataset.cities);
        this.setupButton('locate', crosshairIcon, () => this.showMyLocation());
        this.setupButton('layers', layersIcon, () => {
            const satellite = map.getMapTypeId() !== 'roadmap';
            map.setMapTypeId(satellite ? 'roadmap' : 'satellite');
        });
        this.setupButton('show-about', infoIcon, () => about.show());
        this.setupButton('clear-selection', closeIcon, () => this.select(undefined));
        this.setupButton('close-about', closeIcon);
        document.querySelector<HTMLImageElement>('#wikipedia img')!.src = wikipediaIcon;

        this.selection.src = selectionRing;
        this.selection.alt = '';
        this.selection.className = 'selection-ring';
        this.location.className = 'my-location';
        this.location.setAttribute('aria-label', 'Your location');
        this.overlay.onAdd = () => {
            this.overlay.getPanes()!.overlayMouseTarget.append(this.selection, this.location);
            this.drawMarkers();
        };
        this.overlay.draw = () => this.drawMarkers();
        this.overlay.onRemove = () => {
            this.selection.remove();
            this.location.remove();
        };
        this.overlay.setMap(map);

        map.addListener('click', (event: google.maps.MapMouseEvent) => {
            if (!event.latLng) { return; }
            const location = { lat: event.latLng.lat(), lon: event.latLng.lng() };
            const zoom = map.getZoom()!;
            const radius = 20 * Mercator.metersPerUnit(location.lat) / (256 * 2 ** zoom);
            this.select(tileDb.findNearest(location, radius, Math.round(zoom)));
        });
        map.addListener('idle', () => SavedCamera.save(map));
        map.addListener('maptypeid_changed', () => this.updateMapType());
        this.updateMapType();
        document.querySelector<HTMLElement>('#controls')!.hidden = false;
    }

    private setupButton(id: string, icon: string, action?: () => void) {
        const button = document.querySelector<HTMLButtonElement>(`#${id}`)!;
        button.querySelector('img')!.src = icon;
        if (action) { button.addEventListener('click', action); }
    }

    private updateMapType() {
        const type = this.map.getMapTypeId();
        this.tileLayer.outlined = type === 'satellite' || type === 'hybrid';
        document.querySelector('#layers')!.setAttribute('aria-pressed', String(this.tileLayer.outlined));
    }

    private select(site: Site | undefined) {
        this.selectedLocation = site ? Mercator.unproject(QuantizedWorldLocation.unquantize(site.location)) : undefined;
        this.card.hidden = !site;
        this.drawMarkers();
        if (!site) { return; }
        const type = this.dataset.types[site.typeIndex];
        document.querySelector('#botanical-name')!.textContent = type.canonicalName;
        document.querySelector<HTMLElement>('#genus-color')!.style.backgroundColor = type.color;
        const common = document.querySelector<HTMLElement>('#common-names')!;
        common.textContent = type.commonNames.join(', ');
        document.querySelector<HTMLElement>('#common-names-section')!.hidden = type.commonNames.length === 0;
        const wikipedia = document.querySelector<HTMLAnchorElement>('#wikipedia')!;
        wikipedia.hidden = !type.wikipediaUrl;
        if (type.wikipediaUrl) { wikipedia.href = type.wikipediaUrl; }
        else { wikipedia.removeAttribute('href'); }
    }

    private drawMarkers() {
        const projection = this.overlay.getProjection();
        for (const [element, location] of [
            [this.selection, this.selectedLocation],
            [this.location, this.myLocation],
        ] as const) {
            element.hidden = !location;
            if (!location || !projection) { continue; }
            const position = projection.fromLatLngToDivPixel(new google.maps.LatLng(location.lat, location.lon));
            if (position) {
                element.style.left = `${position.x}px`;
                element.style.top = `${position.y}px`;
            }
        }
    }

    private showMyLocation() {
        if (this.locating) { return; }
        if (!navigator.geolocation) {
            this.showStatus('Location is unavailable in this browser. Use HTTPS or localhost.');
            return;
        }
        this.locating = true;
        const button = document.querySelector<HTMLButtonElement>('#locate')!;
        button.disabled = true;
        this.showStatus('Finding your location...');
        navigator.geolocation.getCurrentPosition(position => {
            this.locating = false;
            button.disabled = false;
            this.myLocation = { lat: position.coords.latitude, lon: position.coords.longitude };
            this.map.setCenter({ lat: this.myLocation.lat, lng: this.myLocation.lon });
            this.map.setZoom(Math.max(this.map.getZoom() ?? 0, 17));
            this.drawMarkers();
            this.clearStatus();
        }, error => {
            this.locating = false;
            button.disabled = false;
            const message = error.code === 1
                ? 'Location access was denied. Allow location access in your browser settings to use this button.'
                : error.code === 3 ? 'Finding your location timed out.' : 'Your location is currently unavailable.';
            this.showStatus(message, () => this.showMyLocation());
        }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
    }
}
