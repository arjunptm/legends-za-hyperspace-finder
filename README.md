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


## Aggregate other possible Pokémon (compact interface)

The results page now **lists additional possible Pokémon across all candidate source combinations before the combination list**. For example, a Normal 4-star search with Furfrou, Pidgeotto, and Pidgeot displays Drampa, Kangaskhan, and Kecleon together. Each entry indicates in how many candidate combinations it appears. For single-type searches, selecting an entry opens an associated source combination; mixed-type entries are informational because their exact source combinations are inferred.

This is a **union of candidates, not a guarantee that all are present together**. A count of 1/3 means one of three matching source combinations lists it; it is not a 33% spawn chance. For mixed-type matches, counts refer to the number of independently compatible source patterns, and the output is inferred rather than a verified assembled zone. The list is initially limited to 12 entries when there are many possibilities; you can expand it without changing search criteria.

## Browser startup and JavaScript updates

The GitHub Pages entrypoint `app.js` is a generated, self-contained classic script to
avoid cross-deployment module dependency failures and stale import caches. Its
sources are `matcher.mjs`, `discovery.mjs`, and `app-main.js`. After editing any
source file, run:

```powershell
python tools/build_app.py
node --test tests/*.test.mjs
```

Commit the generated `app.js` alongside source changes. The script reference in
`index.html` uses a version query string to avoid serving an incompatible older
script from a service-worker cache. When changing app versions, increment the
query string and the `CACHE` version in `sw.js` together. The page now displays
an explicit startup error instead of retaining "Loading encounter data" forever.

## Simple discovery summary

The **top** “Other possible Pokémon” list is simplified for quick decisions.
It merges cosmetic forms of the same species, prioritizes species that recur in
more matching possibilities, and uses plain-language summaries (“In most
possibilities”, “In some possibilities”, “In a few possibilities”). Those labels
are **not in-game spawn odds**: mixed-type source selection probabilities are
unknown. Explicit regional forms retain distinct names.

The selected-zone details beneath the summary remain fully numerical: original
rarities, levels, Alpha rates, source counts, and warnings are unchanged.


## Phone layout and quick-scan colors

The page includes a viewport meta tag, so phone browsers use responsive CSS
instead of shrinking the desktop interface. At narrow widths the preview
inputs and filters form two columns, candidate zones scroll horizontally,
and the detail view follows underneath. Inputs are 16px to avoid iOS auto zoom.

Only the top **Other possible Pokémon** cards use color:
- Green = **In most possibilities** (appears in at least 75% of relevant source records)
- Blue = **In some possibilities** (40% to under 75%)
- Sand = **In a few possibilities** (under 40%)

These percentages determine labels, **not spawn probabilities**. All detailed
spawn rates and source information remain unchanged. Run `node --test tests/*.test.mjs`
and check at 320px, 390px and desktop browser widths.