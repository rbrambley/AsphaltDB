# Asphalt Legends Unite Database — Implementation Roadmap

This roadmap turns the ideas in `FEATURES.md` into a practical, phased plan. Each phase builds on the previous one, starting with data quality, then the highest-value correlation tools, then polish.

## Phase 0 — Existing state (already done)
- [x] Multi-page static site with responsive, mobile-first layout
- [x] Theme switcher (system / light / dark) with persistence
- [x] Cars, Tracks, Career, Events pages with search, filters, and sorting
- [x] Unified Dashboard linking cars ↔ career ↔ events, with sortable/filterable sub-results
- [x] Gauntlet helper page with 30″ tracks, short-track car ranking, and lineup builder
- [x] EVO Tuning page with EVO-eligible car list and filters

---

## Phase 1 — Data foundation (must be done before most correlation features)
**Goal:** make the underlying data accurate and complete so later features can be trusted.

1. **Re-import / expand the car roster**
   - Investigate why the Fandom parser missed newer cars (e.g., Lamborghini Murciélago LP 640 Roadster).
   - Either fix the parser or switch to a more complete source (Asphalt9.info car list pages, Fandom API, or a curated JSON).
   - Add missing vehicles and verify counts by class against the current game.

2. **Backfill missing performance stats**
   - 70+ cars currently lack stock/max stats.
   - Scrape Asphalt9.info car pages for Top Speed / Acceleration / Handling / Nitro at stock and max.
   - Mark remaining gaps with `null` and a data-quality note.

3. **Authoritative car metadata**
   - Replace class-based rarity placeholder with real rarity values.
   - Verify release years.
   - Add fuel tank / refill time if a reliable source exists.

4. **Cost & blueprint data**
   - Scrape Asphalt9.info Blueprints, Import Parts, and Upgrades tables.
   - Add `blueprintCount`, `commonParts`, `rareParts`, `epicParts`, `upgradeCost`, and `importCost` fields.

5. **EVO data**
   - Collect confirmed EVO cars and which update they belong to.
   - Add EVO item archetype / weight / boost data per EVO car (if available).

6. **Track data cleanup**
   - Verify all 30″/60″/90″/120″ track timings and environment tags.
   - Link each career race to its track object.

**Deliverable:** A clean, comprehensive `data.js` that passes validation checks (no missing keys, no broken links, no duplicate cars).

---

## Phase 2 — Core correlation tools (highest player value)
**Goal:** turn the database into a decision-making assistant.

1. **Track ↔ Car matchmaker**
   - For any track, recommend the top 3 cars per class.
   - Score formula: weight stats by track length (short → accel/handling/nitro; long → top speed/handling).
   - Add a new page or modal reachable from the Tracks table.

2. **Career race recommender**
   - On the Career page, for each season/race, show which owned cars (Phase 4 garage) meet the rank requirement.
   - If no garage data exists, show best available cars by class.

3. **Blueprint farming planner**
   - For a selected car, list every career season and event that can drop its blueprints.
   - Sort by "most efficient" (fewest races per blueprint, or known drop rates).

4. **Event eligibility roster**
   - For each event, list every qualifying car and highlight the statistically strongest.
   - Show class restrictions, track, and reward.

5. **Upgrade ROI calculator**
   - New page: rank cars by stat/rank gain per credit spent.
   - Let users filter by class and exclude cars they don’t own.

**Deliverable:** 3–5 new correlation pages/features that players can use immediately.

---

## Phase 3 — Mode-specific optimizers
**Goal:** help with the game’s main competitive modes.

1. **Gauntlet lineup optimizer v2**
   - Use owned garage (Phase 4) to propose the best 5-car defense.
   - Add track-specific picks based on the current Gauntlet rotation.
   - Warn if selected cars push the player into a higher league.

2. **EVO build recommender**
   - For each EVO car, suggest archetype/loadout presets: "Short Track", "Top Speed", "Balanced".
   - Show expected stat deltas and rank impact.

3. **Multiplayer tier list**
   - Rank cars per class for standard Multiplayer and Season Series (MP2).
   - Update weekly if meta shifts.

4. **Club / Team Pursuit suggestions**
   - Suggest team compositions and recommended cars for asymmetric team modes.

**Deliverable:** Each mode has a dedicated, actionable helper page.

---

## Phase 4 — Player garage & personalization
**Goal:** make the site useful for a specific player’s collection.

1. **Garage tracker**
   - UI to mark owned cars, star level, current rank, and EVO progress.
   - Persist in `localStorage`.

2. **Side-by-side car comparison**
   - Select 2–4 cars and compare all stats in one view.

3. **Favorites & build presets**
   - Bookmark cars.
   - Save named EVO/build configurations.

4. **Export / import**
   - Export garage and presets to JSON/CSV.
   - Import them back (useful for backups or sharing).

**Deliverable:** A fully personalized experience; all Phase 2 tools can use real garage data.

---

## Phase 5 — Events calendar
**Goal:** surface what is happening now and what to prepare for.

1. **Grand Prix schedule**
   - Calendar view with required cars, dates, and rewards.

2. **Special Event / Car Hunt / Spotlight schedules**
   - List upcoming and recurring events.
   - Show required/featured cars so players can farm ahead.

3. **EVO event schedule**
   - Track EVO Special Events and EVO Ranked weeks.

4. **Season Series (MP2) eligible cars**
   - Per season, list eligible cars and best picks per league.

**Deliverable:** A single Events Calendar page pulling everything together.

---

## Phase 6 — UX, performance, and community
**Goal:** make the site fast, easy, and maintainable.

1. **Mobile card view**
   - Optional card layout for tables on small screens.

2. **Sticky first column**
   - Keep row labels visible while scrolling wide tables.

3. **Global search**
   - One search box that searches cars, tracks, events, and career seasons from any page.

4. **Tooltips**
   - Explain stat names, rarity, EVO terms, etc.

5. **PWA / offline support**
   - Service worker + manifest so the site works offline.

6. **Automated data refresh**
   - Scheduled script to re-scrape Asphalt9.info / Fandom and open a PR.

7. **Data validation CI**
   - GitHub Action to verify links, JS syntax, and required fields on every commit.

8. **Contribution links**
   - "Report issue / Suggest edit" links to GitHub.

**Deliverable:** A polished, maintainable site that can be kept current with minimal manual work.

---

## Recommended order of execution

1. **Phase 1** is the gate. Almost every useful correlation feature depends on complete, accurate data.
2. **Phase 2** delivers the biggest player value per effort after the data is clean.
3. **Phase 3 and Phase 4** can be done in parallel once Phase 2 is stable.
4. **Phase 5** can start as soon as event schedules are collected.
5. **Phase 6** is ongoing polish and should be revisited after each major feature.

## Quick wins that don’t need Phase 1
- Global search widget
- Tooltips on stat columns
- Sticky first column on mobile tables
- "Report issue" footer link
