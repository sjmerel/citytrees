import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from './data_util';

// Shared downloaders for statewide ArcGIS layers that hold many municipalities, filtered by one community.
export namespace CommunityUtil {
  function write(file: string, trees: { name: string, lat: number, lon: number }[]) {
    fs.writeFileSync(path.join(__dirname, 'cities', file), JSON.stringify(trees, null, 2));
    console.log(`wrote ${trees.length} trees to ${file}`);
  }

  function clean(name: string) {
    return name.trim().replace('Ã—', 'x').replace('×', 'x').replace(/\s+(spp\.?|sp\.?)$/i, '');
  }

  // Wisconsin DNR Community Trees layer (municipal inventories compiled by the DNR)
  export async function wisconsin(community: string, file: string) {
    let endpoint = 'https://services5.arcgis.com/Ul9AyFFeFTjf08DW/arcgis/rest/services/WI_Municipal_Trees_10_8_24/FeatureServer/0';
    let rows = await DataUtil.fetchArcGis(endpoint, {
      fields: 'Latin_Name',
      where: `Community = '${community}' AND Latin_Name IS NOT NULL AND Latin_Name <> '' AND Latin_Name <> 'N/A'`,
      returnGeometry: true
    });
    write(file, rows.filter(o => o.geometry).map(o => ({
      name: clean(o.attributes.Latin_Name),
      lat: o.geometry.y,
      lon: o.geometry.x
    })));
  }

  // Indiana University Environmental Resilience Institute compilation of Indiana municipal inventories (active trees only)
  export async function indiana(location: string, file: string) {
    let endpoint = 'https://services.arcgis.com/tKsJAIiLjd90D5q2/arcgis/rest/services/Bloomington_and_Indianapolis_Tree_Inventories/FeatureServer/0';
    let rows = await DataUtil.fetchArcGis(endpoint, {
      fields: 'SPECIES,GENUS',
      where: `LOCATION = '${location}' AND (SPECIES IS NOT NULL OR GENUS IS NOT NULL)`,
      returnGeometry: true
    });
    write(file, rows.filter(o => o.geometry).map(o => ({
      name: clean(o.attributes.SPECIES ?? '') || clean(o.attributes.GENUS ?? ''),
      lat: o.geometry.y,
      lon: o.geometry.x
    })).filter(t => t.name));
  }
}
