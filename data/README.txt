# How to build data

* run scripts in cities/ (e.g. cities/portland_me_us.ts) to export latitude, longitude, and scientific name to cities/<city>.json

* run process.ts to combine all <city>.json to global sites.json and types.json 
  * filters out obviously bad data
    * locations too far from the city median location
    * names in a discard list (discard_manual.json)
  * normalizes raw text: makes lowercase, strips extra whitespace, converts all quotes to single quotes, etc
  * normalizes botanical name: strip cultivar info (which interferes with canonicalization)
    * TODO: keep the cultivar info, and figure out how to canonicalize it
    * we use a heuristic method to strip the cultivar, except for names in manually maintained dictionaries:
       * where name contains only genus and cultivar (normalize_genus_cultivar_manual.json)
       * where the heuristic method fails obviously (normalize_manual.json)
  * canonicalizes botanical names
    * we canonicalize with a lookup to the GBIF API, except for names in manually maintained dictionaries:
       * where the GBIF lookup fails obviously (canonicalize_manual.json)
       * TODO hybrid special handling?
    * canonicalization API lookups are cached (canonicalize_cache.json) to make future lookups faster
    * TODO explain manual
    * if all we have is a genus, it's ok to canonicalize to just a genus.
  * finds common names for each botanical name
  * looks for Wikipedia URLs for each botanical name

* run macOS build_data utility 
  * build ios/trees/tiles/types.bin from types.json
  * build binary tiles from sites.json
    * manifest.bin describes overall tree structure
    * top level (less-detailed) tiles are written to ios/trees/tiles/<z>/<x>/<y>.bin
    * lower level (more detailed) tiles are written to data/tiles, to be uploaded to Google Cloud bucket

* run upload.ts to upload tiles to a Google Cloud storage bucket


# How to add data

* to add a city, add a script to cities/, and add an entry for the city to cities.json.
* run process.ts (see above) to build the data with the new city.
* you may want to update the manually mantained JSON files described above to handle any new names. (Typically this is done with an AI agent.)
  * look in normalize_debug_stripped.json and normalize_debug_unstripped.json for any keys that are obviously not botanical names ("stump", "vacant site", common names like "palm" that do not correspond to a specific genus, etc), and add them to discard_manual.json.
  * look in normalize_debug_stripped.json and normalize_debug_unstripped.json for obvious normalization mistakes (e.g. where cultivar is obviously still present in the value) and add a corrected entry to normalize_manual.json.
  * look in normalize_debug_stripped.json for entries where the cultivar was stripped leaving only a genus (for example, "ilex 'Wilsonii'" -> "ilex").  If the cultivar and genus provide enough information to identify a species, put that mapping into normalize_genus_cultivar_manual.json (e.g. "ilex x altaclarensis").
  * look in canonicalize_debug_failed.json for entries that failed canonicalization from the GBIF API but for which a canonicalization is obvious (for example "cedrus" fails, but clearly should be the genus "cedrus"; or "freeman maple" can pretty confidently be mapped to "acer × freemanii").  Add these to canonicalize_manual.json.
  * look in canonicalize_debug_succeeded.json for entries that are obviously wrong (for example, stripping a species from a valid botanical name), and add corrections to canonicalize_manual.json.
  * when updating *_manual.json files, add entries only when you're reasonably sure that mapping is correct, to prevent erroneous mappings.
