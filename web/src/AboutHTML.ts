import type { City, License } from './Dataset';

// The cities in cities.json (downloaded with the data set), as an HTML list per country.
export function citiesHTML(cities: City[]): string {
    const countries = new Map<string, City[]>();
    const names = new Intl.DisplayNames(undefined, { type: 'region' });
    for (const city of cities) {
        const title = names.of(city.country) ?? city.country;
        const group = countries.get(title) ?? [];
        group.push(city);
        countries.set(title, group);
    }
    return Array.from(countries).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
        .map(([title, cities]) => {
            const items = cities
                .map(city => ({
                    name: city.state != null ? `${city.name}, ${city.state}` : city.name,
                    sites: city.sites,
                    license: typeof city.license === 'string' ? null : city.license,
                }))
                .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
                .map(({ name, sites, license }) =>
                    `<li style="list-style: none"><details><summary style="font-size: inherit; font-weight: normal">${htmlEscaped(name)} <span class="tree-count">(${sites.toLocaleString()} trees)</span></summary>${licenseHTML(license)}</details></li>`);
            return `<h3>${htmlEscaped(title)}</h3><ul>${items.join('')}</ul>`;
        }).join('') + '<p class="license-statement">All datasets listed above are modified by City Trees: records filtered, botanical names standardized, and data converted to map tiles.</p>';
}

function licenseHTML(license: License | null | undefined): string {
    if (license != null) {
        const paragraphs: string[] = [];
        const source = license.portal_url ?? license.api_url ?? license.url;
        let row = 'Data: ';
        const datasetName = license.dataset_name;
        if (datasetName != null) {
            row += linkHTML(datasetName, source);
        }
        else {
            row += linkHTML('Dataset source', source);
        }
        const attrName = license.attribution_name;
        if (attrName != null) {
            row += `, by ${htmlEscaped(attrName)}`;
        }
        paragraphs.push(row);

        const name = license.license_name;
        const url = license.license;
        if (name != null && url != null) {
            const label = name.startsWith('CC0 ') ? 'Public-domain dedication' : 'Licensed under';
            paragraphs.push(`${label} ${linkHTML(name, url)}.`);
        }
        for (const notice of license.notices ?? []) {
            paragraphs.push(htmlEscaped(notice));
        }
        const lastUpdated = license.last_updated;
        if (lastUpdated != null) {
            paragraphs.push(`Last updated ${htmlEscaped(lastUpdated)}.`);
        }
        if (license.attribution_url != null) {
            paragraphs.push(linkHTML('Attribution source', license.attribution_url));
        }
        if (license.terms_url != null && license.terms_url !== source && license.terms_url !== license.license) {
            paragraphs.push(linkHTML('Source terms and notices', license.terms_url));
        }
        return paragraphs.map(paragraph => `<p class="license-statement">${paragraph}</p>`).join('');
    }
    return '<p class="license-statement">License information is not available in this downloaded dataset.</p>';
}

function linkHTML(title: string, url: string | null | undefined): string {
    if (url != null && /^https?:/i.test(url)) {
        return `<a href="${htmlEscaped(url)}">${htmlEscaped(title)}</a>`;
    }
    return htmlEscaped(title);
}

function htmlEscaped(value: string): string {
    return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
}
