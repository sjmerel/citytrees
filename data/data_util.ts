import axios from 'axios';

export namespace DataUtil {

  export async function fetchSocrata(endpoint: string, options: {
    where: string;
    select: string;
    order: string;
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
    where: string;
    fields: string;
    returnGeometry?: boolean;
  } = {}) {

    let rows = [];
    let offset = 0;
    let pageSize = 1000;
    for (;;) {
      let response = await axios.get(`${endpoint}/query`, {
        params: {
          where: options.where ?? '1=1',
          outFields: options.outFields ?? '*',
          returnGeometry: options.returnGeometry ?? false,

          f: 'json',
          outSR: 4326, // lat & lon
          orderByFields: 'OBJECTID ASC',
          resultOffset: offset,
          resultRecordCount: pageSize
        }
      });
      let page = response.data.features;

      rows.push(...page);
      console.log(`${rows.length}`);

      if (page.length < pageSize) {
        return rows;
      }
      offset += page.length;
    }
  }

}
