# Hyperspace Finder — Pokémon Legends: Z-A

Static, GitHub Pages-compatible frontend for identifying Hyperspace Wild Zone combinations from up to three in-game preview Pokémon. No API keys, accounts, backend, build step, or third-party JavaScript are required. The database is pre-generated from the Serebii-based local importer, **not loaded from a live Google Sheet**.

## Quick start (Windows)

1. Extract this site directory into a local folder (or a new GitHub repository).
2. Open PowerShell **inside the folder** and run:

   ```powershell
   python -m http.server 8000
   ```

3. Visit <http://localhost:8000>. Avoid double-clicking `index.html` because `file://` browsers block `fetch()` of local JSON.
4. Hit **Try an example**: the input `Patrat`, `Bunnelby`, `Buneary`, Normal, 2 stars includes zone `NORMAL-011`. The first preview Pokémon isn't the Serebii focus representative, so this checks that cluster-member matching works.

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

## Matching rules

- Three preview Pokémon are matched to three **different** spawn clusters by backtracking through all valid assignments. The order of preview inputs does not matter.
- Matching uses **every documented cluster member**, not just the representative focus Pokémon.
- Duplicate Pokémon in the preview are supported only if they can be assigned to different clusters.
- `matched` = full three-cluster data; `warning` = full three-cluster data with source concerns; `possible` = seven Special zones where reliable slot assignment is unavailable.
- Source rarity values are left unchanged, including when the source percentages sum above or below 100% or multiple forms share a name.
- Special-zone possible candidates are included on observed Pokémon overlap. Their absence from search results must **not** be treated as proof they are impossible: the source's slot assignments are incomplete.
- Source-page type and star are filters. Zone size and mixed-type assembly are **not** validated by this dataset and are intentionally not inferred.

## Tests

Requires Node.js, but only for tests (not for hosting):

```powershell
node --test tests\matcher.test.mjs
```

Data snapshot: 507 combinations, 467 matched, 33 warnings, 7 Special incomplete, 2,533 spawn records. Original encounter information: [Serebii Hyperspace Lumiose](https://www.serebii.net/legendsz-a/hyperspacelumiose.shtml).

Fan project. Pokémon characters and imagery are owned by their respective rights holders.
