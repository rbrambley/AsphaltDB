# Asphalt Legends Unite Database — Feature Ideas

A living list of possible enhancements. Items marked **Done** are already implemented; the rest are candidates for future work. Where a feature is partially complete, the note explains what is still missing.

## Data completeness & accuracy
- [x] Re-import the car roster from a more complete source to capture missing vehicles. — *Roster now 374 cars from Asphalt9.info / ASEC / Fandom.*
- [x] Backfill missing performance stats for cars that lacked stock/max values. — *All required stock/max performance fields are now populated.*
- [ ] Add EVO-specific data: EVO item slots, archetypes, max EVO rank, weight limits, and boost effects. — *15 cars are flagged `evoEligible`; `evoInfo` is mostly empty.*
- [ ] Add car thumbnails or icons for visual scanning.
- [~] Add release year for every car. — *Field exists; 367 of 374 cars are still `null`.*
- [~] Replace class-based rarity placeholders with authoritative rarity values. — *All cars have a `rarity` value, but `README.md` still notes these are baseline placeholders pending community review; distribution also suggests values may still be class-derived.*
- [~] Add blueprint source details per car (career season, event, hunt, shop, etc.). — *`blueprintSource` and `unlockMethod` exist; 263 cars still use the generic string `Career / Events / Shop`, 86 use `Career / Events / Card Packs`, and 25 are missing.*
- [~] Add full upgrade cost and import-parts requirements per car. — *`blueprintCount`, `commonParts`, `rareParts`, `epicParts`, `totalUpgradeCost` are mostly filled; `commonPartsCost`, `rarePartsCost`, `epicPartsCost`, and `upgradeCredits` are missing for 72–73 cars.*
- [~] Add fuel tank size and refill time per car. — *`fuelTank` and `refillTime` exist; 63 cars are missing these values.*
- [ ] Add Overclock Chip / Wild Card support data if applicable.
- [ ] Show a "last updated" timestamp per data source.

## Correlation & analysis tools
- [x] Best cars for short Gauntlet tracks. — *Live on the Gauntlet helper page with a short-track score and manual lineup builder.*
- [x] **Track ↔ Car matchmaker** — for any track, find suitable cars. *Integrated into the Tracks page (`Cars` action) and the Cars page track filter; uses `recommendedTracks` and `recClasses` data.*
- [~] **Career race recommender** — show which owned cars meet the required rank for a given career race and which is statistically best. — *Career season/race browser is live; owned-car / rank recommendations are not yet added.*
- [x] **Blueprint farming planner** — for a selected car, list every career season and event that drops its blueprints, sorted by efficiency.
- [x] **Upgrade ROI calculator** — rank cars by stat/rank gain per credit spent.
- [x] **Event eligibility roster** — for any event, list every car that qualifies and highlight the strongest options. — *Live on the Roster page with owned/all toggle.*
- [ ] **Multiplayer tier list** — rank cars within each class for standard multiplayer and season series (MP2).
- [~] **Gauntlet lineup optimizer** — suggest the best 5-car defense roster for 30″ tracks, with EVO-aware recommendations. — *Manual 5-car lineup builder and opponent-aware recommendations are live; full EVO-aware auto-optimizer is not yet added.*
- [ ] **EVO build recommender** — suggest short-track vs. long-track EVO item builds for each EVO car.
- [ ] **Club / Team Pursuit recommendations** — suggest car compositions for asymmetric team modes.
- [x] **Side-by-side car comparison** — select two cars and compare all stats in one view, with better values highlighted.
- [x] **Season Pass mission solver** — pick a mission condition and find the best tracks, cars, and career race to complete it. — *Live on `seasonpass.html`.*

## Game modes & events
- [x] Gauntlet mode helper page (rules, 30″ tracks, short-track car ranking, lineup builder).
- [x] EVO Tuning page (EVO rules + EVO-eligible car list).
- [x] Full limited-time event calendar (Grand Prix, Special Events, Car Hunts, Spotlights) — *live calendar with status/type filters; sourced from asphaltlegends.com and Fandom Spotlight.*
- [ ] Grand Prix schedule with required cars and rewards.
- [ ] Special Event mission breakdowns with car/star requirements per stage.
- [~] Car Hunt schedule with featured cars and dates. — *Covered by the event calendar; dedicated Car Hunt page not yet added.*
- [ ] Gauntlet schedule, rotating tracks, and rewards.
- [ ] EVO Special Event / EVO Ranked schedule.
- [ ] Season Series (MP2) eligible car lists and best picks per league.

## Player-owned garage tools
- [x] **Garage tracker** — let users mark which cars they own, star level, rank, and EVO progress. — *In-browser add/edit on `garage.html` plus OCR import from screenshots; persists to `localStorage` / `js/garage_data.js`.*
- [x] **Side-by-side car comparison** — select two cars and compare all stats in one view.
- [x] **Favorite/bookmark cars** for quick access. — *Live on the Cars page with a Favorites filter.*
- [ ] **Build presets** — save and name custom EVO/build configurations.
- [~] **Export garage to CSV/JSON** for sharing or backup. — *JSON export/import is live on the Garage page; CSV export not yet added.*
- [x] **Import progress** from a saved file.

## Site & UX improvements
- [x] Responsive, mobile-first layout.
- [x] Light / dark / system theme switcher with persistence.
- [x] Collapsible card sections.
- [x] Sortable and filterable tables on all listing pages.
- [x] Compact hamburger navigation that works on all screen sizes.
- [~] Mobile card view alternative to wide tables. — *`data-label` attributes are injected; full card layout CSS is not complete.*
- [~] Sticky first column on mobile tables. — *Partial CSS exists; not fully wired across all tables.*
- [x] Global search bar that searches cars, tracks, events, and career seasons from any page.
- [ ] Keyboard shortcuts for common actions.
- [ ] Loading skeletons / spinners for large tables.
- [x] Service worker / PWA support for offline use. — *`sw.js`, `manifest.json`, and an install prompt are live.*
- [x] Tooltips explaining stat abbreviations and game terms.
- [ ] Breadcrumb navigation on inner pages.

## Community & maintenance
- [ ] "Report issue / Suggest edit" link per page.
- [ ] Changelog / update log tied to game patches.
- [~] Automated data refresh pipeline from Fandom / asphaltlegends.com — *Manual GitHub Actions workflow for the calendar exists (`update-calendar.yml`); car data is still refreshed manually via `scrape_cars.py`.*
- [~] Data validation checks (missing ranks, duplicate cars, broken links) — *`validate_data.py` and `validate.yml` run on CI; the report currently shows 11 warnings for missing career-race track links and ~750 strict-mode warnings for missing optional car fields (mostly `releaseYear`). Generic broken-link and JS-syntax checks are not yet wired.*
- [ ] GitHub Actions CI to verify links and JS syntax on every commit.
