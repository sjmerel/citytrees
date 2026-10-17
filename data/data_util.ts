import axios from 'axios';

export namespace DataUtil {

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
    let objectIdField = layer.objectIdField ?? layer.objectIdFieldName ?? 'OBJECTID';

    for (;;) {
      let response = await axios.get(`${endpoint}/query`, {
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

}
