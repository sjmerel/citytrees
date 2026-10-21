---
applyTo: "data/**,.github/city_candidates.json"
---

# City research and imports

Copilot may update this file to preserve verified workflow improvements across sessions. Do not modify `.github/copilot-instructions.md` unless the user explicitly requests it.

When adding a new city, prefer government "open data" sites to community projects. Many cities have multiple databases available; if so, try to use the largest and most up-to-date one.

## City research across sessions

Before researching or adding cities, read `.github/city_candidates.json`, `data/cities.json`, and the relevant existing importers in `data/cities/`. Search both the ledger's city index and research subjects/text: broad batch-only subjects may not have their own city entry.

Use `.github/city_candidates.json` as the authoritative shared research ledger, not as an input to the data pipeline. `data/cities.json` remains authoritative for registered datasets. City-specific notes formerly appended to `data/README.txt` and the former rejection log have been migrated, including their original wording, caveats, contradictions, and batch headers. The README retains build instructions. No legacy source was freshly verified during migration.

## Ledger schema (format_version 2)

The normalized ledger shares evidence through stable record IDs rather than copying long batch notes into every city.

* `cities`: one indexed entry per known `(place, region, country)` tuple, with a stable `id`. Use country codes and `null` for unknown region/country. A place can be a city, county, regional inventory, or explicitly labeled nonmunicipal candidate. Individual/small-group findings, relevant registered places, and the five original seed candidates are indexed; subjects mentioned only in broad batches need not have city entries.
* Each city has `research_ids`, `status`, `last_researched_on`, and either a concrete `next_action` or `next_action_id` referencing `actions`. Place statuses are `research_needed`, `ready_to_import`, `deferred`, `rejected`, or `registered`. A `registered` entry has a valid `registered_code` from `data/cities.json`; this means an importer is registered, **not** that every historical source was accepted, just verified, or supplies full-city coverage. Use `coverage_note` and `related_registered_codes` for limitations or separate nearby/regional coverage. Do not convert a source rejection into a city rejection.
* `implementation` links a registered city's `importer` and literal `source_references` found in that script, each with `{path, line}` provenance. These are code references, not live checks. Exact research-URL matches may have `importer_matches` naming the city ID and importer line. A similar city name, hostname, or source title is not evidence that two sources match.
* `research`: stable-ID records of kind `finding`, `group`, or `context`. Legacy IDs encode the original document and line; never renumber them when editing the ledger. Every nonempty line from the former rejection log, and every city-research line from the original README, is preserved exactly in a record's `text` with `origin: {path, line}`. Those paths/line numbers describe the original documents, not their current layout. `source_documents` records the original UTF-8 document hashes, research start lines, and nonempty evidence-line counts.
* A `context` record preserves an original header; `context_id` links findings to that header. Other records have explicit searchable `subjects` and `city_ids` linking any indexed places. A group's `city_ids` can be a subset of its subjects. Labels lacking reliable geography remain unlinked; do not guess a state/country from a name or silently assign every endpoint to every subject. Split later source-specific checks into new findings, keeping the shared original group intact.
* Findings have `assessment`, `checked_on`, `reason_codes`, and `next_action_id`. `historical_research` preserves a prior observation, not a current rejection; `historical_import_note` preserves an implementation note, not fresh verification. `reason_codes` are search/follow-up categories for the **whole record**, not a verdict on each subject or endpoint. `actions` maps reusable action IDs (including reason codes) to concrete follow-ups. Begin grouped follow-up with `disambiguate_group`, then consult its reason-code actions.
* `source_references` on research records preserve exact recorded strings as `value`, with `kind: url`, `host_or_path`, or `incomplete_reference`, and `checked_on`. Do not complete abbreviated URLs by guessing. References belong to the record; a URL may be a catalog page, lookup table, misleading candidate, or different city's service, not necessarily a tree endpoint. Counts, fields, exclusions, dates, workarounds, and conflicting claims remain in the exact `text`; extract structured details into a new source-specific finding when revisiting them.
* The five seed cities retain their original `sources`, evidence, statuses, structured counts/fields, and concrete next actions. Each seeded source's `research_id` links its original evidence; `seed_origin` identifies the original ledger version. Source statuses are `unverified`, `usable`, `blocked`, `rejected`, or `added`. These historical source assessments do not override the current registry.

## Adding and revisiting research

* Add a new uniquely identified research record for a real check; link it from the city and link back through `city_ids`. Use descriptive stable IDs for new cities/records; original line-number IDs are migration provenance only. Keep IDs and place tuples unique, action/context/research/city references valid, and registered codes synchronized with `data/cities.json`.
* Record a precise source URL, publisher, inventory/survey dates, raw and usable counts, botanical-name fields or code lookups, coordinate availability, provenance/license evidence, and a reason and next action when known. These may be structured fields on a source-specific finding or source object; retain the supporting evidence. Use `null` for unknown dates. A known year in a batch title, survey, or service name is **not** a check date. Do not update `checked_on` or `last_researched_on` unless research actually occurred (YYYY-MM-DD).
* Preserve historical records verbatim. Append a new finding and explain what it supersedes rather than overwriting an old claim or assuming an old rejection still holds. Existing registered coverage takes precedence over older "not found" or "not added" assertions, but never establishes that an alternative source is usable.
* Verify sample records, actual geography, public bulk access, and scientific names before marking a source usable. A field called "species" may contain common names, codes, or placeholders. Codes are acceptable with a verified botanical-name crosswalk; genus-only records are usable. Exclude vacant sites, stumps, and other non-tree records.
* Prefer larger, current inventories, but do not turn a discovery script's record-count threshold into a permanent acceptance rule. Record coverage limitations, overlap with existing datasets, and the usable record count rather than just the raw count.
* Treat "not found" as a dated, limited search result, not proof that a dataset does not exist. Record search scope and a next avenue to try. Revisit earlier rejections when new evidence or sources appear.
* For a new import, mark the specific source `added` only after validating the importer and downloaded output and registering it in `data/cities.json`. Set the city's status to `registered`, include the code/importer, and document partial coverage or unresolved intended coverage explicitly. Do not mark historical alternative sources `added` merely because that place now has an importer.

Record all new research and importer caveats in the ledger rather than creating another rejection log or appending city notes to the build README. Do not overwrite unrelated in-progress edits.
