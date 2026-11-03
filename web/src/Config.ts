export class Config {
    static readonly instance = new Config();

    readonly googleMapsApiKey: string;
    readonly serverUrl: URL;

    private constructor() {
        this.googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? '';
        this.serverUrl = new URL(import.meta.env.VITE_DATA_SERVER_URL, window.location.href);
        if (this.serverUrl.protocol !== 'https:' && this.serverUrl.protocol !== 'http:') {
            throw new Error('VITE_DATA_SERVER_URL must be an HTTP or HTTPS URL.');
        }
        if (!this.serverUrl.pathname.endsWith('/')) {
            throw new Error('VITE_DATA_SERVER_URL must end with a slash.');
        }
    }
}
