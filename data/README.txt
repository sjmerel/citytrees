* create and run <city>.ts to export latitude, longitude, and scientific name to <city>.json
* run process.ts to combine to sites.json and types.json

TODO:
 improve cultivar stripping
 improve canonicalization
 add more cities
 keep cultivar information
 add manual overrides for problematic species text?

 take advantage of clustering of cities?
 use uint16 relative to enclosing rectangle to store lat/lon, to make files smaller?
 will london need special treatment because of longitude=0?
 AR view?
