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
Cities that have been considered previously should be stored in the [candidate list](/agents/city_candidates.json).
When looking for data for a city, prefer government "open data" sites to community projects or feeds from commercial organizations. Many cities have multiple databases available; if so, try to use the largest and most up-to-date one. 
When asked to find additional cities, in the absence of other specific criteria specified, consider candidates in the candidate list first. If there are no good candidates there, prioritize by city population.
Agents may update the city-data.instructions.md file as the city research workflow evolves, and otherwise add or edit files in the /agents directory, but must not modify AGENTS.md unless the user explicitly requests it. The goal of the city data instructions is to help Agents add more databases efficiently.
When adding a city, fill out license information if available, following the examples. Possible license keys:
  * api_url: the primary URL from which we download data
  * portal_url: a corresponding web portal, friendly to human readers, if any.
  * license: url of the license of the data, if any.
  * license_name: name of the license, if any.
  * dataset_name: official name of the dataset, if any
  * attribution_name: name of entity to which credit should be attributed, if any
  * attribution_url: url to which credit should be attributed, if any
  * terms_url: url to specific terms of use of data, if any
  * last_updated: set to an emtpy string if license terms require date of access; value will be set when data is built.
  * notices: additional text required by license, if any.  (Keep this minimal; add only what is required for licensing.)
  * If the license may be prohibitive for our use, include a comment in "license_comment".
Do not invent new license keys. Keep license text to the minimum that satisfies known requirements.


## App

Tree data is drawn on a Google Map.

App development is done on iOS first and then ported to Android (apart from Android- or iOS-specific features).  When porting, we try to keep the Kotlin source with the same structure, order, comments and whitespacing as the Swift source, apart from language- or OS-specific requirements; this makes later maintenance easier.

Throw or print errors only for situations that arise due to situations beyond our control (such as network errors, running out of storage space, etc).  If, for example, some binary data is not in the expected format, this is a situation that indicates an error on our part, so the code should assert, or just crash.  So, prefer non-nil asserts ("!" in Swift) to guard statements when a value really should be non-nil, as an example.


## Documentation

Do not modify data/README.txt or any other documentation files.  If they need updating, notify me and I will do it.


## Swift code conventions

Prefer explicit if statements to guard statements.
Prefer assert() to precondition().

## Porting to Android

Kotlin has some syntactic constructs that are conventional in Kotlin but have no Swift equivalents.  Typically we avoid using these in favor of keeping the code similar.  For example, in Swift:

```
if let x = getValue() {
  // do something
}
```

when porting to Kotlin, we keep it similar:

```
val x = getValue()
if (x != null) {
  // do something
}
```

similarly, don't use:
```
  val get() = <expr>
```

but instead use this, which is closer to Swift:
```
  val get() { return <expr> }
```

Use this construction:
```
   val activity = this
   someFunction() { activity.doSomething() }
```

rather than
```
   someFunction() { this@MyActivity.doSomething() }
```

But don't forgo a Kotlin construction in Android-specific code, or if the alternative would be much more verbose than Swift. 

Prefer constructors to init blocks if practical, to keep the code similar to Swift.

When porting a component, if it relies on other classes that have not yet been ported, comment that clearly and implement stubs.

Use the same fonts, font sizes, font styles, and colors on corresponding components in the iOS and Android versions. Make paddings, margins, spacings, sizes, etc the same. If an item is aligned vertically relative to the top-level view, use a Guideline to make similar positioning.

If the iOS version references an image asset or icon that isn't there on Android, don't generate one; just alert the user, who will import it.

Remove unused imports. Avoid wildcard imports.

When checking a version at runtime, use the SDK number instead of the name (e.g. 34 instead of Build.VERSION_CODES.UPSIDE_DOWN_CAKE).

