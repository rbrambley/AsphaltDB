# Asphalt Legends Unite Database — Feature Ideas

A living list of possible enhancements. Items marked **Done** are already implemented; the rest are candidates for future work.

## Data completeness & accuracy
- [ ] Re-import the car roster from a more complete source to capture missing vehicles (e.g., Lamborghini Murciélago LP 640 Roadster and other newer cars).
- [ ] Backfill missing performance stats for cars that currently lack stock/max values.
- [ ] Add EVO-specific data: EVO item slots, archetypes, max EVO rank, weight limits, and boost effects.
- [ ] Add car thumbnails or icons for visual scanning.
- [ ] Add release year for every car (currently missing for some).
- [ ] Replace class-based rarity placeholders with authoritative rarity values.
- [ ] Add blueprint source details per car (career season, event, hunt, shop, etc.).
- [ ] Add full upgrade cost and import-parts requirements per car.
- [ ] Add fuel tank size and refill time per car.
- [ ] Add Overclock Chip / Wild Card support data if applicable.
- [ ] Show a "last updated" timestamp per data source.

## Correlation & analysis tools
- [x] Best cars for short Gauntlet tracks.
- [ ] **Track ↔ Car matchmaker** — for any track, recommend the top 3 cars per class based on length, hazards, and stat profile.
- [ ] **Career race recommender** — show which owned cars meet the required rank for a given career race and which is statistically best.
- [ ] **Blueprint farming planner** — for a selected car, list every career season and event that drops its blueprints, sorted by efficiency.
- [ ] **Upgrade ROI calculator** — rank cars by stat/rank gain per credit spent, helping players prioritize garage upgrades.
- [ ] **Event eligibility roster** — for any event, list every car that qualifies and highlight the statistically strongest options.
- [ ] **Multiplayer tier list** — rank cars within each class for standard multiplayer and season series (MP2).
- [ ] **Gauntlet lineup optimizer** — suggest the best 5-car defense roster for 30″ tracks, with EVO-aware recommendations.
- [ ] **EVO build recommender** — suggest short-track vs. long-track EVO item builds for each EVO car.
- [ ] **Club / Team Pursuit recommendations** — suggest car compositions for asymmetric team modes.

## Game modes & events
- [x] Gauntlet mode helper page (rules, 30″ tracks, short-track car ranking, lineup builder).
- [x] EVO Tuning page (EVO rules + EVO-eligible car list).
- [ ] Full limited-time event calendar (Grand Prix, Special Events, Car Hunts, Spotlights, Mayhem).
- [ ] Grand Prix schedule with required cars and rewards.
- [ ] Special Event mission breakdowns with car/star requirements per stage.
- [ ] Car Hunt schedule with featured cars and dates.
- [ ] Gauntlet schedule, rotating tracks, and rewards.
- [ ] EVO Special Event / EVO Ranked schedule.
- [ ] Season Series (MP2) eligible car lists and best picks per league.

## Player-owned garage tools
- [ ] **Garage tracker** — let users mark which cars they own, star level, rank, and EVO progress.
- [ ] **Side-by-side car comparison** — select two or more cars and compare all stats in one view.
- [ ] **Favorite/bookmark cars** for quick access.
- [ ] **Build presets** — save and name custom EVO/build configurations.
- [ ] **Export garage to CSV/JSON** for sharing or backup.
- [ ] **Import progress** from a saved file.

## Site & UX improvements
- [x] Responsive, mobile-first layout.
- [x] Light / dark / system theme switcher with persistence.
- [x] Collapsible card sections.
- [x] Sortable and filterable tables on the dashboard.
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
- [ ] Automated data refresh pipeline from Asphalt Wiki / Asphalt9.info.
- [ ] Data validation checks (missing ranks, duplicate cars, broken links).
- [ ] GitHub Actions CI to verify links and JS syntax on every commit.
