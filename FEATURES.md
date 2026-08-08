# Asphalt Legends Unite Database — Feature Ideas

A living list of possible enhancements. Items marked **Done** are already implemented; the rest are candidates for future work.

## Data completeness & accuracy
- [x] Re-import the car roster from a more complete source to capture missing vehicles (e.g., Lamborghini Murciélago LP 640 Roadster and other newer cars). — *Roster now 349 cars from Asphalt9.info.*
- [~] Backfill missing performance stats for cars that currently lack stock/max values. — *Most backfilled; newer cars and some older entries still pending.*
- [ ] Add EVO-specific data: EVO item slots, archetypes, max EVO rank, weight limits, and boost effects.
- [ ] Add car thumbnails or icons for visual scanning.
- [~] Add release year for every car (currently missing for some). — *Column present in the database; still incomplete.*
- [~] Replace class-based rarity placeholders with authoritative rarity values. — *Rarity column displayed, but values are baseline placeholders derived from class.*
- [~] Add blueprint source details per car (career season, event, hunt, shop, etc.). — *`blueprintSource` / `unlockMethod` columns shown and used by the Farming planner; full sourcing still pending.*
- [~] Add full upgrade cost and import-parts requirements per car. — *`totalUpgradeCost` powers the ROI calculator and an `upgradeCost` field is shown; import-parts requirements not yet added.*
- [ ] Add fuel tank size and refill time per car.
- [ ] Add Overclock Chip / Wild Card support data if applicable.
- [ ] Show a "last updated" timestamp per data source.

## Correlation & analysis tools
- [x] Best cars for short Gauntlet tracks. — *Live on the Gauntlet helper page with a short-track score.*
- [x] **Track ↔ Car matchmaker** — for any track, recommend the top 5 cars per class based on length, hazards, and stat profile. *Integrated into the Tracks page; no standalone page.*
- [~] **Career race recommender** — show which owned cars meet the required rank for a given career race and which is statistically best. — *Career season/race browser is live; owned-car recommender not yet added.*
- [x] **Blueprint farming planner** — for a selected car, list every career season and event that drops its blueprints, sorted by efficiency.
- [x] **Upgrade ROI calculator** — rank cars by stat/rank gain per credit spent, helping players prioritize garage upgrades.
- [x] **Event eligibility roster** — for any event, list every car that qualifies and highlight the statistically strongest options.
- [ ] **Multiplayer tier list** — rank cars within each class for standard multiplayer and season series (MP2).
- [ ] **Gauntlet lineup optimizer** — suggest the best 5-car defense roster for 30″ tracks, with EVO-aware recommendations. — *Manual 5-car lineup builder is live; auto-optimizer not yet added.*
- [ ] **EVO build recommender** — suggest short-track vs. long-track EVO item builds for each EVO car.
- [ ] **Club / Team Pursuit recommendations** — suggest car compositions for asymmetric team modes.
- [x] **Side-by-side car comparison** — select two cars and compare all stats in one view, with better values highlighted.

## Game modes & events
- [x] Gauntlet mode helper page (rules, 30″ tracks, short-track car ranking, lineup builder).
- [x] EVO Tuning page (EVO rules + EVO-eligible car list).
- [x] Full limited-time event calendar (Grand Prix, Special Events, Car Hunts, Spotlights) — *live calendar with status filters; sourced from asphaltlegends.com and Fandom Spotlight.*
- [ ] Grand Prix schedule with required cars and rewards.
- [ ] Special Event mission breakdowns with car/star requirements per stage.
- [~] Car Hunt schedule with featured cars and dates. — *Covered by the event calendar; dedicated Car Hunt page not yet added.*
- [ ] Gauntlet schedule, rotating tracks, and rewards.
- [ ] EVO Special Event / EVO Ranked schedule.
- [ ] Season Series (MP2) eligible car lists and best picks per league.

## Player-owned garage tools
- [~] **Garage tracker** — let users mark which cars they own, star level, rank, and EVO progress. — *Garage can be imported from screenshots via OCR and is displayed; in-browser editing not yet available.*
- [x] **Side-by-side car comparison** — select two cars and compare all stats in one view.
- [ ] **Favorite/bookmark cars** for quick access.
- [ ] **Build presets** — save and name custom EVO/build configurations.
- [ ] **Export garage to CSV/JSON** for sharing or backup.
- [ ] **Import progress** from a saved file.

## Site & UX improvements
- [x] Responsive, mobile-first layout.
- [x] Light / dark / system theme switcher with persistence.
- [x] Collapsible card sections.
- [x] Sortable and filterable tables on the dashboard.
- [x] Compact hamburger navigation that works on all screen sizes.
- [ ] Mobile card view alternative to wide tables.
- [ ] Sticky first column on mobile tables.
- [ ] Global search bar that searches cars, tracks, events, and career seasons from any page.
- [ ] Keyboard shortcuts for common actions.
- [ ] Loading skeletons / spinners for large tables.
- [ ] Service worker / PWA support for offline use.
- [ ] Tooltips explaining stat abbreviations and game terms.
- [ ] Breadcrumb navigation on inner pages.

## Community & maintenance
- [ ] "Report issue / Suggest edit" link per page.
- [ ] Changelog / update log tied to game patches.
- [x] Automated data refresh pipeline from Fandom / asphaltlegends.com — *manual GitHub Actions workflow for calendar; car data still manual.*
- [~] Data validation checks (missing ranks, duplicate cars, broken links) — *Local validation in `update_garage` / `update_calendar` scripts; generic missing-rank / duplicate / broken-link checks and CI not yet wired.*
- [ ] GitHub Actions CI to verify links and JS syntax on every commit.
