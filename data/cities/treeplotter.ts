import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import axios from 'axios';
import proj4 from 'proj4';

export interface Tree {
  geometry: {
    type: string;
    crs: { properties: { name: string } };
    coordinates: number[];
  } | null;
  properties: {
    pid: number;
    species_latin: number | null;
    species_common: number | null;
    organization: number | null;
    status: number | null;
    condition: number | null;
    archived: boolean | null;
  };
}

export interface Species {
  latin_name: string | null;
  genus?: string | null;
}

export interface Inventory {
  species: Map<number, Species>;
  organizations: Map<number, { orgname: string | null }>;
  statuses: Map<number, { alias: string | null }>;
  conditions: Map<number, { alias: string | null }>;
}

export interface Options {
  bounds: [number, number, number, number];
  coveredOrganizations?: RegExp;
  requireLivingStatus?: boolean;
  botanicalName?: (species: Species) => string | undefined;
}

export function treeSite(row: Tree, inventory: Inventory, options: Options) {
  let p = row.properties;
  // Both fields reference the same botanical lookup; legacy rows may fill only one.
  let speciesId = p.species_latin ?? p.species_common;
  if (p.archived || p.organization === null || speciesId === null) return;
  if (p.species_latin !== null && p.species_common !== null && p.species_latin !== p.species_common) return;
  let organization = inventory.organizations.get(p.organization);
  assert(organization, `Unknown TreePlotter organization: ${p.organization}`);
  let orgname = organization.orgname?.trim();
  if (!orgname || /^(?:Test|Administrative|Trees Missing Organization)$/i.test(orgname) ||
      options.coveredOrganizations?.test(orgname)) return;
  if (p.status === null && options.requireLivingStatus) return;
  if (p.status !== null) {
    let status = inventory.statuses.get(p.status);
    assert(status, `Unknown TreePlotter status: ${p.status}`);
    if (status.alias !== 'Alive' && status.alias !== 'Tree') return;
  }
  if (p.condition !== null) {
    let condition = inventory.conditions.get(p.condition);
    assert(condition, `Unknown TreePlotter condition: ${p.condition}`);
    if (/dead|dying/i.test(condition.alias ?? '')) return;
  }
  let species = inventory.species.get(speciesId);
  assert(species, `Unknown TreePlotter species: ${speciesId}`);
  let name = options.botanicalName ? options.botanicalName(species) : species.latin_name?.trim();
  if (!name || /^(?:unknown|other|planting|proposed|vacant|stump|remove|broadleaf|conifer|hybrid oak|n\/a)\b/i.test(name) ||
      /^betula pap$/i.test(name)) return;
  if (/^(?:Ribes|Sorbaria|Wisteria)\b/.test(name)) return;
  assert(/^(?:[xX] )?[A-Z][a-z]+\b/.test(name), `Invalid TreePlotter botanical name: ${name}`);

  if (!row.geometry) return;
  assert.equal(row.geometry.type, 'Point');
  assert.equal(row.geometry.crs.properties.name, 'EPSG:3857');
  let [x, y] = row.geometry.coordinates;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  let [lon, lat] = proj4('EPSG:3857', 'EPSG:4326', [x, y]);
  let [west, south, east, north] = options.bounds;
  if (!(lon >= west && lon <= east && lat >= south && lat <= north)) return;
  return { lat, lon, name };
}

// Use only the anonymous viewer's read actions, not its login-only exporter.
export async function exportInventory(code: string, endpoint: string, options: Options) {
  let url = new URL(endpoint);
  let folder = url.pathname.split('/').filter(Boolean).at(-1)!;
  let api = new URL('/main/server/db.php', endpoint).href;
  let page = await axios.get(endpoint, { timeout: 60000 });
  let cookie = page.headers['set-cookie']?.map(o => o.split(';')[0]).join('; ');
  let headers = { Cookie: cookie, Referer: endpoint };
  interface Response { status: string }

  async function request<T extends Response>(
    action: string, params: Record<string, string | string[]> = {}, func?: string
  ): Promise<T> {
    let body = new URLSearchParams({ action });
    let prefix = func ? 'params[args]' : 'params';
    if (func) body.set('params[funcToCall]', func);
    body.set(`${prefix}[folder]`, folder);
    for (let [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        value.forEach((v, i) => body.set(`${prefix}[${key}][${i}]`, v));
      } else {
        body.set(`${prefix}[${key}]`, value);
      }
    }
    for (let attempt = 1; ; ++attempt) {
      try {
        let response = await axios.post<T>(api, body, { headers, timeout: 120000 });
        if (response.data.status !== 'OK') {
          throw new Error(`TreePlotter ${func ?? action} failed: ${JSON.stringify(response.data)}`);
        }
        return response.data;
      } catch (error: unknown) {
        let status = axios.isAxiosError(error) ? error.response?.status : undefined;
        if (!axios.isAxiosError(error) || attempt >= 5 ||
            (status !== undefined && status !== 429 && status < 500)) throw error;
        console.log(`${code}: request failed (${status ?? error.code}), retrying (${attempt}/4)...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }
  }

  async function lookup<T extends { pid: number }>(tableName: string) {
    let response = await request<Response & { results: Record<string, T> | T[] }>(
      'callFunction', { tableName }, 'getLookUpItems');
    let result = new Map<number, T>();
    for (let item of Object.values(response.results)) {
      assert(Number.isSafeInteger(item.pid) && !result.has(item.pid), 'Invalid/repeated TreePlotter lookup ID');
      result.set(item.pid, item);
    }
    return result;
  }
  let inventory: Inventory = {
    species: await lookup<Species & { pid: number }>('species'),
    organizations: await lookup<{ pid: number; orgname: string | null }>('organization'),
    statuses: await lookup<{ pid: number; alias: string | null }>('l_trees_status'),
    conditions: await lookup<{ pid: number; alias: string | null }>('l_trees_condition')
  };
  async function getCount() {
    let response = await request<Response & { count: number }>('getFullCount', { layerName: 'trees' });
    assert(Number.isSafeInteger(response.count) && response.count > 0);
    return response.count;
  }
  let total = await getCount();
  let response = await request<Response & { results: string }>('getPIDsFromFilters', { layerName: 'trees' });
  let ids = response.results.split(',').map(Number);
  assert.equal(ids.length, total, 'Incomplete TreePlotter ID list');
  assert.equal(new Set(ids).size, total, 'Repeated TreePlotter ID');
  assert(ids.every(id => Number.isSafeInteger(id) && id > 0));
  ids.sort((a, b) => a - b);
  let trees: { lat: number; lon: number; name: string }[] = [];
  let missingLookups = new Map<string, number>();
  let pageSize = 1000;
  for (let offset = 0; offset < ids.length; offset += pageSize) {
    let pageIds = ids.slice(offset, offset + pageSize);
    let page = await request<Response & {
      results: { trees: { geojson: { type: string; features: Tree[] } } };
    }>('callFunction', {
      table: 'trees', pids: pageIds.join(','), geomField: 'geom',
      extraFields: ['species_latin', 'species_common', 'organization', 'status', 'condition', 'archived']
    }, 'retrieveLayers');
    let collection = page.results.trees.geojson;
    assert.equal(collection.type, 'FeatureCollection');
    assert(Array.isArray(collection.features));
    let remaining = new Set(pageIds);
    for (let row of collection.features) {
      assert(remaining.delete(row.properties.pid), 'Unexpected/repeated TreePlotter tree ID');
      let p = row.properties;
      let references: [keyof Inventory, number | null][] = [
        ['species', p.species_latin ?? p.species_common], ['organizations', p.organization],
        ['statuses', p.status], ['conditions', p.condition]
      ];
      assert(p.species_latin === null || Number.isSafeInteger(p.species_latin));
      assert(p.species_common === null || Number.isSafeInteger(p.species_common));
      assert(p.archived === null || typeof p.archived === 'boolean');
      let missing = false;
      for (let [table, id] of references) {
        assert(id === null || Number.isSafeInteger(id), `Invalid TreePlotter ${table} reference`);
        if (id !== null && !inventory[table].has(id)) {
          let key = `${table}:${id}`;
          missingLookups.set(key, (missingLookups.get(key) ?? 0) + 1);
          missing = true;
        }
      }
      if (missing) continue;
      let site = treeSite(row, inventory, options);
      if (site) trees.push(site);
    }
    assert.equal(remaining.size, 0, 'Incomplete TreePlotter map batch');
    if (offset % 10000 === 0 || offset + pageSize >= total) {
      console.log(`${code}: ${Math.min(offset + pageSize, total)}/${total}`);
    }
  }
  assert.equal(await getCount(), total, 'TreePlotter inventory changed during download; retry');
  assert(trees.length > 0, 'No usable TreePlotter trees');
  if (missingLookups.size) {
    console.warn(`${code}: omitted missing lookup references (table:ID, count): ${JSON.stringify([...missingLookups])}`);
  }
  fs.writeFileSync(path.join(__dirname, `${code}.json`), JSON.stringify(trees));
  console.log(`${code}: ${trees.length} trees; ${total - trees.length} records omitted`);
}
