import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import mapStyle from '../../assets/map_style.json';
import { Dataset } from './Dataset';
import { TileDb } from './TileDb';
import { MapTileLayer } from './MapTileLayer';
import './styles.css';

const mapElement = document.querySelector<HTMLElement>('#map')!;
const statusElement = document.querySelector<HTMLElement>('#status')!;

function showError(message: string) {
    statusElement.textContent = message;
    statusElement.setAttribute('role', 'alert');
    statusElement.hidden = false;
}

async function main() {
    // Load configuration here so invalid configuration is reported on the page.
    const { Config } = await import('./Config');
    const config = Config.instance;
    if (!config.googleMapsApiKey) {
        throw new Error('Set VITE_GOOGLE_MAPS_API_KEY in web/.env.local, then restart the dev server or rebuild.');
    }

    Object.assign(window, {
        gm_authFailure: () => showError('Google Maps could not authorize this site. Check the browser API key, website restrictions, and billing configuration.'),
    });
    setOptions({ key: config.googleMapsApiKey, v: 'quarterly' });
    const { Map } = await importLibrary('maps');
    const map = new Map(mapElement, {
        center: { lat: 0, lng: 0 },
        zoom: 2,
        styles: mapStyle,
        disableDefaultUI: true,
        clickableIcons: false,
        gestureHandling: 'greedy',
        keyboardShortcuts: true,
    });
    if (statusElement.getAttribute('role') !== 'alert') {
        statusElement.textContent = 'Loading tree data...';
    }
    const dataset = await Dataset.load(config.serverUrl);
    const tileDb = new TileDb(dataset);
    const tileLayer = new MapTileLayer(tileDb, dataset.types);
    map.overlayMapTypes.push(tileLayer);
    tileDb.store.onTilesDownloaded = () => tileLayer.clearTileCache();
    tileDb.store.onDownloadFailedChanged = failed => {
        if (statusElement.getAttribute('role') === 'alert') { return; }
        statusElement.textContent = 'Some tree data could not be downloaded. Move the map to retry.';
        statusElement.hidden = !failed;
    };
    const updateOutlines = () => {
        const type = map.getMapTypeId();
        tileLayer.outlined = type === 'satellite' || type === 'hybrid';
    };
    map.addListener('maptypeid_changed', updateOutlines);
    window.addEventListener('resize', () => tileLayer.clearTileCache());
    updateOutlines();
    console.info(`Loaded dataset ${dataset.timestamp}: ${tileDb.siteCount.toLocaleString()} trees, ${dataset.types.length} types, ${dataset.cities.length} cities.`);
    // Do not hide an authorization error if Google reported it during initialization.
    if (statusElement.getAttribute('role') !== 'alert') {
        statusElement.hidden = true;
    }
}

main().catch((error: unknown) => {
    console.error('Loading City Trees failed:', error);
    showError(error instanceof Error ? error.message : 'Could not load the map. Reload the page to try again.');
});
