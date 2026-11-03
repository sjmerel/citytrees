import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import mapStyle from '../../assets/map_style.json';
import { Dataset } from './Dataset';
import { TileDb } from './TileDb';
import { MapTileLayer } from './MapTileLayer';
import { MapView } from './MapView';
import { SavedCamera } from './SavedCamera';
import './styles.css';

const mapElement = document.querySelector<HTMLElement>('#map')!;
const statusElement = document.querySelector<HTMLElement>('#status')!;
const statusMessage = document.querySelector<HTMLElement>('#status-message')!;
const retryButton = document.querySelector<HTMLButtonElement>('#retry')!;

function showStatus(message: string, retry?: () => void) {
    if (statusElement.getAttribute('role') === 'alert') { return; }
    statusMessage.textContent = message;
    retryButton.hidden = !retry;
    retryButton.onclick = retry ?? null;
    statusElement.hidden = false;
}

function clearStatus() {
    if (statusElement.getAttribute('role') !== 'alert') { statusElement.hidden = true; }
}

function showError(message: string) {
    statusMessage.textContent = message;
    retryButton.hidden = false;
    retryButton.onclick = () => window.location.reload();
    statusElement.setAttribute('role', 'alert');
    statusElement.hidden = false;
}

async function main() {
    // Load configuration here so invalid configuration is reported on the page.
    const { Config } = await import('./Config');
    const config = Config.instance;
    if (!config.googleMapsApiKey) {
        throw new Error('Set MAPS_API_KEY in secrets/web.env.local, then restart the dev server or rebuild.');
    }

    Object.assign(window, {
        gm_authFailure: () => showError('Google Maps could not authorize this site. Check the browser API key, website restrictions, and billing configuration.'),
    });
    setOptions({ key: config.googleMapsApiKey, v: 'quarterly' });
    const { Map } = await importLibrary('maps');
    const camera = SavedCamera.load();
    const map = new Map(mapElement, {
        center: camera ? { lat: camera.lat, lng: camera.lng } : { lat: 0, lng: 0 },
        zoom: camera?.zoom ?? 2,
        tilt: 0,
        heading: 0,
        styles: mapStyle,
        disableDefaultUI: true,
        clickableIcons: false,
        gestureHandling: 'greedy',
        keyboardShortcuts: true,
    });
    showStatus('Loading tree data...');
    const dataset = await Dataset.load(config.serverUrl);
    const tileDb = new TileDb(dataset);
    const tileLayer = new MapTileLayer(tileDb, dataset.types);
    map.overlayMapTypes.push(tileLayer);
    tileDb.store.onTilesDownloaded = () => tileLayer.clearTileCache();
    tileDb.store.onDownloadFailedChanged = failed => {
        if (failed) {
            showStatus('Some tree data could not be downloaded.', () => {
                tileDb.store.retryDownloads();
                tileLayer.clearTileCache();
            });
        }
        else { clearStatus(); }
    };
    new MapView(map, dataset, tileDb, tileLayer, showStatus, clearStatus);
    window.addEventListener('resize', () => tileLayer.clearTileCache());
    console.info(`Loaded dataset ${dataset.timestamp}: ${tileDb.siteCount.toLocaleString()} trees, ${dataset.types.length} types, ${dataset.cities.length} cities.`);
    clearStatus();
}

main().catch((error: unknown) => {
    console.error('Loading City Trees failed:', error);
    showError(error instanceof Error ? error.message : 'Could not load the map. Reload the page to try again.');
});
