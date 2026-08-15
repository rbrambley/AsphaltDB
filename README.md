# Asphalt Legends Unite Database

A static, multi-page reference site for **Asphalt Legends Unite**.

- **Cars Database** – full car roster (374 cars, classes D–S) with stock/max ranks from Asphalt Wiki and performance stats from Asphalt9.info / ASEC, with most values backfilled.
- **Tracks Reference** – 208 routes/locations with length, difficulty and hazards.
- **Career Progression** – all 6 chapters, 90 seasons and 1,076 race entries.
- **Recurring Events** – daily, weekly and special limited-time events.
- **Unified Dashboard** – cross-reference cars, tracks, career seasons and events with live filters.

## Data sources

- Car stats: [Asphalt9.info](https://asphalt9.info/)
- Career & track data: [Asphalt9.info](https://asphalt9.info/) and [Asphalt Fandom](https://asphalt.fandom.com/)
- Calendar events: [Asphalt Fandom](https://asphalt.fandom.com/) and [asphaltlegends.com](https://asphaltlegends.com/)

Most performance stats, blueprint counts, and upgrade costs are now backfilled from Asphalt9.info / ASEC. Rarity, release year, blueprint source details, and a small number of cost/fuel fields are still placeholders or incomplete; see `FEATURES.md` and `ROADMAP.md` for the current data-quality status.

## My Garage (OCR from screenshots)

You can import your actual in-game garage from screenshots. The parsed data is committed to `js/garage_data.js` so it is available on the live site and on any device.

### One-time setup

1. Install Tesseract OCR: https://github.com/UB-Mannheim/tesseract/wiki
2. Make sure `tesseract.exe` is on your PATH, or edit `scripts/update_garage.py` to set `pytesseract.pytesseract.tesseract_cmd` to the full path.
3. Install the Python dependencies:

```bash
pip install pytesseract pillow
```

### Updating your garage

1. Save car-detail screenshots to `garage-screenshots/` (PNG or JPG). The filenames do not matter — the script reads the car name from the image.
2. Run the update script:

```bash
python scripts/update_garage.py
```

3. Review `js/garage_data.js` and the optional `garage_review.json` for any low-confidence parses.

The script merges by the car's matched name, so re-scanning the same car updates its entry. The most recent screenshot (by file modification time) wins if a car appears more than once.
4. Commit and push:

```bash
git add js/garage_data.js
git commit -m "Update garage data"
git push
```

The `garage-screenshots/` folder should not be committed — screenshots stay local and are only used for OCR.

## Updating car data

Car stats, rarity, blueprint counts, and upgrade costs can be refreshed from [Asphalt9.info](https://asphalt9.info/):

```bash
pip install -r requirements.txt
python scripts/scrape_cars.py --dry-run      # preview what will change
python scripts/scrape_cars.py                # backfill missing fields
python scripts/validate_data.py              # check for duplicates and broken links
```

Run `python scripts/scrape_cars.py --help` for options such as `--class D`, `--force`, and `--refresh-slugs`.

## Manually updating cars

Cars that the scraper cannot match appear on the **Manual Cars** page (`manual_cars.html`):

1. Open `manual_cars.html` in a browser.
2. Click **Edit** for any car in the queue.
3. Fill in the missing fields and save. The car leaves the queue once all tracked fields are populated.
4. When finished, either:
   - click **Download merged data.js** to get a complete `data.js` with your edits applied, or
   - click **Export manual cars JSON** and run the merge command:

```bash
python scripts/merge_manual_cars.py manual_cars.json
```

Use `--dry-run` to preview the merge without writing to `js/data.js`.

## Updating calendar data

The calendar can be refreshed from the latest online sources:

1. Go to **Actions → Update Calendar Data → Run workflow**.
2. Paste the current asphaltlegends.com season URL (e.g., `https://asphaltlegends.com/news/touge-masters`).
3. Choose whether to refresh the Fandom Spotlight list.
4. Click **Run workflow**. The workflow will update `js/data.js` and push the changes.

Or run locally:

```bash
python scripts/update_calendar.py --season-url https://asphaltlegends.com/news/touge-masters --spotlight
```

## Hosting

This is a plain static site. To publish:

1. Push the entire `AsphaltDB` folder to a GitHub repository.
2. Go to **Settings → Pages**.
3. Select **Deploy from a branch** → `main` or `master` → `/ (root)`.
4. Your site will be available at `https://<username>.github.io/<repo-name>/`.

All CSS, JavaScript and data are included in the repository, so the site works offline after the first load and requires no external dependencies.

## Local preview

Open any HTML file directly in a browser, or run a local server:

```bash
python -m http.server 8080
```

Then visit `http://localhost:8080`.
