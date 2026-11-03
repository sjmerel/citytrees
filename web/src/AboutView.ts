import aboutHTML from '../../assets/about.html?raw';
import aboutStyles from '../../assets/styles.css?raw';
import type { City } from './Dataset';

export class AboutView {
    private readonly dialog = document.querySelector<HTMLDialogElement>('#about')!;
    private readonly frame = document.querySelector<HTMLIFrameElement>('#about-page')!;

    constructor(cities: City[]) {
        const page = new DOMParser().parseFromString(aboutHTML, 'text/html');
        page.querySelector('link[rel="stylesheet"]')!.remove();
        const style = page.createElement('style');
        style.textContent = aboutStyles;
        page.head.append(style);

        const list = page.querySelector('details')!;
        // Keep the shared disclosure heading; replace its native-app placeholder with safe DOM text.
        for (const node of Array.from(list.childNodes)) {
            if (node.nodeType === Node.TEXT_NODE && node.textContent?.includes('[CITIES]')) { node.remove(); }
        }
        const countries = new Map<string, City[]>();
        const names = new Intl.DisplayNames(undefined, { type: 'region' });
        for (const city of cities) {
            const title = names.of(city.country) ?? city.country;
            const group = countries.get(title) ?? [];
            group.push(city);
            countries.set(title, group);
        }
        for (const [title, group] of Array.from(countries).sort(([a], [b]) => a.localeCompare(b))) {
            const heading = page.createElement('h3');
            heading.textContent = title;
            const ul = page.createElement('ul');
            const cityNames = group.map(city => city.state ? `${city.name}, ${city.state}` : city.name);
            for (const name of cityNames.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))) {
                const li = page.createElement('li');
                li.textContent = name;
                ul.append(li);
            }
            list.append(heading, ul);
        }
        for (const link of page.querySelectorAll('a')) {
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
        }
        this.frame.srcdoc = `<!doctype html>${page.documentElement.outerHTML}`;
        document.querySelector<HTMLButtonElement>('#close-about')!.addEventListener('click', () => this.dialog.close());
        this.dialog.addEventListener('click', event => {
            if (event.target === this.dialog) {
                const rect = this.dialog.getBoundingClientRect();
                if (event.clientX < rect.left || event.clientX > rect.right ||
                    event.clientY < rect.top || event.clientY > rect.bottom) {
                    this.dialog.close();
                }
            }
        });
    }

    show() {
        this.dialog.showModal();
    }
}
