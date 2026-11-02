---
applyTo: "data/**,agents/city_candidates.json"
---

# City research and imports

Before researching cities, read `agents/city_candidates.json` and check `data/cities.json` and existing importers to avoid duplicating coverage.

* Prefer official municipal inventories with public bulk access. Verify actual geography, botanical-name values, survey dates, and usable tree counts, not just field names or service titles. Species codes need a reliable botanical crosswalk; valid genus-only names are acceptable.
* Prefer larger, current datasets, but do not reject useful coverage solely for an old size cutoff. Exclude vacant sites, stumps, modeled canopy points, and non-inventory data. Document partial coverage and overlap.
* The ledger has two alphabetical lists: `rejected` entries have `place` and `reason`; `research_further` entries have `place` and a concrete `next_step`. Include region/country in `place`, optional `urls` for useful exact source links, and `checked_on` (YYYY-MM-DD) only when a check date is known.
* Existing undated entries summarize historical research, not fresh verification. Rejections mean "not usable based on the last evidence," not permanent city blacklists. Revisit when new evidence appears; do not guess missing URLs, dates, or species.
* After research, update or move the concise entry rather than appending a history. Keep unresolved leads actionable. Once an importer and output are validated and registered in `data/cities.json`, remove that place from the ledger; record important source/parsing caveats beside the importer. Keep a narrowly labeled follow-up only if additional coverage remains unresolved.
* Keep the ledger small: no duplicated registry, research IDs, provenance hashes, or archived batch logs. Git history preserves earlier detail; `data/README.txt` is for build instructions.

Copilot may update this file as the workflow evolves, but must not modify `.github/copilot-instructions.md` unless the user explicitly requests it.
