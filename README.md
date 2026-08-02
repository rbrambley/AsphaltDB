# Asphalt Legends Unite Database

A static, multi-page reference site for **Asphalt Legends Unite**.

- **Cars Database** – full car roster (328 cars, classes D–S) with stock/max ranks from Asphalt Wiki and performance stats from Asphalt9.info where available.
- **Tracks Reference** – 208 routes/locations with length, difficulty and hazards.
- **Career Progression** – all 6 chapters, 90 seasons and 1,076 race entries.
- **Recurring Events** – daily, weekly and special limited-time events.
- **Unified Dashboard** – cross-reference cars, tracks, career seasons and events with live filters.

## Data sources

- Car stats: [Asphalt9.info](https://asphalt9.info/)
- Career & track data: [Asphalt9.info](https://asphalt9.info/) and [Asphalt Fandom](https://asphalt.fandom.com/)

Rarity, blueprint source, unlock method, upgrade cost and recommended tracks are baseline placeholders derived from class; they should be reviewed and improved by the community.

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
