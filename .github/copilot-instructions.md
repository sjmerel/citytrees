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

Before researching or adding cities, Copilot should read and follow [city instructions](instructions/city-data.instructions.md). 
Cities that have been considered previously should be stored in the [candidate list](city-candidates.json).
When looking for data for a city, prefer government "open data" sites to community projects. Many cities have multiple databases available; if so, try to use the largest and most up-to-date one.
When asked to find additional cities, in the absence of other specific criteria specified, consider candidates in the candidate list first. 
Copilot may update `.github/instructions/city-data.instructions.md` as the city research workflow evolves, but must not modify `.github/copilot-instructions.md` unless the user explicitly requests it. The goal of the city data instructions is to help Copilot add more databases efficiently.


## App

Data is drawn on a Google Map.

Code conventions:
* use assert() instead of precondition().
