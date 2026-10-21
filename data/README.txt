# How to build data

* run scripts in cities/ (e.g. cities/portland_me_us.ts) to export latitude, longitude, and scientific name to cities/<city>.json
  * to add a city, add a city script and add the city to cities.json
* run process.ts to combine all <city>.json to global sites.json and types.json 
  * filters out bad data points
  * canonicalizes botanical names
  * looks for Wikipedia URLs for each species
* run macOS build_data utility 
  * build ios/trees/types.bin from types.json
  * build binary tiles from sites.json
    * top level (less-detailed) tiles are written to ios/trees/db and bundled with app
    * lower level (more detailed) tiles are written to data/tiles, to be uploaded to Google Cloud bucket
* run upload.ts to upload tiles

