# Asphalt Legends Unite Database — Implementation Roadmap

This roadmap turns the ideas in `FEATURES.md` into a practical, phased plan. The codebase is further along than an earlier version of this file suggested, so this version reflects the **actual** current state and the most sensible next steps.

## Phase 0 — Existing state (already done)
- [x] Multi-page static site with responsive, mobile-first layout.
- [x] Theme switcher (system / light / dark) with persistence.
- [x] Cars, Tracks, Career, Events, Season Pass, Calendar, EVO, Gauntlet, Compare, Garage, Farming, Upgrades, Roster, and Manual Cars pages.
- [x] Unified Dashboard linking cars ↔ tracks ↔ career ↔ events, with sortable/filterable sub-results.
- [x] Gauntlet helper page with 30″ tracks, short-track car ranking, and lineup builder.
- [x] EVO Tuning page with EVO-eligible car list.
- [x] Global search widget.
- [x] Tooltips on stat columns.
- [x] PWA support: service worker, manifest, and install prompt.
- [x] Favorites (star cars) on the Cars page.
- [x] Garage import/export in JSON and in-browser editing.
- [x] Upgrade ROI calculator.
- [x] Event eligibility roster (Roster page).
- [x] Blueprint farming planner.
- [x] Season Pass mission solver.

---

## Phase 1 — Data foundation (still the highest priority)
**Goal:** make the underlying data accurate and complete so later features can be trusted.

### Current data health (as of latest `validate_data.py` run)
- **374 cars**, **208 tracks**, **1,076 career races**, **48 calendar events**.
- Required fields all pass; **0 validation errors**.
- **11 warnings** for missing `track` values in career races (indices 484–494).
- `releaseYear` is `null` for **367 of 374 cars**.
- `rarity` is present for all cars but is still a baseline placeholder pending authoritative review.
- `blueprintSource` is generic (`Career / Events / Shop` or `Career / Events / Card Packs`) for **349 of 374 cars**; 25 are missing.
- `unlockMethod` is missing for **25 cars**.
- Import-parts costs (`commonPartsCost`, `rarePartsCost`, `epicPartsCost`) and `upgradeCredits` are missing for **72–73 cars**.
- `fuelTank` / `refillTime` are missing for **63 cars**.
- Only **15 cars** are flagged `evoEligible`; `evoInfo` is mostly empty.

### Remaining Phase 1 work
1. **Backfill missing performance stats**
   - Required stock/max stats are complete.
   - Remaining gaps are mostly optional cost/import fields (see counts above).
   - Run `python scripts/scrape_cars.py` to refresh `blueprintCount`, parts, fuel, `totalUpgradeCost`, etc.

2. **Authoritative car metadata**
   - Verify and replace `rarity` with real in-game values.
   - Add `releaseYear` for the 367 missing cars (likely manual or via a new Fandom/Wiki scraper).
   - Clean up `blueprintSource` / `unlockMethod` for the 25 missing entries and improve the generic strings.

3. **Cost & blueprint data**
   - Finish `commonPartsCost`, `rarePartsCost`, `epicPartsCost`, and `upgradeCredits` for the ~73 incomplete cars.

4. **EVO data**
   - Collect confirmed EVO cars and which update they belong to.
   - Add EVO item archetype / weight / boost data per EVO car (if available).

5. **Track data cleanup**
   - Fix the 11 career races with missing `track` values.
   - Continue verifying 30″/60″/90″/120″ timings and environment tags.

**Deliverable:** A clean, comprehensive `data.js` that passes validation checks with far fewer quality warnings.

---

## Phase 2 — Core correlation tools (mostly done)
**Goal:** turn the database into a decision-making assistant.

1. **Track ↔ Car matchmaker** — *[done]*. Cars page track filter and Tracks page `Cars` action.
2. **Career race recommender** — *[partial]*. Career browser is live; owned-car and rank recommendations are not yet added.
3. **Blueprint farming planner** — *[done]*.
4. **Event eligibility roster** — *[done]*.
5. **Upgrade ROI calculator** — *[done]*.

**Remaining deliverable:** Owned-car recommendations on the Career page.

---

## Phase 3 — Mode-specific optimizers
**Goal:** help with the game’s main competitive modes. *None of these are implemented yet.*

1. **Gauntlet lineup optimizer v2**
   - Use owned garage to propose the best 5-car defense.
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

## Phase 4 — Player garage & personalization (mostly done)
**Goal:** make the site useful for a specific player’s collection.

1. **Garage tracker** — *[done]*. In-browser add/edit plus OCR import from screenshots.
2. **Side-by-side car comparison** — *[done]*.
3. **Favorites & build presets** — *Favorites done; build presets not yet.*
4. **Export / import** — *JSON done; CSV not yet.*

**Remaining deliverable:** Build presets and CSV export.

---

## Phase 5 — Events calendar (partially done)
**Goal:** surface what is happening now and what to prepare for.

1. **Grand Prix schedule** — *Not yet.* Calendar view with required cars, dates, and rewards.
2. **Special Event / Car Hunt / Spotlight schedules** — *Calendar page covers Spotlights and time-limited events; dedicated Car Hunt page not yet.*
3. **EVO event schedule** — *Not yet.* Track EVO Special Events and EVO Ranked weeks.
4. **Season Series (MP2) eligible cars** — *Not yet.* Per season, list eligible cars and best picks per league.

**Deliverable:** A single Events Calendar page that pulls everything together with dedicated sub-pages for each event type.

---

## Phase 6 — UX, performance, and community
**Goal:** make the site fast, easy, and maintainable.

1. **Mobile card view** — *Partial.* `data-label` attributes are injected; full card CSS not complete.
2. **Sticky first column** — *Partial.* CSS exists but not fully wired.
3. **Global search** — *[done]*.
4. **Tooltips** — *[done]*.
5. **PWA / offline support** — *[done]*.
6. **Automated data refresh** — *Partial.* A weekly GitHub Action (`update-notifier.yml`) scrapes Game Update Notifier and opens a PR with new updates/calendar events; the season calendar can still be triggered manually via `update-calendar.yml`, and car data still requires `scrape_cars.py`.
7. **Data validation CI** — *Partial.* `validate.yml` runs `validate_data.py`; JS syntax and broken-link checks are not yet added.
8. **Contribution links** — *Not yet.* "Report issue / Suggest edit" links to GitHub.
9. **Changelog / update log** — *[done]*. `updates.html`, backed by `scripts/update_from_gameupdatenotifier.py` and the weekly `update-notifier.yml` workflow.
10. **Loading skeletons / spinners** — *Not yet.*
11. **Keyboard shortcuts** — *Not yet.*
12. **Breadcrumb navigation** — *Not yet.*

**Deliverable:** A polished, maintainable site that can be kept current with minimal manual work.

---

## Recommended order of execution

1. **Phase 1 data cleanup** is still the gate. Almost every useful recommendation depends on accurate `rarity`, `releaseYear`, blueprint/cost data, and EVO fields.
2. **Phase 2** only needs the Career owned-car recommender to be considered complete.
3. **Phase 3 and Phase 4** can be done in parallel once the data is clean; Phase 3 delivers more player value, Phase 4 improves stickiness.
4. **Phase 5** can start as soon as event schedules are collected.
5. **Phase 6** is ongoing polish and should be revisited after each major feature; the highest-impact quick wins are `Report issue` links, a changelog, and the missing CI checks.

## Quick wins that don’t need Phase 1
- "Report issue / Suggest edit" footer or per-page link.
- Changelog / update log.
- Loading skeletons for large tables.
- Keyboard shortcuts (e.g., `?` help, `/` for search).
- CSV export from the Garage page.
- Build presets for EVO configurations.
- Finish mobile card view and sticky first-column CSS.
