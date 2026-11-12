# Hyperspace Finder — Pokémon Legends: Z-A

Static, GitHub Pages-compatible frontend for exploring Hyperspace Wild Zone spawn pools from up to three in-game preview Pokémon. Supports both single-type source combinations and inferred two- or three-type source pool matching. No API keys, accounts, backend, build step, or third-party JavaScript are required. The database is pre-generated from the Serebii-based local importer, **not loaded from a live Google Sheet**.

## Quick start (Windows)

1. Extract this site directory into a local folder (or a new GitHub repository).
2. Open PowerShell **inside the folder** and run:

   ```powershell
   python -m http.server 8000
   ```

3. Visit <http://localhost:8000>. Avoid double-clicking `index.html` because `file://` browsers block `fetch()` of local JSON.
4. Select **Load example** to populate `Alolan Raichu`, `Flaaffy`, `Ampharos`, Electric, 4 stars. The selected possible match is `ELECTRIC-030`; other listed Pokémon include regular Raichu, Eelektrik, and Eelektross.

## Publish on GitHub Pages

1. Create a **public** repository, e.g. `hyperspace-finder` (required for GitHub Free Pages). Upload/commit all these files to the repository root.
2. In GitHub repository **Settings → Pages**, select **Deploy from a branch → main → / (root)**, then Save.
3. The address will normally be `https://YOUR-USERNAME.github.io/hyperspace-finder/`. All app paths are relative, so project-subpath hosting works.
4. In mobile Chrome, use **Add to Home screen / Install** to install it; the service worker caches the dataset for offline revisits after an initial successful load.

## Updating the dataset (from Google Drive for desktop)

The importer's source of truth remains your synced `Hyperspace Data` directory. The Google Sheet can be updated separately for manual checks.

```powershell
python .\tools\build_data.py --source "H:\My Drive\Personal Projects\Pokemon\Hyperspace combination finder\hyperspace_importer_starter\Hyperspace Data"
```

This writes `data/zones.json` based on the latest `Hyperspace Data\exports\encounters.json`. Commit the changed JSON to GitHub, and GitHub Pages serves the new version.

For images, the website **supports optional local image references**, but none are included in the starter ZIP. If you've checked that you have permission to redistribute image assets publicly, run with `--copy-images` to copy referenced, cached images into `assets/pokemon/` and include them in your GitHub commit. The script reads the local importer's `assets/remote_url_cache.json` to map URLs to the hashed filenames. If the importer has no valid cache mapping, the UI shows a letter placeholder instead.

**Do not publish your entire Google Drive folder**, private notes, or API credentials. Only the site files and curated data belong in the repository.

## Compact interface

The page uses a single, dense search/results workspace: observed Pokémon and filters across the top, matching combinations in a scrollable list, and the selected zone on the right. **Other possible Pokémon** are listed first; the three full spawn clusters and within-cluster rates appear underneath. The result list scrolls independently on desktop and horizontally on narrow screens. There are no promotional headings, decorative badges, or required multi-page navigation.

Selecting a combination preserves its zone ID in the shareable URL. Search inputs and results are updated immediately without a submit button. The site remains text-first, but the source JSON retains form keys for later image support.

## Matching rules

- **Confirmed matches** assign preview Pokémon to different documented spawn clusters, in any order. **Possible shared-cluster matches** include cases where all entered species/forms exist in the zone but two belong to the same cluster. Such cases are clearly labeled as tentative.
- Matching uses **every documented cluster member**, not just the representative focus Pokémon.
- Duplicate Pokémon can be matched to different clusters; a possible shared-cluster match requires distinct member records and is not considered confirmed.
- `matched` = distinct-slot match; `warning` = distinct-slot match with source concerns; `pool` = tentative full-pool match with shared clusters; `possible` = seven Special zones with unreliable slot assignments.
- Regional forms remain separate under their stored form keys. For example, `026-a` is offered as **Alolan Raichu** while a generic **Raichu** search can include both forms.
- Source rarity values are left unchanged, including when the source percentages sum above or below 100% or multiple forms share a name.
- Special-zone possible candidates are included on observed Pokémon overlap. Their absence from search results must **not** be treated as proof they are impossible: the source's slot assignments are incomplete.
- Single-type source-page matches and mixed-type inference are deliberately displayed separately. Zone size is not modeled.


## Mixed-type matching (inferred, not a zone catalog)

Choose a first type and optionally a second and third type, then enter the observed Pokémon and star rating. With one type, the finder uses the existing documented source-zone matching. With two or three types, it:

1. Filters every selected type's source-zone combinations to the **same star rating**. The chosen rating is strongly recommended; with "Any", it shows separate results by rating.
2. Considers different assignments of each preview Pokémon to one of the selected types. Regional forms are matched by their exact form identity. An assignment must be explainable by at least one compatible source combination for **every** selected type, but a type can have zero visible preview Pokémon.
3. Displays **independently compatible source patterns per type** (not a guessed cross-product of full zones). For each type it lists additional possible species, levels, source rarities, and how often each occurs among the compatible source patterns. Expand **Inspect source patterns** to view individual documented clusters.
4. Labels the whole result **Inferred**. The source guide says mixed zones can assemble clusters from different types but does **not** provide a definitive pairing map or exact cluster selection. Consequently a source pattern matching the input is **not proof that its other clusters actually appear** in this specific mixed zone. “X/Y source patterns” is not a spawn probability.

**Example:** choose Ghost + Normal, 3 stars, and enter `Lampent`, `Litwick`, `Porygon`. The finder finds 3 independently compatible Ghost source patterns and 2 Normal source patterns, and shows their other possible Pokémon. This is a set of leads, not six confirmed mixed zones.

Special/Legendary zones are not eligible for inferred mixing because their preview-slot assignments remain incomplete. Two or three identical type selections are not treated as a mixed zone.

### Regional forms

Alolan, Galarian, and Hisuian forms are distinguished when their stored Serebii sprite suffix and species identify a true regional form. Suffixes that mean something else (e.g. Heat Rotom) are not labeled Hisuian. Plain species names still match any form unless a region is stated explicitly.

## Tests

Requires Node.js, but only for tests (not for hosting):

```powershell
node --test tests\*.test.mjs
```

Data snapshot: 507 combinations, 467 matched, 33 warnings, 7 Special incomplete, 2,533 spawn records. Original encounter information: [Serebii Hyperspace Lumiose](https://www.serebii.net/legendsz-a/hyperspacelumiose.shtml).

Fan project. Pokémon characters and imagery are owned by their respective rights holders.

## Example that motivated the shared-cluster fallback

**Alolan Raichu + Flaaffy + Ampharos**, Electric, 4 stars is listed in the recorded spawn pool for `ELECTRIC-030` (Serebii 4-star Electric zone #10). Alolan Raichu occupies cluster 1, while Flaaffy and Ampharos are both recorded in cluster 2. The finder now displays this as **Possible · shared cluster**, not a falsely confirmed slot assignment.

Run `node --test tests/*.test.mjs` to verify all matching and UI smoke tests.
