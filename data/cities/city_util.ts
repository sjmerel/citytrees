import axios from 'axios';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

export namespace CityUtil {

  export async function fetchSocrata(endpoint: string, options: {
    where?: string;
    select?: string;
    order?: string;
  } = {}
  ): Promise<Record<string, any>[]> {
    let rows = [];
    let offset = 0;
    let pageSize = 1000;
    for (;;) {
      let response = await axios.get(endpoint, {
        params: { 
          '$select': options.select,
          '$order': options.order,
          '$where': options.where,

          '$limit': pageSize, 
          '$offset': offset 
        }
      });
      let page = response.data;

      rows.push(...page);
      console.log(`${rows.length}`);

      if (page.length < pageSize) {
        return rows;
      }
      offset += page.length;
    }
  }

  // Transient server errors (502/503/504) and network errors are common on long paged downloads.
  async function getWithRetry(url: string, config: object, attempts = 5) {
    for (let i = 1; ; ++i) {
      try {
        return await axios.get(url, config);
      }
      catch (error: any) {
        let status = error?.response?.status;
        let transient = status === undefined || status === 429 || status >= 500;
        if (i >= attempts || !transient) throw error;
        console.log(`request failed (${status ?? error.code}), retrying (${i}/${attempts - 1})...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * i));
      }
    }
  }

  export async function fetchArcGis(endpoint: string, options: {
    where?: string;
    fields?: string;
    returnGeometry?: boolean;
  } = {}) {

    let rows = [];
    let offset = 0;
    let layer = (await axios.get(endpoint, { params: { f: 'json' } })).data;
    if (layer.error) {
      throw new Error(`ArcGIS layer metadata request failed: ${JSON.stringify(layer.error)}`);
    }
    let pageSize = Math.min(layer.maxRecordCount ?? 1000, 1000);
    let objectIdField = layer.objectIdField ?? layer.objectIdFieldName ??
      layer.fields?.find((field: { name: string; type: string }) =>
        field.type === 'esriFieldTypeOID')?.name ?? 'OBJECTID';

    for (;;) {
      let response = await getWithRetry(`${endpoint}/query`, {
        params: {
          where: options.where ?? '1=1',
          outFields: options.fields ?? '*',
          returnGeometry: options.returnGeometry ?? false,

          f: 'json',
          outSR: 4326, // lat & lon
          orderByFields: `${objectIdField} ASC`,
          resultOffset: offset,
          resultRecordCount: pageSize
        }
      });
      if (response.data.error) {
        throw new Error(`ArcGIS query failed: ${JSON.stringify(response.data.error)}`);
      }
      let page = response.data.features;
      if (!Array.isArray(page)) {
        throw new Error('ArcGIS query response did not contain a features array');
      }

      rows.push(...page);
      console.log(`${rows.length}`);

      if (page.length === 0 || (page.length < pageSize && !response.data.exceededTransferLimit)) {
        return rows;
      }
      offset += page.length;
    }
  }

  // Select public map features in a guest session, then page the viewer's site grid.
  // WFS supplies stable site IDs; the grid supplies botanical labels and dates.
  // Some guest grids expose WGS84 coordinates, avoiding a costly WFS geometry export.
  export async function fetchTreeKeeper(endpoint: string, layer: string, facility: number,
    mapEndpoint = 'https://geocom2.daveytreekeeper.com/geoserver/Treekeeper/ows',
    options: { coordinatesFromGrid?: boolean } = {}) {
    interface Species {
      tree_name: string;
      tree_botanical: string;
      tree_genusbotanical: string;
      tree_type: string;
    }
    interface Site {
      SITE_ID: number;
      SITE_ATTR1: string | null;
      SITE_ACTIVE: number;
      LATITUDE?: number | null;
      LONGITUDE?: number | null;
      [key: string]: unknown;
    }
    interface FeaturePage {
      type: string;
      numberMatched: number;
      features: {
        geometry: { type: string; coordinates: [number, number] } | null;
        properties: { site_id: number };
      }[];
    }

    let response = await getWithRetry(`${endpoint}/index.cfm`, {
      params: { deviceWidth: 1920 }, timeout: 60000
    });
    let cookie = response.headers['set-cookie']?.map(o => o.split(';')[0]).join('; ');
    assert(cookie, 'TreeKeeper did not establish a guest session');
    let config = { headers: { Cookie: cookie }, timeout: 60000 };
    let speciesResponse = await axios.post(`${endpoint}/application/APIRequests.cfc?method=makeAPIRequest`, {
      type: 'GET', microserviceName: 'core', endpoint: '/project/species',
      dataParams: {}, optionalHTTP: {}
    }, config);
    let speciesData: { status_code: number; data: Species[] } = JSON.parse(speciesResponse.data.filecontent);
    assert.equal(speciesData.status_code, 200);
    assert(Array.isArray(speciesData.data));
    let species = new Map<string, Species>();
    for (let item of speciesData.data) {
      let existing = species.get(item.tree_name);
      assert(!existing || (existing.tree_botanical === item.tree_botanical &&
        existing.tree_type === item.tree_type), `Ambiguous TreeKeeper species: ${item.tree_name}`);
      species.set(item.tree_name, item);
    }

    let coordinates = new Map<number, [number, number]>();
    let featureIds = new Set<number>();
    let offset = 0;
    let featureCount: number | undefined;
    for (;;) {
      let response = await getWithRetry(mapEndpoint, {
        params: {
          service: 'WFS', version: '2.0.0', request: 'GetFeature',
          typeNames: `Treekeeper:${layer}`, outputFormat: 'application/json',
          srsName: 'EPSG:4326', sortBy: 'site_id',
          propertyName: options.coordinatesFromGrid ? 'site_id' : undefined,
          count: options.coordinatesFromGrid ? 10000 : 1000, startIndex: offset
        },
        timeout: 60000
      });
      let page: FeaturePage = response.data;
      assert.equal(page.type, 'FeatureCollection');
      assert(Array.isArray(page.features) && Number.isInteger(page.numberMatched));
      featureCount ??= page.numberMatched;
      assert.equal(page.numberMatched, featureCount, 'TreeKeeper map changed during download; retry');
      for (let feature of page.features) {
        assert(Number.isInteger(feature.properties.site_id));
        assert(!featureIds.has(feature.properties.site_id), 'Repeated TreeKeeper WFS site ID');
        featureIds.add(feature.properties.site_id);
        if (options.coordinatesFromGrid) continue;
        if (feature.geometry === null) continue;
        assert.equal(feature.geometry.type, 'Point');
        assert.equal(feature.geometry.coordinates.length, 2);
        assert(feature.geometry.coordinates.every(Number.isFinite));
        coordinates.set(feature.properties.site_id, feature.geometry.coordinates);
      }
      offset += page.features.length;
      if (options.coordinatesFromGrid) console.log(`${offset} public map sites`);
      if (offset >= page.numberMatched) {
        assert.equal(offset, page.numberMatched);
        break;
      }
      assert(page.features.length > 0, 'Incomplete TreeKeeper WFS download');
    }

    let selectedIds = options.coordinatesFromGrid ? [...featureIds] : [...coordinates.keys()];
    assert(selectedIds.length > 0, 'TreeKeeper public map contained no selectable sites');
    let uid = randomUUID().replaceAll('-', '').slice(0, 9);
    let selection = await axios.post(`${endpoint}/reports.cfc?method=getIDsAndInsertIntoMapSearchTable`, {
      recordType: 'sites', idArray: selectedIds, uid, display: true
    }, config);
    assert.equal(selection.data.trim(), '');

    let sites: Site[] = [];
    let ids = new Set<number>();
    let total: number | undefined;
    for (;;) {
      let response = await axios.post(`${endpoint}/cffiles/grids.cfc`, {
        filters: '[]',
        sorts: JSON.stringify([{ name: 'SITE_ID', desc: false, priority: 0, type: 'number' }])
      }, {
        ...config,
        params: {
          method: 'getTreeKeeperGridOptionsData', session_id: uid,
          layer_id: facility, gridType: 'sites', limit: 1000, offset: sites.length
        }
      });
      let page: { rowCount: number; data: Site[] } = response.data;
      assert(Number.isInteger(page.rowCount) && Array.isArray(page.data));
      total ??= page.rowCount;
      assert.equal(total, selectedIds.length, 'TreeKeeper guest selection is incomplete');
      assert.equal(page.rowCount, total, 'TreeKeeper inventory changed during download; retry');
      for (let site of page.data) {
        assert(!ids.has(site.SITE_ID), 'Repeated TreeKeeper grid site ID');
        assert(featureIds.has(site.SITE_ID), 'TreeKeeper grid site missing from public map');
        ids.add(site.SITE_ID);
        if (options.coordinatesFromGrid) {
          assert(site.LATITUDE !== undefined && site.LONGITUDE !== undefined,
            'TreeKeeper guest grid did not expose coordinates');
          if (site.LATITUDE === null || site.LONGITUDE === null) continue;
          assert(Number.isFinite(site.LATITUDE) && Number.isFinite(site.LONGITUDE));
          assert(Math.abs(site.LATITUDE) <= 90 && Math.abs(site.LONGITUDE) <= 180);
          coordinates.set(site.SITE_ID, [site.LONGITUDE, site.LATITUDE]);
        }
      }
      sites.push(...page.data);
      console.log(`${sites.length}`);
      if (sites.length >= total) {
        assert.equal(sites.length, total);
        break;
      }
      assert(page.data.length > 0, 'Incomplete TreeKeeper grid download');
    }

    assert(coordinates.size > 0, 'TreeKeeper public inventory contained no located sites');
    return sites.filter(o => o.SITE_ATTR1 !== null &&
      (!options.coordinatesFromGrid || coordinates.has(o.SITE_ID))).map(site => {
      let entry = species.get(site.SITE_ATTR1!);
      assert(entry, `Unknown TreeKeeper species label: ${site.SITE_ATTR1}`);
      let point = coordinates.get(site.SITE_ID);
      assert(point, `TreeKeeper site missing from public map: ${site.SITE_ID}`);
      return {
        lat: point[1], lon: point[0], name: entry.tree_botanical.trim(),
        genus: entry.tree_genusbotanical, speciesType: entry.tree_type, attributes: site
      };
    });
  }

}
