This is source code for an app so people can identify trees in their neighborhoods.
This app is open source and non-commercial.

## Data
Data comes from publicly available city data maintained by their landscaping departments. We download and process the data initially using TypeScript scripts in the data/ directory.
(Note that while we say "city" in this documentation, the databases could be from counties, provinces, states, etc.)

Each city database contains thousands of entries in various formats. The data pipeline is as follows:
* Download a city's data with the data/cities/<city>.ts script (e.g. losangeles_ca_us.ts). The data is saved in data/cities/<city>.json, containing latitude, longitude, and botanical name for each tree ("site").
  * Combine all cities' site data.
  * "Normalize" botanical names: strip cultivars, standardize spacing and capitalization and hybrid formatting, etc.
  * "Canonicalize" botanical names with a query to the GBIF API to find an accepted latin name.
  * Build a list of unique tree types from the list of sites, adding common names and Wikipedia URLs when available.
  * Save the tree types to types.json.
  * Convert the botanical name in each site to an index into the tree type list, and save the tree sites to sites.json.
* Run build_data (Swift):
  * read types.json and sites.json; write binary versions that can take less space and can be loaded quickly by the app.
* Run upload.ts to upload the binary data to a public storage bucket.

There is more detailed information on how data is added and processed in the data [README](/data/README.txt).

Before researching or adding cities, Agents should read and follow [city instructions](/agents/city-data.instructions.md). 
Cities that have been considered previously should be stored in the [candidate list](/agents/city-candidates.json).
When looking for data for a city, prefer government "open data" sites to community projects. Many cities have multiple databases available; if so, try to use the largest and most up-to-date one.
When asked to find additional cities, in the absence of other specific criteria specified, consider candidates in the candidate list first. 
Agents may update the city instructions file as the city research workflow evolves, and otherwise add or edit files in the /agents directory, but must not modify AGENTS.md unless the user explicitly requests it. The goal of the city data instructions is to help Agents add more databases efficiently.


## App

Tree data is drawn on a Google Map.
Primary development is done on iOS; changes are then ported to Android.
When porting, keep in mind that keeping the Kotlin code roughly analogous to the Swift code makes maintenance easier.

Throw or print errors only for situations that arise due to situations beyond our control (such as network errors, running out of storage space, etc).  If, for example, some binary data is not in the expected format, this is a situation that indicates an error on our part, so the code should assert, or just crash.  So, prefer non-nil asserts ("!" in Swift) to guard statements when a value really should be non-nil, as an example.


## Documentation

Do not modify data/README.txt or any other documentation files.  If they need updating, notify me and I will do it.
