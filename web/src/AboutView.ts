import aboutHTML from '../../assets/about.html?raw';
import aboutStyles from '../../assets/styles.css?raw';
import type { City } from './Dataset';
import { citiesHTML } from './AboutHTML';

export class AboutView {
    private readonly dialog = document.querySelector<HTMLDialogElement>('#about')!;
    private readonly frame = document.querySelector<HTMLIFrameElement>('#about-page')!;

    constructor(cities: City[], treeCount: number) {
        const html = aboutHTML
            .replaceAll('[TREE_COUNT]', treeCount.toLocaleString())
            .replaceAll('[CITY_COUNT]', cities.length.toLocaleString())
            .replace('[CITIES]', () => citiesHTML(cities));
        const page = new DOMParser().parseFromString(html, 'text/html');
        page.querySelector('link[rel="stylesheet"]')!.remove();
        const style = page.createElement('style');
        style.textContent = `${aboutStyles}\nhtml { scrollbar-gutter: stable; }`;
        page.head.append(style);

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
