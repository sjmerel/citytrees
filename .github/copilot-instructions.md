This is source code for an app so people can identify trees in their neighborhoods.

## Data
Data comes from publicly available city data maintained by their landscaping departments. We download and process the data initially using TypeScript scripts in the data/ directory.

Each city database contains thousands of entries in various formats. The data pipeline is as follows:
* Download a city's data with the <city>.ts script (e.g. losangeles.ts). The data is saved in <city>.json, containing latitude, longitude, and botanical name for each tree. 
* Run process.ts:
  * Combine all city data.
  * Strip cultivars from botanical names, to make canonicalization easier later.  (We may at some point want to keep the cultivar information.)
  * Canonicalize botanical names with a query to the GBIF API. 
  * Build a global list of tree types and write it to types.json.
  * Save a list of tree sites containing latitude/longitude and an index into the tree type list, to sites.json.
* Run build_data (Swift):
  * read types.json and sites.json; write binary versions that can take less space and can be loaded quickly by the app.

Before researching or adding cities, read and follow [city instructions](instructions/city-data.instructions.md).

Copilot may update `.github/instructions/city-data.instructions.md` as the city research workflow evolves, but must not modify `.github/copilot-instructions.md` unless the user explicitly requests it.


## App

Data is drawn on a Google Map.

Code conventions:
* use assert() instead of precondition().
