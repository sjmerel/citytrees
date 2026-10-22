# How to build data

* run scripts in cities/ (e.g. cities/portland_me_us.ts) to export latitude, longitude, and scientific name to cities/<city>.json
  * to add a city, add a city script and add the city to cities.json
* run process.ts to combine all <city>.json to global sites.json and types.json 
  * filters out bad data points
  * canonicalizes botanical names
  * looks for Wikipedia URLs for each species
* run macOS build_data utility 
  * build ios/trees/tiles/types.bin from types.json
  * build binary tiles from sites.json
    * manifest.bin describes overall tree structure
    * top level (less-detailed) tiles are written to ios/trees/tiles/<z>/<x>/<y>.bin
    * lower level (more detailed) tiles are written to data/tiles, to be uploaded to Google Cloud bucket
* run upload.ts to upload tiles


# City research

City findings, source caveats, and importer notes are maintained in
../.github/city_candidates.json (see ../.github/instructions/city-data.instructions.md
for the schema and research workflow). data/cities.json remains authoritative
for registered datasets. Historical notes in the ledger are not fresh verification.
