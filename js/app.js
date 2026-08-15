
(function () {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const fmt = (n) => n == null || n === '' ? '-' : Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
  const fix = (n) => n == null || n === '' ? '-' : Number(n).toFixed(Number(n) % 1 === 0 ? 0 : 2);
  const pair = (a, b) => (a == null && b == null) ? '—' : `${fix(a)} / ${fix(b)}`;
  const rarityClass = {
    'Common': 'badge-common', 'Uncommon': 'badge-uncommon', 'Rare': 'badge-rare',
    'Epic': 'badge-epic', 'Legendary': 'badge-legendary'
  };

  function makeCell(text, cls = '') {
    const td = document.createElement('td');
    td.textContent = text == null || text === '' ? '-' : text;
    if (cls) td.className = cls;
    return td;
  }

  function makeBadge(text) {
    const span = document.createElement('span');
    span.className = 'badge ' + (rarityClass[text] || '');
    span.textContent = text || '-';
    return span;
  }

  function renderTable(tbodyId, rows, rowFn) {
    const tbody = $(`#${tbodyId}`);
    if (!tbody) return;
    tbody.innerHTML = '';
    rows.forEach(item => {
      const row = document.createElement('tr');
      rowFn(item, row);
      tbody.appendChild(row);
    });
  }

  function initNav() {
    const toggle = $('.menu-toggle');
    const nav = $('#main-nav');
    const backdrop = $('.menu-backdrop');
    function setMenu(open) {
      if (!nav) return;
      const isOpen = Boolean(open);
      nav.classList.toggle('open', isOpen);
      document.body.classList.toggle('menu-open', isOpen);
      if (toggle) toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      if (backdrop) backdrop.classList.toggle('show', isOpen);
    }
    if (toggle && nav) {
      toggle.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
    }
    if (backdrop) {
      backdrop.addEventListener('click', () => setMenu(false));
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setMenu(false);
    });
    $$('nav a').forEach(a => {
      a.addEventListener('click', () => setMenu(false));
      const page = location.pathname.split('/').pop() || 'index.html';
      const target = a.getAttribute('href');
      if (target === page || (page === '' && target === 'index.html')) {
        a.classList.add('active');
        const group = a.closest('.nav-group');
        const title = group ? group.querySelector('.nav-group-title') : null;
        if (title) title.setAttribute('aria-expanded', 'true');
      }
    });
    $$('.nav-group-title').forEach(btn => {
      btn.addEventListener('click', () => {
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!expanded));
      });
    });
  }

  function initTheme() {
    const stored = localStorage.getItem('theme') || 'system';
    document.documentElement.setAttribute('data-theme', stored);
    const buttons = $$('.theme-btn');
    if (buttons.length) {
      const setActive = (val) => {
        buttons.forEach((btn) => {
          btn.setAttribute('aria-pressed', String(btn.dataset.themeValue === val));
        });
      };
      setActive(stored);
      buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
          const val = btn.dataset.themeValue;
          document.documentElement.setAttribute('data-theme', val);
          localStorage.setItem('theme', val);
          setActive(val);
        });
      });
    }
  }

  function initCollapsible() {
    $$('.card-header').forEach(h => {
      h.addEventListener('click', () => {
        const body = h.nextElementSibling;
        body.classList.toggle('collapsed');
        h.querySelector('.toggle').textContent = body.classList.contains('collapsed') ? '+' : '−';
      });
    });
  }

  // ---------- Generic table helpers ----------
  function compareValues(va, vb, dir) {
    const ta = typeof va, tb = typeof vb;
    if (ta === 'number' && tb === 'number') return (va - vb) * dir;
    return String(va == null ? '' : va).localeCompare(String(vb == null ? '' : vb)) * dir;
  }

  function setSortIndicators(table, key, dir) {
    table.querySelectorAll('th[data-sort]').forEach(th => {
      delete th.dataset.dir;
      if (th.dataset.sort === key) th.dataset.dir = dir === 1 ? 'asc' : 'desc';
    });
  }

  function initSortHeaders(table, onSort) {
    table.querySelectorAll('th[data-sort]').forEach(th => {
      th.classList.add('sortable');
      th.setAttribute('tabindex', '0');
      th.setAttribute('role', 'button');
      th.setAttribute('aria-label', `Sort by ${th.textContent.trim()}`);
      th.addEventListener('click', () => onSort(th.dataset.sort));
      th.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSort(th.dataset.sort);
        }
      });
      let startX, startY;
      th.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      }, { passive: true });
      th.addEventListener('touchend', (e) => {
        if (startX == null) return;
        const t = e.changedTouches[0];
        if (Math.abs(t.clientX - startX) < 10 && Math.abs(t.clientY - startY) < 10) {
          e.preventDefault();
          onSort(th.dataset.sort);
        }
        startX = startY = null;
      }, { passive: false });
    });
  }

  // ---------- UX helpers ----------
  function addManifestLink() {
    if ($('link[rel="manifest"]')) return;
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = 'manifest.json';
    document.head.appendChild(link);
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = '#0d47a1';
    document.head.appendChild(meta);
  }

  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    fetch('sw.js', { cache: 'no-store' })
      .then((res) => res.text())
      .then((text) => {
        const match = text.match(/CACHE_NAME\s*=\s*['"`]([^'"`]+)['"`]/);
        const version = match ? match[1] : '';
        const url = version ? `sw.js?${version}` : 'sw.js';
        navigator.serviceWorker.register(url, { updateViaCache: 'none' }).catch(() => {});
      })
      .catch(() => {
        navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {});
      });
  }

  function getFavorites() {
    try { return JSON.parse(localStorage.getItem('favorites') || '[]'); } catch { return []; }
  }
  function saveFavorites(list) { localStorage.setItem('favorites', JSON.stringify(list)); }
  function isFavorite(name) { return getFavorites().includes(name); }
  function toggleFavorite(name) {
    const list = getFavorites();
    const idx = list.indexOf(name);
    if (idx >= 0) list.splice(idx, 1); else list.push(name);
    saveFavorites(list);
    return idx < 0;
  }
  function makeFavButton(name, extra = '') {
    const btn = document.createElement('button');
    btn.className = 'fav-btn' + (isFavorite(name) ? ' active' : '');
    btn.title = 'Toggle favorite';
    btn.textContent = '★';
    if (extra) btn.dataset.extra = extra;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      btn.classList.toggle('active', toggleFavorite(name));
    });
    return btn;
  }

  function getLocalGarage() {
    try { return JSON.parse(localStorage.getItem('localGarage') || '[]'); } catch { return []; }
  }
  function saveLocalGarage(list) { localStorage.setItem('localGarage', JSON.stringify(list)); }
  function getGarage() { return getLocalGarage(); }
  function getGauntletLogs() {
    try { return JSON.parse(localStorage.getItem('gauntletRaceLogs') || '[]'); } catch { return []; }
  }

  function applySearchFromUrl() {
    const params = new URLSearchParams(location.search);
    const q = params.get('search');
    if (q) {
      const input = $('#cars-search') || $('#tracks-search') || $('#career-search') || $('#events-search') || $('#evo-search') || $('#roi-search') || $('#cal-search');
      if (input) { input.value = q; input.dispatchEvent(new Event('input')); }
    }
    const rec = params.get('rec');
    if (rec) {
      const selRec = $('#tracks-rec') || $('#cars-rec');
      if (selRec && [...selRec.options].some(o => o.value === rec)) {
        selRec.value = rec;
        selRec.dispatchEvent(new Event('input'));
        selRec.dispatchEvent(new Event('change'));
      }
    }
    const track = params.get('track');
    if (track) {
      const selTrack = $('#cars-track');
      if (selTrack && [...selTrack.options].some(o => o.value === track)) {
        selTrack.value = track;
        selTrack.dispatchEvent(new Event('input'));
        selTrack.dispatchEvent(new Event('change'));
      }
    }
    const cls = params.get('class');
    if (cls) {
      const selClass = $('#cars-class');
      if (selClass && [...selClass.options].some(o => o.value === cls)) {
        selClass.value = cls;
        selClass.dispatchEvent(new Event('input'));
        selClass.dispatchEvent(new Event('change'));
      }
    }
  }

  function initTooltips() {
    const tips = {
      'Car Name': 'Full in-game car name',
      'Class': 'Car class (D, C, B, A, S)',
      'Manufacturer': 'Real-world manufacturer',
      'Year': 'Model release year',
      'Rarity': 'How rare the car is',
      'EVO': 'Eligible for EVO tuning',
      'Top Speed (Stock/Max)': 'Top speed before and after upgrades',
      'Acceleration (Stock/Max)': 'Acceleration stat before and after upgrades',
      'Handling (Stock/Max)': 'Handling stat before and after upgrades',
      'Nitro (Stock/Max)': 'Nitro stat before and after upgrades',
      'Rank (Stock/Max)': 'Performance rank before and after max upgrades',
      'Blueprint Source': 'Where to obtain blueprints',
      'Unlock Method': 'How the car is unlocked',
      'Upgrade Cost': 'Approximate credits and parts cost',
      'Recommended Tracks': 'Track types where this car performs well',
      'Track Name': 'Track / route name',
      'Environment': 'Track location / city',
      'Length': 'Short, medium or long track',
      'Difficulty': 'Track difficulty rating',
      'Hazards': 'Notable obstacles and shortcuts'
    };
    $$('th').forEach(th => {
      const txt = th.textContent.trim();
      if (tips[txt] && !th.dataset.tooltip) th.dataset.tooltip = tips[txt];
    });
    $$('th[data-tooltip]').forEach(th => th.setAttribute('role', 'tooltip'));
  }

  function initMobileCards() {
    function label(table) {
      const head = table.tHead || table.querySelector('thead');
      if (!head) return;
      const ths = Array.from(head.rows[0].cells).map(th => th.textContent.trim());
      const tbody = table.tBodies[0] || table.querySelector('tbody');
      if (!tbody) return;
      Array.from(tbody.rows).forEach(tr => {
        if (tr.classList.contains('expand-row')) return;
        Array.from(tr.cells).forEach((td, i) => { if (ths[i]) td.setAttribute('data-label', ths[i]); });
      });
    }
    $$('.table-wrap table').forEach(table => {
      const tbody = table.tBodies[0] || table.querySelector('tbody');
      if (tbody) new MutationObserver(() => label(table)).observe(tbody, { childList: true, subtree: true });
      label(table);
    });
  }

  function initEmptyStates() {
    $$('.count').forEach(el => {
      new MutationObserver(() => {
        const m = el.textContent.match(/\b0\b/);
        let btn = el.querySelector('.clear-btn');
        if (m) {
          if (!btn) {
            btn = document.createElement('button');
            btn.className = 'btn clear-btn';
            btn.textContent = 'Clear filters';
            btn.addEventListener('click', () => {
              $$('.filters select, .filters input, .search-bar input').forEach(i => {
                if (i.tagName === 'SELECT') i.selectedIndex = 0;
                else i.value = '';
                i.dispatchEvent(new Event(i.tagName === 'SELECT' ? 'change' : 'input'));
              });
            });
            el.appendChild(document.createTextNode(' '));
            el.appendChild(btn);
          }
        } else if (btn) {
          btn.previousSibling?.remove();
          btn.remove();
        }
      }).observe(el, { childList: true, subtree: true, characterData: true });
    });
  }

  // ---------- Home / command center helpers ----------
  function debounce(fn, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function todayMidnight() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function formatIsoDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function eventStatus(e, today) {
    const todayStr = formatIsoDate(today);
    if (!e.startDate || !e.endDate) return 'unknown';
    if (todayStr < e.startDate) return 'upcoming';
    if (todayStr >= e.startDate && todayStr <= e.endDate) return 'active';
    return 'past';
  }

  function getActiveCalendarEvents(today) {
    return calendarEvents.filter(e => eventStatus(e, today) === 'active')
      .sort((a, b) => String(a.endDate).localeCompare(String(b.endDate)));
  }

  function getTodaysWeeklyCups() {
    const dayMap = {
      1: 'Monday Class-D Cup',
      2: 'Tuesday Class-C Cup',
      3: 'Wednesday Class-B Cup',
      4: 'Thursday Class-A Cup',
      5: 'Friday Class-S Cup'
    };
    const name = dayMap[new Date().getDay()];
    if (!name) return [];
    const ev = events.find(e => e.eventName === name);
    return ev ? [ev] : [];
  }

  function qualifiesForEvent(car, event) {
    const el = (event.eligibleCars || '').toLowerCase();
    if (el.includes('all classes')) return true;
    if (el.includes('class ' + (car.class || '').toLowerCase())) return true;
    if (el.includes((car.carName || '').toLowerCase())) return true;
    return false;
  }

  function enrichRoi(car) {
    const rankGain = (car.rankMax != null && car.rankStock != null) ? car.rankMax - car.rankStock : 0;
    const statGain = [car.topSpeedMax, car.accelerationMax, car.handlingMax, car.nitroMax].every(v => v != null)
      ? (car.topSpeedMax - (car.topSpeedStock || 0)) +
        (car.accelerationMax - (car.accelerationStock || 0)) +
        (car.handlingMax - (car.handlingStock || 0)) +
        (car.nitroMax - (car.nitroStock || 0))
      : 0;
    return Object.assign({}, car, {
      rankGain,
      costPerRank: rankGain > 0 && car.totalUpgradeCost ? Math.round(car.totalUpgradeCost / rankGain) : Infinity,
      costPerStat: statGain > 0 && car.totalUpgradeCost ? Math.round(car.totalUpgradeCost / statGain) : Infinity
    });
  }

  function isRoiUsable(car) {
    return car.totalUpgradeCost &&
      car.rankStock != null && car.rankMax != null &&
      car.topSpeedStock != null && car.accelerationStock != null && car.handlingStock != null && car.nitroStock != null &&
      car.topSpeedMax != null && car.accelerationMax != null && car.handlingMax != null && car.nitroMax != null;
  }

  function carFarmingSources(car) {
    const nameL = (car.carName || '').toLowerCase();
    const classL = 'class ' + (car.class || '').toLowerCase();
    const career = careerSeasons.filter(s => {
      const stage = (s.stage || '').toLowerCase();
      return stage.includes(nameL) || stage.includes(classL);
    });
    const eventSources = events.filter(e => {
      const el = (e.eligibleCars || '').toLowerCase();
      return el.includes('all classes') || el.includes(classL) || el.includes(nameL);
    });
    return { career, events: eventSources };
  }

  function scoreFarmingTarget(car) {
    const sources = carFarmingSources(car);
    let score = sources.career.length + sources.events.length;
    if (car.evoEligible) score += 0.5;
    return score;
  }

  function getFarmingTargets(seedCars, limit = 5) {
    return seedCars
      .map(c => ({ car: c, sources: carFarmingSources(c), score: scoreFarmingTarget(c) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score || (b.car.rankMax || 0) - (a.car.rankMax || 0))
      .slice(0, limit);
  }

  function renderDashList(container, items, emptyHtml, buildItemFn) {
    if (!container) return;
    container.innerHTML = '';
    if (!items.length) {
      container.innerHTML = emptyHtml;
      return;
    }
    items.forEach(item => container.appendChild(buildItemFn(item)));
  }

  function makeDashRow(titleHtml, metaHtml, tagsHtml = '', href = '') {
    const li = document.createElement('li');
    if (href) {
      const a = document.createElement('a');
      a.href = href;
      a.innerHTML = titleHtml;
      li.appendChild(a);
    } else {
      const span = document.createElement('span');
      span.innerHTML = titleHtml;
      li.appendChild(span);
    }
    if (metaHtml) {
      const meta = document.createElement('span');
      meta.className = 'meta';
      meta.innerHTML = metaHtml;
      li.appendChild(meta);
    }
    if (tagsHtml) {
      const tags = document.createElement('div');
      tags.className = 'tags';
      tags.innerHTML = tagsHtml;
      li.appendChild(tags);
    }
    return li;
  }

  function ownedCarsWithMaster() {
    const masterMap = new Map(cars.map(c => [c.carName.toLowerCase(), c]));
    return getGarage().map(g => {
      const master = masterMap.get((g.carName || '').toLowerCase());
      return master ? Object.assign({}, master, { _garage: g }) : null;
    }).filter(Boolean);
  }

  function isCarMaxed(carOrGarage) {
    const g = carOrGarage._garage || carOrGarage;
    if (g && g.blueprintCurrent != null && g.blueprintMax != null) return g.blueprintCurrent >= g.blueprintMax;
    return false;
  }

  // ---------- Home ----------
  function initHome() {
    const byClass = {};
    cars.forEach(c => { byClass[c.class] = (byClass[c.class] || 0) + 1; });
    const statCars = $('#stat-cars');
    const statTracks = $('#stat-tracks');
    const statSeasons = $('#stat-seasons');
    const statEvents = $('#stat-events');
    const statClasses = $('#stat-classes');
    if (statCars) statCars.textContent = cars.length.toLocaleString();
    if (statTracks) statTracks.textContent = tracks.length.toLocaleString();
    if (statSeasons) statSeasons.textContent = careerSeasons.length.toLocaleString();
    if (statEvents) statEvents.textContent = events.length.toLocaleString();
    if (statClasses) statClasses.textContent = Object.keys(byClass).length.toLocaleString();

    const today = todayMidnight();
    const owned = ownedCarsWithMaster();
    const hasGarage = owned.length > 0;
    const active = getActiveCalendarEvents(today);

    // Events you can enter today
    const cups = getTodaysWeeklyCups();
    const enterList = $('#dash-enter-list');
    const enterCount = $('#dash-enter-count');
    let enterItems = [];
    cups.forEach(cup => {
      const matchClass = (cup.eligibleCars || '').match(/Class\s+([A-Z])/i);
      const cls = matchClass ? matchClass[1] : null;
      const eligible = cls ? owned.filter(c => c.class === cls) : [];
      const meta = hasGarage
        ? `${eligible.length} owned car${eligible.length === 1 ? '' : 's'} qualify`
        : 'Import your garage to see which cars qualify';
      enterItems.push({ title: esc(cup.eventName), meta, tag: '<span class="tag tag-active">Today</span>', href: 'roster.html' });
    });
    active.forEach(e => {
      const featured = (e.featuredCars || '').split(/,\s*|\s+&\s+/).map(s => s.replace(/^\'*|'*$/g, '').trim()).filter(Boolean);
      const ownedFeatured = hasGarage ? owned.filter(c => featured.some(f => c.carName.toLowerCase() === f.toLowerCase())) : [];
      const meta = hasGarage
        ? `${ownedFeatured.length} featured car${ownedFeatured.length === 1 ? '' : 's'} owned`
        : 'Featured: ' + (featured.slice(0, 3).join(', ') + (featured.length > 3 ? '…' : '') || '—');
      enterItems.push({ title: esc(e.eventName), meta, tag: '<span class="tag tag-active">Active</span>', href: 'calendar.html' });
    });
    if (!enterItems.length) {
      enterItems.push({ title: 'No weekly cup today', meta: 'Check the calendar for active limited-time events.', tag: '<span class="tag">Rest day</span>', href: 'calendar.html' });
    }
    if (enterCount) enterCount.textContent = hasGarage ? `${cups.length} weekly cup${cups.length === 1 ? '' : 's'} · ${active.length} active event${active.length === 1 ? '' : 's'}` : `${cups.length} weekly cup${cups.length === 1 ? '' : 's'} · ${active.length} active event${active.length === 1 ? '' : 's'} (import garage to personalize)`;
    renderDashList(enterList, enterItems, '<li class="empty-prompt">No events available today.</li>', item => makeDashRow(item.title, item.meta, item.tag, item.href));

    // Best upgrade ROI
    const roiList = $('#dash-roi-list');
    const roiCount = $('#dash-roi-count');
    const roiSeed = hasGarage ? owned : cars;
    const roiCars = roiSeed.filter(isRoiUsable).map(enrichRoi).sort((a, b) => a.costPerRank - b.costPerRank).slice(0, 5);
    if (roiCount) roiCount.textContent = hasGarage ? `Top ${roiCars.length} owned cars` : `Top ${roiCars.length} cars in database`;
    renderDashList(roiList, roiCars, '<li class="empty-prompt">No cars with complete upgrade data.</li>', c => {
      const label = hasGarage && c._garage ? `${esc(c.carName)} <span style="color:var(--muted);font-size:0.8rem;">(${esc(c.class)})</span>` : esc(`${c.carName} (${c.class})`);
      return makeDashRow(label, `Cost/rank: ${c.costPerRank === Infinity ? '—' : c.costPerRank.toLocaleString()} · Rank gain: ${c.rankGain.toLocaleString()}`, '<span class="tag tag-roi">Best value</span>', 'upgrades.html');
    });

    // Blueprint farming targets
    const farmList = $('#dash-farm-list');
    const farmCount = $('#dash-farm-count');
    let farmSeed = hasGarage ? owned.filter(c => !isCarMaxed(c)) : cars;
    if (hasGarage && !farmSeed.length) farmSeed = owned;
    const farmTargets = getFarmingTargets(farmSeed, 5);
    if (farmCount) farmCount.textContent = hasGarage ? `${farmTargets.length} suggested targets from owned cars` : `${farmTargets.length} cars with the most farmable sources`;
    renderDashList(farmList, farmTargets, '<li class="empty-prompt">No farmable targets found.</li>', x => {
      const sources = `${x.sources.career.length} career · ${x.sources.events.length} event`;
      const tag = hasGarage && x.car._garage ? '<span class="tag tag-farm">Owned</span>' : '<span class="tag tag-farm">Farmable</span>';
      return makeDashRow(esc(`${x.car.carName} (${x.car.class})`), esc(sources), tag, `farming.html`);
    });

    // Garage import prompt when none exists
    if (!hasGarage) {
      const existingPrompt = document.getElementById('dash-garage-prompt');
      if (!existingPrompt) {
        const prompt = document.createElement('section');
        prompt.id = 'dash-garage-prompt';
        prompt.className = 'card';
        prompt.style.marginTop = '1.5rem';
        prompt.innerHTML = `
          <div class="dash-card-header"><h2>Personalize this page</h2><a href="garage.html">Import garage</a></div>
          <div class="dash-card-body">
            <p style="margin:0;color:var(--muted);">Import your garage from screenshots on the <a href="garage.html">Garage page</a> to see which events you can enter, your best upgrade ROI, and targeted blueprint farming.</p>
          </div>
        `;
        document.querySelector('main').appendChild(prompt);
      }
    }
  }

  // ---------- Global search (home) ----------
  function initGlobalSearch() {
    const input = $('#global-search');
    const results = $('#global-search-results');
    if (!input || !results) return;

    function normalize(s) {
      return String(s || '').toLowerCase();
    }

    function highlight(text, q) {
      if (!q) return esc(text);
      const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      return esc(text).replace(re, '<mark>$1</mark>');
    }

    function searchAll(q) {
      const m = normalize(q);
      if (!m) return [];
      const out = [];

      // Cars
      const carsMatch = cars.filter(c =>
        normalize(c.carName).includes(m) ||
        normalize(c.manufacturer).includes(m) ||
        normalize(c.class).includes(m) ||
        normalize(c.rarity).includes(m)
      ).slice(0, 5);
      if (carsMatch.length) out.push({ type: 'Cars', href: 'cars.html', queryParam: 'search', items: carsMatch.map(c => ({ title: c.carName, meta: `${c.class} · ${c.manufacturer} · ${c.rarity || '—'}`, obj: c })) });

      // Tracks
      const tracksMatch = tracks.filter(t =>
        normalize(t.trackName).includes(m) ||
        normalize(t.environment).includes(m) ||
        normalize(t.length).includes(m)
      ).slice(0, 5);
      if (tracksMatch.length) out.push({ type: 'Tracks', href: 'tracks.html', queryParam: 'search', items: tracksMatch.map(t => ({ title: t.trackName, meta: `${t.environment} · ${t.length || '—'}`, obj: t })) });

      // Events
      const eventsMatch = events.filter(e =>
        normalize(e.eventName).includes(m) ||
        normalize(e.eligibleCars).includes(m) ||
        normalize(e.track).includes(m) ||
        normalize(e.rewards).includes(m)
      ).slice(0, 5);
      if (eventsMatch.length) out.push({ type: 'Events', href: 'events.html', queryParam: 'search', items: eventsMatch.map(e => ({ title: e.eventName, meta: `${e.frequency || '—'} · ${e.track || '—'}`, obj: e })) });

      // Career seasons
      const seasonMatch = careerSeasons.filter(s =>
        normalize(s.stage).includes(m) ||
        normalize(s.chapter).includes(m)
      ).slice(0, 5);
      if (seasonMatch.length) out.push({ type: 'Career Seasons', href: 'career.html', queryParam: 'search', items: seasonMatch.map(s => ({ title: s.stage, meta: s.chapter, obj: s })) });

      // Calendar events
      const calMatch = calendarEvents.filter(e =>
        normalize(e.eventName).includes(m) ||
        normalize(e.featuredCars).includes(m) ||
        normalize(e.type).includes(m)
      ).slice(0, 5);
      if (calMatch.length) out.push({ type: 'Calendar', href: 'calendar.html', queryParam: 'search', items: calMatch.map(e => ({ title: e.eventName, meta: `${e.type || '—'} · ${e.startDate || '—'}`, obj: e })) });

      return out;
    }

    function renderResults(groups) {
      results.innerHTML = '';
      if (!groups.length) {
        results.innerHTML = '<div class="search-empty">No results found. Try a different search.</div>';
        results.style.display = 'block';
        return;
      }
      groups.forEach(g => {
        const group = document.createElement('div');
        group.className = 'result-group';
        group.innerHTML = `<h4>${g.icon ? g.icon + ' ' : ''}${esc(g.type)}</h4>`;
        g.items.forEach(item => {
          const row = document.createElement('a');
          row.className = 'result-row';
          const q = input.value.trim();
          row.href = `${g.href}?${g.queryParam}=${encodeURIComponent(item.title)}`;
          row.innerHTML = `<span class="name">${highlight(item.title, q)}</span><span class="meta">${highlight(item.meta, q)}</span>`;
          group.appendChild(row);
        });
        if (g.items.length === 5) {
          const more = document.createElement('a');
          more.className = 'result-more';
          more.href = `${g.href}?${g.queryParam}=${encodeURIComponent(input.value.trim())}`;
          more.textContent = `View all ${g.type.toLowerCase()} results`;
          group.appendChild(more);
        }
        results.appendChild(group);
      });
      results.style.display = 'block';
    }

    const doSearch = debounce(() => {
      const q = input.value.trim();
      if (!q) {
        results.innerHTML = '';
        results.style.display = 'none';
        return;
      }
      renderResults(searchAll(q));
    }, 150);

    input.addEventListener('input', doSearch);
    input.addEventListener('focus', () => {
      if (input.value.trim()) doSearch();
    });
    document.addEventListener('click', (e) => {
      if (!input.closest('.global-search') || !e.target.closest('.global-search')) {
        results.style.display = 'none';
      }
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        results.style.display = 'none';
      }
    });
  }

  // ---------- Cars ----------

  function getTrackNamesForRecommended(desc) {
    if (!desc || desc === '—') return [];
    const descs = desc.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    if (!descs.length) return [];
    return tracks.filter(t => {
      const len = (t.length || '').toLowerCase();
      const haz = (t.hazards || '').toLowerCase();
      const diff = (t.difficulty || '').toLowerCase();
      return descs.some(d => {
        if (d.includes('nitro')) return len.includes('long') || len.includes('extra');
        if (d.includes('drift')) return haz.includes('drift');
        if (d.includes('technical')) return diff.includes('hard') || haz.includes('technical');
        if (d.includes('short') || d.includes('sprint')) return len.includes('short');
        if (d.includes('long') || d.includes('speed')) return len.includes('long') || len.includes('extra');
        if (d.includes('mixed')) return len.includes('medium');
        return false;
      });
    }).map(t => t.trackName);
  }

  function initCars() {
    const search = $('#cars-search');
    const selClass = $('#cars-class');
    const selMfr = $('#cars-manufacturer');
    const selRarity = $('#cars-rarity');
    const selEvo = $('#cars-evo');
    const selUnlock = $('#cars-unlock');
    const selRec = $('#cars-rec');
    const selTrack = $('#cars-track');
    const selFav = $('#cars-fav');

    const classes = [...new Set(cars.map(c => c.class))].sort();
    const mfrs = [...new Set(cars.map(c => c.manufacturer))].sort();
    const rarities = [...new Set(cars.map(c => c.rarity))].sort();
    const unlocks = [...new Set(cars.map(c => c.unlockMethod).filter(Boolean))].sort();
    const recSet = new Set();
    cars.forEach(c => {
      (c.recommendedTracks || '').split(',').forEach(t => {
        const s = t.trim();
        if (s && s !== '—') recSet.add(s);
      });
    });
    const recs = [...recSet].sort();
    classes.forEach(v => selClass.add(new Option(v, v)));
    mfrs.forEach(v => selMfr.add(new Option(v, v)));
    rarities.forEach(v => selRarity.add(new Option(v, v)));
    unlocks.forEach(v => selUnlock.add(new Option(v, v)));
    recs.forEach(v => selRec.add(new Option(v, v)));
    const trackNames = [...new Set(tracks.map(t => t.trackName))].sort();
    trackNames.forEach(v => selTrack.add(new Option(v, v)));
    const recTrackSets = {};
    recs.forEach(desc => { recTrackSets[desc] = new Set(getTrackNamesForRecommended(desc)); });
    const trackToDesc = new Map();
    tracks.forEach(t => {
      const descs = new Set();
      recs.forEach(desc => {
        const matched = recTrackSets[desc];
        if (matched.size && matched.size < tracks.length && matched.has(t.trackName)) descs.add(desc);
      });
      trackToDesc.set(t.trackName, descs);
    });

    const table = $('#cars-body').closest('table');
    const headRow = table.querySelector('thead tr');
    const favTh = document.createElement('th');
    favTh.textContent = 'Fav';
    headRow.appendChild(favTh);

    let sortKey = '', sortDir = 1;

    function render() {
      const q = search.value.toLowerCase();
      const cls = selClass.value;
      const mfr = selMfr.value;
      const rarity = selRarity.value;
      const evo = selEvo.value;
      const unlock = selUnlock.value;
      const rec = selRec.value;
      const track = selTrack.value;
      const fav = selFav.value;
      const faves = new Set(getFavorites());
      let filtered = cars.filter(c => {
        const evoOk = evo === 'All' || (evo === 'yes' && c.evoEligible) || (evo === 'no' && !c.evoEligible);
        const recOk = rec === 'All' || ((c.recommendedTracks || '').split(',').some(s => s.trim() === rec));
        const trackAllowedDescs = track === 'All' ? null : trackToDesc.get(track);
        const trackOk = track === 'All' || (trackAllowedDescs && (c.recommendedTracks || '').split(',').some(s => trackAllowedDescs.has(s.trim())));
        return (!q || c.carName.toLowerCase().includes(q) || c.manufacturer.toLowerCase().includes(q)) &&
               (cls === 'All' || c.class === cls) &&
               (mfr === 'All' || c.manufacturer === mfr) &&
               (rarity === 'All' || c.rarity === rarity) &&
               (unlock === 'All' || c.unlockMethod === unlock) &&
               (fav === 'All' || faves.has(c.carName)) &&
               recOk &&
               trackOk &&
               evoOk;
      });
      if (sortKey) filtered = [...filtered].sort((a, b) => compareValues(a[sortKey], b[sortKey], sortDir));
      $('#cars-count').textContent = `${filtered.length} car${filtered.length === 1 ? '' : 's'}`;
      renderTable('cars-body', filtered, (c, row) => {
        row.appendChild(makeCell(c.carName));
        row.appendChild(makeCell(c.class));
        row.appendChild(makeCell(c.manufacturer));
        row.appendChild(makeCell(c.releaseYear || '—', 'num'));
        const rtd = makeCell('');
        rtd.appendChild(makeBadge(c.rarity));
        row.appendChild(rtd);
        row.appendChild(makeCell(c.evoEligible ? 'Yes' : '—'));
        row.appendChild(makeCell(pair(c.topSpeedStock, c.topSpeedMax), 'num'));
        row.appendChild(makeCell(pair(c.accelerationStock, c.accelerationMax), 'num'));
        row.appendChild(makeCell(pair(c.handlingStock, c.handlingMax), 'num'));
        row.appendChild(makeCell(pair(c.nitroStock, c.nitroMax), 'num'));
        row.appendChild(makeCell(`${fmt(c.rankStock)} / ${fmt(c.rankMax)}`, 'num'));
        row.appendChild(makeCell(c.blueprintSource, 'wrap'));
        row.appendChild(makeCell(c.unlockMethod, 'wrap'));
        row.appendChild(makeCell(c.upgradeCost, 'wrap'));
        const recTd = document.createElement('td');
        recTd.className = 'wrap';
        const recTrackNames = getTrackNamesForRecommended(c.recommendedTracks);
        if (c.recommendedTracks) {
          const parts = c.recommendedTracks.split(',').map(s => s.trim()).filter(s => s && s !== '—');
          if (parts.length) {
            parts.forEach((part, i) => {
              const a = document.createElement('a');
              a.href = 'tracks.html?rec=' + encodeURIComponent(part);
              a.textContent = part;
              recTd.appendChild(a);
              if (i < parts.length - 1) recTd.appendChild(document.createTextNode(', '));
            });
            if (recTrackNames.length) recTd.title = recTrackNames.join(', ');
          } else {
            recTd.textContent = c.recommendedTracks;
          }
        } else {
          recTd.textContent = '—';
        }
        row.appendChild(recTd);
        row.appendChild(makeCell(c.notes, 'wrap'));
        const favTd = makeCell('');
        favTd.appendChild(makeFavButton(c.carName));
        row.appendChild(favTd);
      });
      setSortIndicators(table, sortKey, sortDir);
    }

    initSortHeaders(table, key => {
      sortDir = sortKey === key ? -sortDir : 1;
      sortKey = key;
      render();
    });
    [search, selClass, selMfr, selRarity, selEvo, selUnlock, selRec, selTrack, selFav].forEach(el => el.addEventListener('input', render));
    render();
  }

  // ---------- Tracks ----------
  function initTracks() {
    const search = $('#tracks-search');
    const selEnv = $('#tracks-env');
    const selRec = $('#tracks-rec');
    const envs = [...new Set(tracks.map(t => t.environment))].sort();
    envs.forEach(v => selEnv.add(new Option(v, v)));
    const recSet = new Set();
    cars.forEach(c => {
      (c.recommendedTracks || '').split(',').forEach(t => {
        const s = t.trim();
        if (s && s !== '—') recSet.add(s);
      });
    });
    const recs = [...recSet].filter(desc => getTrackNamesForRecommended(desc).length > 0).sort();
    recs.forEach(v => selRec.add(new Option(v, v)));

    let sortKey = '', sortDir = 1;
    const table = $('#tracks-body').closest('table');

    function render() {
      const q = search.value.toLowerCase();
      const env = selEnv.value;
      const rec = selRec.value;
      const recNames = rec === 'All' ? null : new Set(getTrackNamesForRecommended(rec));
      let filtered = tracks.filter(t => {
        return (!q || t.trackName.toLowerCase().includes(q) || t.environment.toLowerCase().includes(q)) &&
               (env === 'All' || t.environment === env) &&
               (rec === 'All' || (recNames && recNames.has(t.trackName)));
      });
      if (sortKey) filtered = [...filtered].sort((a, b) => compareValues(a[sortKey], b[sortKey], sortDir));
      $('#tracks-count').textContent = `${filtered.length} track${filtered.length === 1 ? '' : 's'}`;
      renderTable('tracks-body', filtered, (t, row) => {
        row.appendChild(makeCell(t.trackName));
        row.appendChild(makeCell(t.environment));
        row.appendChild(makeCell(t.length));
        row.appendChild(makeCell(t.difficulty));
        row.appendChild(makeCell(t.recClasses));
        row.appendChild(makeCell(t.hazards, 'wrap'));
        row.appendChild(makeCell(t.notes, 'wrap'));
        const actions = makeCell('');
        const carsLink = document.createElement('a');
        carsLink.className = 'btn';
        carsLink.href = 'cars.html?track=' + encodeURIComponent(t.trackName);
        carsLink.textContent = 'Cars';
        actions.appendChild(carsLink);
        row.appendChild(actions);
      });
      setSortIndicators(table, sortKey, sortDir);
    }

    initSortHeaders(table, key => {
      sortDir = sortKey === key ? -sortDir : 1;
      sortKey = key;
      render();
    });
    search.addEventListener('input', render);
    selEnv.addEventListener('change', render);
    selRec.addEventListener('change', render);
    render();
  }

  // ---------- Career ----------
  function initCareer() {
    const selChapter = $('#career-chapter');
    const seasonInput = $('#career-season');
    const modeInput = $('#career-mode');
    const trackInput = $('#career-track');
    const typeInput = $('#career-type');
    const creditsInput = $('#career-credits');
    const raceBody = $('#career-race-body');
    const chapters = [...new Set(careerRaces.map(r => r.chapter))].sort();
    chapters.forEach(v => selChapter.add(new Option(v, v)));
    const trackByName = new Map(tracks.map(t => [t.trackName, t]));

    function trackType(name) {
      const t = trackByName.get(name);
      return t ? t.length : '—';
    }

    function render() {
      const ch = selChapter.value;
      const sq = seasonInput.value.toLowerCase();
      const mq = modeInput.value.toLowerCase();
      const tq = trackInput.value.toLowerCase();
      const yq = typeInput.value.toLowerCase();
      const cq = creditsInput.value.toLowerCase();
      const list = careerRaces.filter(r => {
        const type = trackType(r.track).toLowerCase();
        return (ch === 'All' || r.chapter === ch) &&
               (!sq || r.season.toLowerCase().includes(sq)) &&
               (!mq || r.mode.toLowerCase().includes(mq)) &&
               (!tq || r.track.toLowerCase().includes(tq)) &&
               (!yq || type.includes(yq)) &&
               (!cq || r.credits.toLowerCase().includes(cq));
      });
      $('#career-race-count').textContent = `${list.length} race${list.length === 1 ? '' : 's'}`;
      raceBody.innerHTML = list.map(r => `<tr><td>${r.chapter}</td><td>${r.season}</td><td>${r.race}</td><td>${r.rank}</td><td>${r.mode}</td><td>${r.track}</td><td>${trackType(r.track)}</td><td>${r.blueprint}</td><td>${r.credits}</td><td>${r.rep}</td></tr>`).join('');
    }

    [selChapter, seasonInput, modeInput, trackInput, typeInput, creditsInput].forEach(el => el.addEventListener('input', render));
    render();
  }

  // ---------- Season Pass Mission Solver ----------
  function initSeasonPass() {
    const conditionSelect = $('#sp-condition');
    const classSelect = $('#sp-class');
    const locationsInput = $('#sp-locations');
    const modeSelect = $('#sp-mode');
    const solveBtn = $('#sp-solve');
    const results = $('#sp-results');
    const tracksBody = $('#sp-tracks-body');

    missionConditions.forEach(c => conditionSelect.add(new Option(c.label, c.id)));
    [...new Set(cars.map(c => c.class))].sort().forEach(v => classSelect.add(new Option(v, v)));
    [...new Set(careerRaces.map(r => r.mode))].sort().forEach(v => modeSelect.add(new Option(v, v)));

    function matchesLocations(track, terms) {
      if (!terms.length) return true;
      const hay = (track.trackName + ' ' + track.environment).toLowerCase();
      return terms.some(t => hay.includes(t));
    }

    function matchesCondition(track, cond) {
      if (!cond) return true;
      const hasJumps = (track.hazards || '').toLowerCase().includes('jumps');
      if (cond.avoidJumps && hasJumps) return false;
      if (cond.needsJumps && !hasJumps) return false;
      return true;
    }

    function solve() {
      const cond = missionConditions.find(c => c.id === conditionSelect.value);
      const cls = classSelect.value;
      const locs = locationsInput.value.toLowerCase().split(/,\s*|,/).map(s => s.trim()).filter(Boolean);
      const mode = modeSelect.value.toLowerCase();

      const matchedTracks = tracks.filter(t => matchesLocations(t, locs) && matchesCondition(t, cond))
        .sort((a, b) => a.trackName.localeCompare(b.trackName));
      const trackNames = new Set(matchedTracks.map(t => t.trackName));

      const carParams = new URLSearchParams();
      if (cls) carParams.set('class', cls);

      const maxClassRank = cls
        ? cars.filter(c => c.class === cls).reduce((m, c) => {
            const r = parseInt(String(c.rankMax).replace(/,/g, ''), 10) || 0;
            return r > m ? r : m;
          }, 0)
        : 0;

      function rankOk(r) {
        if (!cls || !maxClassRank) return true;
        const raceRank = parseInt(String(r.rank || '0').replace(/,/g, ''), 10) || 0;
        return raceRank <= maxClassRank;
      }

      const raceMap = new Map();
      careerRaces.forEach(r => {
        if (trackNames.has(r.track) && rankOk(r) && (!mode || r.mode.toLowerCase().includes(mode))) {
          if (!raceMap.has(r.track)) raceMap.set(r.track, []);
          raceMap.get(r.track).push(r);
        }
      });

      results.style.display = 'block';
      $('#sp-tracks-count').textContent = `${matchedTracks.length} track${matchedTracks.length === 1 ? '' : 's'}`;
      tracksBody.innerHTML = matchedTracks.map(t => {
        const races = raceMap.get(t.trackName) || [];
        const racesHtml = races.length
          ? races.map(r => `${r.chapter} &rsaquo; ${r.season} &rsaquo; Race ${r.race} (${r.mode})`).join('<br>')
          : '—';
        const linkParams = new URLSearchParams(carParams);
        linkParams.set('track', t.trackName);
        const carsLink = `cars.html?${linkParams.toString()}`;
        return `<tr><td>${t.trackName}</td><td>${t.environment}</td><td>${t.length}</td><td>${t.hazards || '—'}</td><td>${racesHtml}</td><td><a class="btn" href="${carsLink}">View cars</a></td></tr>`;
      }).join('');
    }

    solveBtn.addEventListener('click', solve);
  }

  // ---------- Events ----------
  function initEvents() {
    const search = $('#events-search');
    let sortKey = '', sortDir = 1;
    const table = $('#events-body').closest('table');

    function render() {
      const q = search.value.toLowerCase();
      let filtered = events.filter(e => !q || e.eventName.toLowerCase().includes(q) || e.eligibleCars.toLowerCase().includes(q) || e.track.toLowerCase().includes(q));
      if (sortKey) filtered = [...filtered].sort((a, b) => compareValues(a[sortKey], b[sortKey], sortDir));
      $('#events-count').textContent = `${filtered.length} event${filtered.length === 1 ? '' : 's'}`;
      renderTable('events-body', filtered, (e, row) => {
        row.appendChild(makeCell(e.eventName));
        row.appendChild(makeCell(e.frequency));
        row.appendChild(makeCell(e.eligibleCars));
        row.appendChild(makeCell(e.rewards));
        row.appendChild(makeCell(e.track));
        row.appendChild(makeCell(e.notes, 'wrap'));
      });
      setSortIndicators(table, sortKey, sortDir);
    }

    initSortHeaders(table, key => {
      sortDir = sortKey === key ? -sortDir : 1;
      sortKey = key;
      render();
    });
    search.addEventListener('input', render);
    render();
  }

  // ---------- Dashboard (DEPRECATED) ----------
  // The old unified-dashboard table has been replaced by the Home command center.
  // These functions are retained only for reference and can be removed in a future cleanup pass.
  function filterCars(classFilter, manufacturerFilter) {
    return cars.filter(c => (classFilter === 'All' || c.class === classFilter) &&
                            (manufacturerFilter === 'All' || c.manufacturer === manufacturerFilter));
  }

  function filterCareer(carObjs, trackFilter) {
    const names = new Set(carObjs.map(c => c.carName.toLowerCase()));
    const classes = new Set(carObjs.map(c => c.class));
    return careerRaces.filter(r => {
      const season = r.season ? r.season.toLowerCase() : '';
      const carMatch = Array.from(classes).some(cl => season.includes(cl.toLowerCase())) ||
                       Array.from(names).some(n => season.includes(n));
      if (!carMatch) return false;
      if (trackFilter !== 'All') return r.track === trackFilter;
      return true;
    });
  }

  function filterEvents(trackFilter, eventFilter) {
    return events.filter(e => {
      const trackOk = trackFilter === 'All' || e.track === trackFilter;
      const eventOk = eventFilter === 'All' || e.eventName === eventFilter;
      return trackOk && eventOk;
    });
  }

  function combineResults(cars, careerRows, eventRows) {
    const rows = [];
    cars.forEach(car => {
      const carCareer = careerRows.filter(r => {
        const season = r.season ? r.season.toLowerCase() : '';
        return season.includes(car.carName.toLowerCase()) || season.includes('class ' + car.class.toLowerCase());
      });
      const carEvents = eventRows.filter(e => e.eligibleCars.toLowerCase().includes('all classes') ||
                                              e.eligibleCars.toLowerCase().includes('class ' + car.class.toLowerCase()) ||
                                              e.eligibleCars.toLowerCase().includes(car.carName.toLowerCase()));
      if (carCareer.length === 0 && carEvents.length === 0) {
        return;
      }
      carCareer.forEach(r => rows.push({
          type: 'career',
          carName: car.carName,
          class: car.class,
          chapter: r.chapter,
          season: r.season,
          race: r.race,
          rank: r.rank,
          mode: r.mode,
          track: r.track,
          blueprint: r.blueprint,
          credits: r.credits,
          rep: r.rep,
          notes: `${r.chapter} › ${r.season}`,
          _car: car
        }));
        carEvents.forEach(e => rows.push({
          type: 'event',
          carName: car.carName,
          class: car.class,
          track: e.track,
          eventName: e.eventName,
          reward: e.rewards,
          notes: e.notes,
          _car: car,
          _event: e
        }));
    });
    return rows;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  function buildDetailHtml(items) {
    const sorted = [...items].filter(i => i.type !== 'none').sort((a, b) => {
      if (a.type !== b.type) return a.type === 'career' ? -1 : 1;
      const name = (a.season || a.eventName || '').localeCompare(b.season || b.eventName || '');
      if (name) return name;
      return String(a.track || '').localeCompare(String(b.track || ''));
    });
    if (!sorted.length) return '<p class="empty-state">No linked data.</p>';

    let html = '<input type="search" class="sub-filter" placeholder="Filter sub-results...">';
    html += '<div class="table-wrap"><table class="detail-table sub-table"><thead><tr>';
    html += '<th data-sort="type">Type</th>';
    html += '<th data-sort="name">Season / Event</th>';
    html += '<th data-sort="chapter">Chapter</th>';
    html += '<th data-sort="track">Track</th>';
    html += '<th data-sort="race">Race</th>';
    html += '<th data-sort="rank">Rank</th>';
    html += '<th data-sort="mode">Mode</th>';
    html += '<th data-sort="reward">Reward</th>';
    html += '</tr></thead><tbody>';

    sorted.forEach(i => {
      if (i.type === 'career') {
        const reward = [i.credits, i.rep ? i.rep + ' rep' : ''].filter(Boolean).join(' / ');
        html += `<tr data-type="${esc('career')}" data-name="${esc(i.season)}" data-chapter="${esc(i.chapter)}" data-track="${esc(i.track)}" data-race="${esc(i.race)}" data-rank="${esc(i.rank)}" data-mode="${esc(i.mode)}" data-reward="${esc(reward)}">`;
        html += `<td data-label="Type">Career</td><td data-label="Season / Event">${i.season}</td><td data-label="Chapter">${i.chapter}</td><td data-label="Track">${i.track}</td><td data-label="Race" class="num">${i.race}</td><td data-label="Rank" class="num">${i.rank}</td><td data-label="Mode">${i.mode}</td><td data-label="Reward">${reward || '—'}</td></tr>`;
      } else if (i.type === 'event') {
        html += `<tr data-type="${esc('event')}" data-name="${esc(i.eventName)}" data-chapter="" data-track="${esc(i.track)}" data-race="" data-rank="" data-mode="" data-reward="${esc(i.reward)}">`;
        html += `<td data-label="Type">Event</td><td data-label="Season / Event">${i.eventName}</td><td data-label="Chapter">—</td><td data-label="Track">${i.track}</td><td data-label="Race">—</td><td data-label="Rank">—</td><td data-label="Mode">—</td><td data-label="Reward">${i.reward}</td></tr>`;
      }
    });
    html += '</tbody></table></div>';
    return html;
  }

  function attachDetailInteractions(container) {
    const table = container.querySelector('.sub-table');
    const filter = container.querySelector('.sub-filter');
    if (!table || !filter) return;
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const headers = Array.from(table.querySelectorAll('th[data-sort]'));

    function value(row, key) {
      return row.dataset[key] || '';
    }

    function sortBy(key, dir) {
      rows.sort((a, b) => {
        let va = value(a, key), vb = value(b, key);
        const na = parseFloat(va), nb = parseFloat(vb);
        if (!isNaN(na) && !isNaN(nb) && va !== '' && vb !== '') {
          va = na; vb = nb;
        }
        if (va < vb) return -1 * dir;
        if (va > vb) return 1 * dir;
        return 0;
      });
      const tbody = table.querySelector('tbody');
      rows.forEach(r => tbody.appendChild(r));
    }

    headers.forEach(th => {
      th.classList.add('sortable');
      th.addEventListener('click', () => {
        const key = th.dataset.sort;
        let dir = th.dataset.dir === 'asc' ? -1 : 1;
        headers.forEach(h => delete h.dataset.dir);
        th.dataset.dir = dir === 1 ? 'asc' : 'desc';
        sortBy(key, dir);
      });
    });

    filter.addEventListener('input', () => {
      const q = filter.value.toLowerCase();
      rows.forEach(r => { r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none'; });
    });
  }

  function initDashboard() {

    const search = $('#dash-search');
    const selClass = $('#dash-class');
    const selMfr = $('#dash-manufacturer');
    const selRarity = $('#dash-rarity');
    const selEvo = $('#dash-evo');
    const selOwned = $('#dash-owned');
    const selTrack = $('#dash-track');
    const selEvent = $('#dash-event');

    [...new Set(cars.map(c => c.class))].sort().forEach(v => selClass.add(new Option(v, v)));
    [...new Set(cars.map(c => c.manufacturer))].sort().forEach(v => selMfr.add(new Option(v, v)));
    [...new Set(cars.map(c => c.rarity))].sort().forEach(v => selRarity.add(new Option(v, v)));
    [...new Set(tracks.map(t => t.trackName))].sort().forEach(v => selTrack.add(new Option(v, v)));
    [...new Set(events.map(e => e.eventName))].sort().forEach(v => selEvent.add(new Option(v, v)));

    const dashTable = $('#dash-body').closest('table');
    const PAGE_SIZE = 25;
    let sortKey = 'rankMax';
    let sortDir = -1;
    let page = 1;
    let groupArray = [];

    function readUrl() {
      const p = new URLSearchParams(location.search);
      if (p.has('dash-search')) search.value = p.get('dash-search');
      if (p.get('dash-class')) selClass.value = p.get('dash-class');
      if (p.get('dash-manufacturer')) selMfr.value = p.get('dash-manufacturer');
      if (p.get('dash-rarity')) selRarity.value = p.get('dash-rarity');
      if (p.get('dash-evo')) selEvo.value = p.get('dash-evo');
      if (p.get('dash-owned')) selOwned.value = p.get('dash-owned');
      if (p.get('dash-track')) selTrack.value = p.get('dash-track');
      if (p.get('dash-event')) selEvent.value = p.get('dash-event');
      const pg = parseInt(p.get('dash-page') || '1', 10);
      page = isNaN(pg) || pg < 1 ? 1 : pg;
    }

    function updateUrl() {
      const p = new URLSearchParams();
      const q = search.value.trim();
      if (q) p.set('dash-search', q);
      if (selClass.value !== 'All') p.set('dash-class', selClass.value);
      if (selMfr.value !== 'All') p.set('dash-manufacturer', selMfr.value);
      if (selRarity.value !== 'All') p.set('dash-rarity', selRarity.value);
      if (selEvo.value !== 'All') p.set('dash-evo', selEvo.value);
      if (selOwned.value !== 'All') p.set('dash-owned', selOwned.value);
      if (selTrack.value !== 'All') p.set('dash-track', selTrack.value);
      if (selEvent.value !== 'All') p.set('dash-event', selEvent.value);
      if (page > 1) p.set('dash-page', page);
      const qs = p.toString();
      const newUrl = location.pathname + (qs ? '?' + qs : '');
      history.replaceState(null, '', newUrl);
    }

    function matchesSearch(car, q) {
      if (!q) return true;
      const m = q.toLowerCase();
      return car.carName.toLowerCase().includes(m) ||
             car.manufacturer.toLowerCase().includes(m) ||
             car.class.toLowerCase().includes(m) ||
             (car.rarity || '').toLowerCase().includes(m) ||
             (String(car.rankMax) || '').includes(m);
    }

    function renderPagination(total, totalPages) {
      const wrap = $('#dash-pagination');
      if (!wrap) return;
      wrap.innerHTML = '';
      if (totalPages <= 1) return;
      const info = document.createElement('span');
      info.className = 'dash-page-info';
      info.textContent = `Page ${page} of ${totalPages}`;
      const prev = document.createElement('button');
      prev.className = 'btn';
      prev.textContent = 'Prev';
      prev.disabled = page === 1;
      prev.addEventListener('click', () => { if (page > 1) { page--; render(); updateUrl(); } });
      const next = document.createElement('button');
      next.className = 'btn';
      next.textContent = 'Next';
      next.disabled = page === totalPages;
      next.addEventListener('click', () => { if (page < totalPages) { page++; render(); updateUrl(); } });
      wrap.appendChild(prev);
      wrap.appendChild(info);
      wrap.appendChild(next);
    }

    function render() {
      const q = search.value.toLowerCase().trim();
      const classFilter = selClass.value;
      const mfrFilter = selMfr.value;
      const rarityFilter = selRarity.value;
      const evoFilter = selEvo.value;
      const ownedFilter = selOwned.value;
      const trackFilter = selTrack.value;
      const eventFilter = selEvent.value;

      const ownedNames = ownedFilter === 'owned' ? new Set(getGarage().map(g => g.carName.toLowerCase())) : null;

      const filteredCars = cars.filter(c => {
        const evoOk = evoFilter === 'All' || (evoFilter === 'yes' && c.evoEligible) || (evoFilter === 'no' && !c.evoEligible);
        const ownedOk = ownedFilter === 'All' || (ownedNames && ownedNames.has(c.carName.toLowerCase()));
        return (classFilter === 'All' || c.class === classFilter) &&
               (mfrFilter === 'All' || c.manufacturer === mfrFilter) &&
               (rarityFilter === 'All' || c.rarity === rarityFilter) &&
               evoOk && ownedOk &&
               matchesSearch(c, q);
      });

      const linkActive = classFilter !== 'All' || mfrFilter !== 'All' || rarityFilter !== 'All' || evoFilter !== 'All' || ownedFilter !== 'All' || trackFilter !== 'All' || eventFilter !== 'All' || q;
      let results = [];
      if (linkActive) {
        const filteredCareer = filterCareer(filteredCars, trackFilter);
        const filteredEvents = filterEvents(trackFilter, eventFilter);
        results = combineResults(filteredCars, filteredCareer, filteredEvents);
      }

      const groups = {};
      if (linkActive) {
        results.forEach(r => {
          if (!groups[r.carName]) groups[r.carName] = { carName: r.carName, class: r.class, items: [], _car: r._car };
          groups[r.carName].items.push(r);
        });
      } else {
        filteredCars.forEach(c => {
          groups[c.carName] = { carName: c.carName, class: c.class, items: [], _car: c };
        });
      }

      groupArray = Object.values(groups);

      if (q && linkActive) {
        groupArray = groupArray.filter(g => matchesSearch(g._car, q) || g.items.some(i =>
          (i.eventName && i.eventName.toLowerCase().includes(q)) ||
          (i.season && i.season.toLowerCase().includes(q)) ||
          (i.track && i.track.toLowerCase().includes(q)) ||
          (i.notes && i.notes.toLowerCase().includes(q))
        ));
      }

      if (sortKey === 'items') {
        groupArray.sort((a, b) => compareValues(a.items.length, b.items.length, sortDir));
      } else if (sortKey) {
        groupArray.sort((a, b) => {
          const va = a._car && a._car[sortKey] != null ? a._car[sortKey] : a[sortKey];
          const vb = b._car && b._car[sortKey] != null ? b._car[sortKey] : b[sortKey];
          return compareValues(va, vb, sortDir);
        });
      }

      const total = groupArray.length;
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      page = Math.min(page, totalPages);
      const start = (page - 1) * PAGE_SIZE;
      const pageGroups = groupArray.slice(start, start + PAGE_SIZE);

      const tbody = $('#dash-body');
      tbody.innerHTML = '';
      if (!total) {
        $('#dash-count').textContent = 'No results match your query.';
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Try different search or filters.</td></tr>';
        renderPagination(0, 1);
        return;
      }

      $('#dash-count').textContent = `${total} car${total === 1 ? '' : 's'}` + (linkActive ? ` • ${results.length} linked item${results.length === 1 ? '' : 's'}` : '') + ` (page ${page} of ${totalPages})`;

      pageGroups.forEach(g => {
        const car = g._car;
        const row = document.createElement('tr');
        if (car && car.rarity === 'Legendary') row.classList.add('legendary');
        if (car && car.rankMax > 3500) row.classList.add('high-rank');
        if (g.items.some(i => i._event && /exclusive|special|grand prix|car hunt/i.test(i._event.eventName))) row.classList.add('rare-event');
        row.innerHTML = `<td>${g.carName}</td><td>${g.class}</td><td>${car ? car.manufacturer : '—'}</td><td>${car && car.rarity ? car.rarity : '—'}</td><td class="num">${car ? fmt(car.rankMax) : '—'}</td><td class="num">${g.items.length}</td><td><button class="btn expand-btn">${g.items.length ? 'Show links' : 'No links'}</button></td>`;
        tbody.appendChild(row);

        const detailRow = document.createElement('tr');
        detailRow.className = 'expand-row';
        detailRow.style.display = 'none';
        detailRow.innerHTML = `<td colspan="7"><div class="dash-detail"></div></td>`;
        tbody.appendChild(detailRow);

        const btn = row.querySelector('.expand-btn');
        btn.disabled = !g.items.length;
        btn.addEventListener('click', () => {
          const detail = detailRow.querySelector('.dash-detail');
          const shown = detailRow.style.display !== 'none';
          if (!shown && !detail.innerHTML) {
            detail.innerHTML = buildDetailHtml(g.items);
            attachDetailInteractions(detail);
          }
          detailRow.style.display = shown ? 'none' : (window.innerWidth <= 640 ? 'block' : 'table-row');
          btn.textContent = shown ? (g.items.length ? 'Show links' : 'No links') : 'Hide links';
        });
      });
      setSortIndicators(dashTable, sortKey, sortDir);
      renderPagination(total, totalPages);
    }

    function doFilter() { page = 1; render(); updateUrl(); }
    function doSort(key) {
      sortDir = sortKey === key ? -sortDir : 1;
      sortKey = key;
      render();
      updateUrl();
    }

    initSortHeaders(dashTable, doSort);
    [selClass, selMfr, selRarity, selEvo, selOwned, selTrack, selEvent].forEach(el => el.addEventListener('change', doFilter));
    search.addEventListener('input', doFilter);

    readUrl();
    render();
  }

  function initEvo() {
    const search = $('#evo-search');
    const selClass = $('#evo-class');
    const selUpdate = $('#evo-update');

    const ownedNames = new Set(getGarage().map(c => c.carName.toLowerCase()));
    const evoCars = cars.filter(c => c.evoEligible);
    [...new Set(evoCars.map(c => c.class))].sort().forEach(v => selClass.add(new Option(v, v)));
    [...new Set(evoCars.map(c => c.evoInfo).filter(Boolean))].sort().forEach(v => selUpdate.add(new Option(v, v)));

    let sortKey = '', sortDir = 1;
    const table = $('#evo-body').closest('table');
    const allCb = $('#evo-all');
    let showAll = false;

    function render() {
      const q = search.value.toLowerCase();
      const cls = selClass.value;
      const upd = selUpdate.value;
      let filtered = evoCars.filter(c => {
        return (showAll || ownedNames.has(c.carName.toLowerCase())) &&
               (!q || c.carName.toLowerCase().includes(q)) &&
               (cls === 'All' || c.class === cls) &&
               (upd === 'All' || c.evoInfo === upd);
      });
      if (sortKey) filtered = [...filtered].sort((a, b) => compareValues(a[sortKey], b[sortKey], sortDir));
      $('#evo-count').textContent = `${filtered.length} EVO car${filtered.length === 1 ? '' : 's'}`;
      $('#evo-body').innerHTML = filtered.map(c =>
        `<tr><td>${c.carName}</td><td>${c.class}</td><td><span class="badge badge-${(c.rarity || '').toLowerCase()}">${c.rarity}</span></td>` +
        `<td class="num">${fmt(c.rankMax)}</td><td>${c.evoInfo || '—'}</td><td>${c.notes || '—'}</td></tr>`
      ).join('');
      setSortIndicators(table, sortKey, sortDir);
    }

    initSortHeaders(table, key => {
      sortDir = sortKey === key ? -sortDir : 1;
      sortKey = key;
      render();
    });
    [search, selClass, selUpdate].forEach(el => el.addEventListener('input', render));
    if (allCb) allCb.addEventListener('change', () => { showAll = allCb.checked; render(); });
    render();
  }

  function initGauntlet() {
    const cols = $('#gauntlet-cols');
    const slots = $('#gauntlet-lineup');
    const summary = $('#gauntlet-summary');

    const trackOptions = tracks.filter(t => t.length === 'Short').sort((a, b) => a.trackName.localeCompare(b.trackName));
    const carOptions = cars.filter(c => c.rankMax != null).sort((a, b) => a.carName.localeCompare(b.carName))
      .map(c => `<option value="${esc(c.carName)}">${esc(c.carName)} (${c.class}, ${fmt(c.rankMax)})</option>`).join('');
    const trackOptionsHtml = trackOptions.map(t => `<option value="${esc(t.trackName)}">${esc(t.trackName)} (${t.environment})</option>`).join('');

    for (let i = 0; i < 5; i++) {
      const col = document.createElement('div');
      col.className = 'gauntlet-col';
      col.style.cssText = 'display:flex;flex-direction:column;gap:0.5rem;padding:0.75rem;border:1px solid var(--border);border-radius:6px;background:var(--card-bg);';
      col.innerHTML = `<strong style="margin-bottom:0.25rem;">Track ${i + 1}</strong>` +
                      `<label for="gauntlet-track-${i}">Track</label>` +
                      `<select id="gauntlet-track-${i}"><option value="">— Select track —</option>${trackOptionsHtml}</select>` +
                      `<label for="gauntlet-opp-${i}">Opponent</label>` +
                      `<select id="gauntlet-opp-${i}"><option value="">— Select opponent —</option>${carOptions}</select>` +
                      `<label for="gauntlet-rec-${i}">Your car</label>` +
                      `<select id="gauntlet-rec-${i}"><option value="">— Select car —</option>${carOptions}</select>` +
                      `<button class="btn gauntlet-use-one" data-i="${i}">Use in slot ${i + 1}</button>`;
      cols.appendChild(col);

      const div = document.createElement('div');
      div.className = 'filter';
      div.innerHTML = `<label for="gauntlet-slot-${i}">Slot ${i + 1}</label><select id="gauntlet-slot-${i}"><option value="">— Select car —</option>${carOptions}</select>`;
      slots.appendChild(div);
    }

    trackOptions.slice(0, 5).forEach((t, i) => { $(`#gauntlet-track-${i}`).value = t.trackName; });

    function gauntletScore(c) {
      if (c.topSpeedMax == null || c.accelerationMax == null || c.handlingMax == null || c.nitroMax == null) return 0;
      return Math.round(c.topSpeedMax + c.accelerationMax * 1.2 + c.handlingMax * 0.5 + c.nitroMax * 0.3);
    }

    function recommendAll() {
      const used = new Set();
      for (let i = 0; i < 5; i++) {
        const oppName = $(`#gauntlet-opp-${i}`).value;
        const opp = cars.find(c => c.carName === oppName);
        const minScore = opp ? gauntletScore(opp) : 0;
        const list = cars.filter(c => c.rankMax != null && !used.has(c.carName) && gauntletScore(c) > minScore)
          .sort((a, b) => gauntletScore(b) - gauntletScore(a) || Number(b.rankMax) - Number(a.rankMax));
        const pick = list[0] || cars.filter(c => !used.has(c.carName)).sort((a, b) => gauntletScore(b) - gauntletScore(a))[0];
        if (pick) {
          used.add(pick.carName);
          $(`#gauntlet-rec-${i}`).value = pick.carName;
        }
      }
    }

    function useOne(i) {
      const rec = $(`#gauntlet-rec-${i}`).value;
      if (rec) $(`#gauntlet-slot-${i}`).value = rec;
      updateSummary();
    }

    function useAll() {
      for (let i = 0; i < 5; i++) {
        const rec = $(`#gauntlet-rec-${i}`).value;
        if (rec) $(`#gauntlet-slot-${i}`).value = rec;
      }
      updateSummary();
    }

    function updateSummary() {
      let total = 0;
      for (let i = 0; i < 5; i++) {
        const name = $(`#gauntlet-slot-${i}`).value;
        const car = cars.find(c => c.carName === name);
        total += (car && car.rankMax) ? Number(car.rankMax) : 0;
      }
      summary.textContent = `Combined max rank: ${total.toLocaleString()}`;
    }

    for (let i = 0; i < 5; i++) {
      $(`#gauntlet-opp-${i}`).addEventListener('change', recommendAll);
      $(`#gauntlet-track-${i}`).addEventListener('change', recommendAll);
      $(`#gauntlet-slot-${i}`).addEventListener('change', updateSummary);
      $(`.gauntlet-use-one[data-i="${i}"]`).addEventListener('click', () => useOne(i));
    }

    $('#gauntlet-use-all').addEventListener('click', useAll);

    recommendAll();
    updateSummary();
  }

  function initFarming() {
    const sel = $('#farm-car');
    const info = $('#farm-car-info');
    const results = $('#farm-results');
    const careerBody = $('#farm-career-body');
    const eventsBody = $('#farm-events-body');
    const masterCb = $('#farm-master');

    function buildOptions(useMaster) {
      const list = useMaster ? [...cars] : getGarage();
      const sorted = list
        .filter(c => c.carName && c.class)
        .sort((a, b) => a.carName.localeCompare(b.carName))
        .map(c => new Option(`${c.carName} (${c.class})`, c.carName));
      sel.innerHTML = '<option value="">— Choose a car —</option>';
      sorted.forEach(o => sel.add(o));
    }
    buildOptions(false);
    if (masterCb) masterCb.addEventListener('change', () => buildOptions(masterCb.checked));

    sel.addEventListener('change', () => {
      const car = cars.find(c => c.carName === sel.value);
      const owned = getGarage().find(c => c.carName === sel.value);
      const displayCar = car || owned;
      if (!displayCar) {
        info.style.display = 'none';
        results.style.display = 'none';
        return;
      }

      const bpInfo = car && car.blueprintCount ? ` — <strong>${fmt(car.blueprintCount)} blueprints</strong> total` : '';
      const evoBadge = car && car.evoEligible ? ' <span class="badge badge-legendary">EVO</span>' : '';
      info.innerHTML = `<strong>${displayCar.carName}</strong> — Class ${displayCar.class}, ${car ? car.rarity || '—' : '—'}${bpInfo}${evoBadge}`;
      info.style.display = 'block';

      const carNameL = car.carName.toLowerCase();
      const classL = 'class ' + car.class.toLowerCase();

      const careerSources = careerSeasons.filter(s => {
        const stage = s.stage.toLowerCase();
        return stage.includes(carNameL) || stage.includes(classL);
      }).sort((a, b) => a.chapter.localeCompare(b.chapter) || a.stage.localeCompare(b.stage));

      $('#farm-career-count').textContent = `${careerSources.length} season${careerSources.length === 1 ? '' : 's'}`;
      careerBody.innerHTML = careerSources.map(s => {
        const tracks = [...new Set(careerRaces.filter(r => r.chapter === s.chapter && r.season === s.stage).map(r => r.track))].join(', ') || '—';
        return `<tr><td>${s.chapter}</td><td>${s.stage}</td><td class="num">${s.races}</td><td class="num">${s.flags}</td><td>${tracks}</td></tr>`;
      }).join('');

      const eventSources = events.filter(e => {
        const el = e.eligibleCars.toLowerCase();
        return el.includes('all classes') || el.includes(classL) || el.includes(carNameL);
      }).sort((a, b) => a.eventName.localeCompare(b.eventName));

      $('#farm-events-count').textContent = `${eventSources.length} event${eventSources.length === 1 ? '' : 's'}`;
      eventsBody.innerHTML = eventSources.map(e =>
        `<tr><td>${e.eventName}</td><td>${e.frequency}</td><td>${e.track}</td><td>${e.rewards}</td><td>${e.notes}</td></tr>`
      ).join('');

      results.style.display = 'block';
    });
  }

  function initUpgradeRoi() {
    const selClass = $('#roi-class');
    const selRarity = $('#roi-rarity');
    const search = $('#roi-search');
    const body = $('#roi-body');
    const count = $('#roi-count');
    const table = $('#roi-table');
    const allCb = $('#roi-all');
    let sortKey = 'costPerRank';
    let sortDir = 1;
    let showAll = false;
    const ownedNames = new Set(getGarage().map(c => c.carName.toLowerCase()));

    function usable(c) {
      return c.totalUpgradeCost && c.rankStock != null && c.rankMax != null &&
        c.topSpeedStock != null && c.accelerationStock != null && c.handlingStock != null && c.nitroStock != null &&
        c.topSpeedMax != null && c.accelerationMax != null && c.handlingMax != null && c.nitroMax != null;
    }

    function enrich(c) {
      const rankGain = c.rankMax - c.rankStock;
      const statGain = (c.topSpeedMax - c.topSpeedStock) + (c.accelerationMax - c.accelerationStock) +
        (c.handlingMax - c.handlingStock) + (c.nitroMax - c.nitroStock);
      return Object.assign({}, c, {
        rankGain: rankGain,
        costPerRank: rankGain > 0 ? Math.round(c.totalUpgradeCost / rankGain) : Infinity,
        costPerStat: statGain > 0 ? Math.round(c.totalUpgradeCost / statGain) : Infinity
      });
    }

    function render() {
      const cls = selClass.value;
      const rar = selRarity.value;
      const q = search.value.trim().toLowerCase();
      let list = cars.filter(usable).filter(c => showAll || ownedNames.has(c.carName.toLowerCase())).map(enrich).filter(c =>
        (!cls || c.class === cls) &&
        (!rar || c.rarity === rar) &&
        (!q || c.carName.toLowerCase().includes(q))
      );
      list.sort((a, b) => {
        let av = a[sortKey], bv = b[sortKey];
        if (av == null) av = Infinity;
        if (bv == null) bv = Infinity;
        return compareValues(av, bv, sortDir);
      });

      count.textContent = `${list.length} car${list.length === 1 ? '' : 's'}`;
      body.innerHTML = list.map(c =>
        `<tr><td>${c.carName}</td><td>${c.class}</td>` +
        `<td><span class="badge badge-${(c.rarity || '').toLowerCase()}">${c.rarity}</span></td>` +
        `<td class="num">${fmt(c.rankStock)}</td><td class="num">${fmt(c.rankMax)}</td>` +
        `<td class="num">${fmt(c.rankGain)}</td><td class="num">${c.totalUpgradeCost.toLocaleString()}</td>` +
        `<td class="num">${c.costPerRank === Infinity ? '—' : c.costPerRank.toLocaleString()}</td>` +
        `<td class="num">${c.costPerStat === Infinity ? '—' : c.costPerStat.toLocaleString()}</td></tr>`
      ).join('');
      setSortIndicators(table, sortKey, sortDir);
    }

    initSortHeaders(table, key => {
      if (sortKey === key) sortDir = -sortDir;
      else { sortKey = key; sortDir = 1; }
      render();
    });

    selClass.addEventListener('change', render);
    selRarity.addEventListener('change', render);
    search.addEventListener('input', render);
    if (allCb) allCb.addEventListener('change', () => { showAll = allCb.checked; render(); });
    render();
  }

  function initEventRoster() {
    const sel = $('#roster-event');
    const info = $('#roster-event-info');
    const results = $('#roster-results');
    const body = $('#roster-body');
    const table = $('#roster-table');
    const allCb = $('#roster-all');
    let sortKey = 'rankMax';
    let sortDir = -1;
    let showAll = false;
    const ownedNames = new Set(getGarage().map(c => c.carName.toLowerCase()));

    [...events].sort((a, b) => a.eventName.localeCompare(b.eventName)).forEach(e => {
      sel.add(new Option(e.eventName, e.eventName));
    });

    function qualifies(c, e) {
      const el = e.eligibleCars.toLowerCase();
      if (el.includes('all classes')) return true;
      if (el.includes('class ' + c.class.toLowerCase())) return true;
      if (el.includes(c.carName.toLowerCase())) return true;
      return false;
    }

    function render() {
      const event = events.find(e => e.eventName === sel.value);
      if (!event) {
        info.style.display = 'none';
        results.style.display = 'none';
        return;
      }
      info.innerHTML = `<strong>${event.eventName}</strong><br>` +
        `Track: ${event.track || '—'}<br>` +
        `Frequency: ${event.frequency || '—'}<br>` +
        `Eligible: ${event.eligibleCars || '—'}<br>` +
        `Rewards: ${event.rewards || '—'}<br>` +
        `Notes: ${event.notes || '—'}`;
      info.style.display = 'block';

      let list = cars.filter(c => qualifies(c, event) && (showAll || ownedNames.has(c.carName.toLowerCase())));
      list.sort((a, b) => {
        let av = a[sortKey], bv = b[sortKey];
        return compareValues(av, bv, sortDir);
      });

      $('#roster-count').textContent = `${list.length} car${list.length === 1 ? '' : 's'}`;
      body.innerHTML = list.map(c =>
        `<tr><td>${c.carName}</td><td>${c.class}</td>` +
        `<td><span class="badge badge-${(c.rarity || '').toLowerCase()}">${c.rarity}</span></td>` +
        `<td class="num">${fmt(c.rankMax)}</td>` +
        `<td class="num">${fix(c.topSpeedMax)}</td><td class="num">${fix(c.accelerationMax)}</td>` +
        `<td class="num">${fix(c.handlingMax)}</td><td class="num">${fix(c.nitroMax)}</td></tr>`
      ).join('');
      setSortIndicators(table, sortKey, sortDir);
    }

    initSortHeaders(table, key => {
      if (sortKey === key) sortDir = -sortDir;
      else { sortKey = key; sortDir = key === 'carName' || key === 'class' || key === 'rarity' ? 1 : -1; }
      render();
    });

    sel.addEventListener('change', render);
    if (allCb) allCb.addEventListener('change', () => { showAll = allCb.checked; render(); });
    render();
  }

  function initCompare() {
    const sel1 = $('#compare-car-1');
    const sel2 = $('#compare-car-2');
    const masterCb = $('#compare-master');
    let useMaster = false;

    function buildOptions() {
      const list = useMaster ? [...cars] : getGarage();
      const opts = list
        .filter(c => c.carName && c.class)
        .sort((a, b) => a.carName.localeCompare(b.carName))
        .map(c => `<option value="${esc(c.carName)}">${esc(c.carName)} (${c.class})</option>`)
        .join('');
      sel1.innerHTML = '<option value="">— Select car —</option>' + opts;
      sel2.innerHTML = '<option value="">— Select car —</option>' + opts;
    }

    function getCar(name) {
      if (useMaster) return cars.find(c => c.carName === name) || null;
      const owned = getGarage().find(c => c.carName === name);
      if (!owned) return null;
      const master = cars.find(c => c.carName === owned.carName);
      const norm = Object.assign({}, master || {}, owned);
      if (owned.topSpeed != null) norm.topSpeedMax = owned.topSpeed;
      if (owned.acceleration != null) norm.accelerationMax = owned.acceleration;
      if (owned.handling != null) norm.handlingMax = owned.handling;
      if (owned.nitro != null) norm.nitroMax = owned.nitro;
      return norm;
    }

    function render() {
      const c1 = getCar(sel1.value);
      const c2 = getCar(sel2.value);
      const results = $('#compare-results');
      if (!c1 || !c2) {
        results.style.display = 'none';
        return;
      }
      $('#compare-name-1').textContent = c1.carName;
      $('#compare-name-2').textContent = c2.carName;

      function fmtVal(v, key) {
        if (v == null || v === '') return '—';
        if (typeof v === 'number') return Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 });
        return v;
      }

      function row(label, key, invert = false) {
        const v1 = c1[key], v2 = c2[key];
        let cls1 = '', cls2 = '';
        if (v1 != null && v2 != null && typeof v1 === 'number' && typeof v2 === 'number') {
          if (!invert) {
            if (v1 > v2) cls1 = 'better';
            else if (v2 > v1) cls2 = 'better';
          } else {
            if (v1 < v2) cls1 = 'better';
            else if (v2 < v1) cls2 = 'better';
          }
        }
        return `<tr><td>${label}</td><td class="${cls1}">${fmtVal(v1, key)}</td><td class="${cls2}">${fmtVal(v2, key)}</td></tr>`;
      }

      $('#compare-body').innerHTML =
        row('Class', 'class') +
        row('Rarity', 'rarity') +
        row('Rank', 'rankMax') +
        row('Top Speed', 'topSpeedMax') +
        row('Acceleration', 'accelerationMax') +
        row('Handling', 'handlingMax') +
        row('Nitro', 'nitroMax') +
        row('Blueprint Count', 'blueprintCount') +
        row('Total Upgrade Cost', 'totalUpgradeCost', true) +
        `<tr><td>Recommended Tracks</td><td>${c1.recommendedTracks || '—'}</td><td>${c2.recommendedTracks || '—'}</td></tr>` +
        `<tr><td>Notes</td><td>${c1.notes || '—'}</td><td>${c2.notes || '—'}</td></tr>`;

      results.style.display = 'block';
    }

    buildOptions();
    if (masterCb) masterCb.addEventListener('change', () => {
      useMaster = masterCb.checked;
      buildOptions();
      render();
    });
    sel1.addEventListener('change', render);
    sel2.addEventListener('change', render);
  }

  function initGarageForm() {
    const form = $('#garage-form');
    const input = $('#garage-form-car');
    const datalist = $('#garage-form-car-list');
    const formId = $('#garage-form-id');
    if (!form || !input || !datalist) return;
    function slugify(name) {
      return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
    const sorted = [...cars].sort((a, b) => a.carName.localeCompare(b.carName));
    sorted.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.carName;
      datalist.appendChild(opt);
    });
    function updateFromCarName() {
      const raw = input.value.trim();
      const car = cars.find(c => c.carName.toLowerCase() === raw.toLowerCase());
      if (!car) return;
      input.value = car.carName;
      $('#gf-class').value = car.class || '';
      $('#gf-rank').value = car.rankMax || '';
      $('#gf-stars').value = '';
      $('#gf-topspeed').value = car.topSpeedMax || '';
      $('#gf-accel').value = car.accelerationMax || '';
      $('#gf-handling').value = car.handlingMax || '';
      $('#gf-nitro').value = car.nitroMax || '';
    }
    input.addEventListener('change', updateFromCarName);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const raw = input.value.trim();
      if (!raw) return;
      const known = cars.find(c => c.carName.toLowerCase() === raw.toLowerCase());
      const carName = known ? known.carName : raw;
      const newId = known ? (known.id || slugify(known.carName)) : slugify(raw);
      const classVal = known ? (known.class || '') : ($('#gf-class').value || '');
      const originalId = formId ? formId.value : '';
      const original = originalId ? getGarage().find(g => g.id === originalId) : null;
      const existing = getLocalGarage().find(g => g.id === newId);
      const base = {
        carName,
        matchedCar: carName,
        class: classVal,
        rankCurrent: Number($('#gf-rank').value) || null,
        rankMax: Number($('#gf-rank').value) || null,
        stars: Number($('#gf-stars').value) || null,
        topSpeed: Number($('#gf-topspeed').value) || null,
        acceleration: Number($('#gf-accel').value) || null,
        handling: Number($('#gf-handling').value) || null,
        nitro: Number($('#gf-nitro').value) || null,
        capturedAt: new Date().toISOString(),
        imageName: ''
      };
      const preserved = (original && originalId === newId) ? {
        blueprintCurrent: original.blueprintCurrent,
        blueprintMax: original.blueprintMax,
        blueprintStatus: original.blueprintStatus
      } : {};
      const entry = Object.assign(
        { id: newId },
        { blueprintCurrent: null, blueprintMax: null, blueprintStatus: '' },
        preserved,
        existing || {},
        base,
        { id: newId }
      );
      let list = getLocalGarage().filter(g => g.id !== originalId && g.id !== newId);
      list.push(entry);
      saveLocalGarage(list);
      if (formId) formId.value = '';
      form.reset();
      location.reload();
    });
  }

  function makeSearchable(select) {
    if (select.dataset.searchable === 'done' || select.multiple || select.size > 1) return;
    const all = [...select.options].map(o => ({ value: o.value, text: o.textContent, selected: o.selected }));
    const wrapper = document.createElement('div');
    wrapper.className = 'searchable-select';
    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);

    const row = document.createElement('div');
    row.className = 'searchable-select-row';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'searchable-select-input';
    input.placeholder = 'Filter...';
    input.setAttribute('aria-label', 'Filter ' + (select.getAttribute('aria-label') || 'options'));
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'searchable-select-clear';
    clear.textContent = '×';
    clear.setAttribute('aria-label', 'Clear filter');
    clear.style.display = 'none';
    row.appendChild(input);
    row.appendChild(clear);
    wrapper.insertBefore(row, select);

    const observer = new MutationObserver(() => { select._all = [...select.options].map(o => ({ value: o.value, text: o.textContent, selected: o.selected })); });
    observer.observe(select, { childList: true });
    select._all = all;
    function update() {
      const q = input.value.trim().toLowerCase();
      const master = select._all || [];
      const chosen = select.value;
      const filtered = q ? master.filter(o => o.text.toLowerCase().includes(q)) : master;
      observer.disconnect();
      select.innerHTML = filtered.map(o => `<option value="${esc(o.value)}" ${o.value === chosen ? 'selected' : ''}>${esc(o.text)}</option>`).join('');
      observer.observe(select, { childList: true });
      select.value = chosen;
      clear.style.display = q ? 'inline-flex' : 'none';
    }
    input.addEventListener('input', update);
    clear.addEventListener('click', () => { input.value = ''; input.dispatchEvent(new Event('input')); });
    select.dataset.searchable = 'done';
  }

  function initSearchableSelects() {
    document.querySelectorAll('select').forEach(makeSearchable);
  }

  function initInstallPrompt() {
    let deferredPrompt;
    const header = $('.header-inner');
    if (!header) return;
    const btn = document.createElement('button');
    btn.id = 'install-btn';
    btn.className = 'btn';
    btn.textContent = 'Install';
    btn.style.display = 'none';
    header.appendChild(btn);
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      btn.style.display = 'inline-flex';
    });
    btn.addEventListener('click', () => {
      if (!deferredPrompt) return;
      btn.style.display = 'none';
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => { deferredPrompt = null; });
    });
    window.addEventListener('appinstalled', () => { btn.style.display = 'none'; deferredPrompt = null; });
  }

  document.addEventListener('DOMContentLoaded', () => {
    addManifestLink();
    registerSW();
    initTheme();
    initNav();
    addManualCarsNav();
    initCollapsible();
    initTooltips();
    initMobileCards();
    initEmptyStates();
    if ($('#home-stats')) initHome();
    if ($('#global-search')) initGlobalSearch();
    if ($('#cars-body')) initCars();
    if ($('#tracks-body')) initTracks();
    if ($('#career-race-body')) initCareer();
    if ($('#sp-solve')) initSeasonPass();
    if ($('#events-body')) initEvents();
    if ($('#gauntlet-lineup')) initGauntlet();
    if ($('#evo-body')) initEvo();
    if ($('#farm-car')) initFarming();
    if ($('#roi-table')) initUpgradeRoi();
    if ($('#roster-event')) initEventRoster();
    if ($('#compare-car-1')) initCompare();
    if ($('#cal-list')) initCalendar();
    if ($('#garage-body')) initGarage();
    if ($('#garage-form')) initGarageForm();
    if ($('#manual-cars-body')) initManualCars();
    applySearchFromUrl();
    if (!$('#gp-predict-car')) initSearchableSelects();
    initInstallPrompt();
  });

  function initCalendar() {
    const selStatus = $('#cal-status');
    const selType = $('#cal-type');
    const search = $('#cal-search');
    const list = $('#cal-list');
    const count = $('#cal-count');

    const types = [...new Set(calendarEvents.map(e => e.type))].sort();
    types.forEach(t => selType.add(new Option(t, t)));

    function status(e) {
      const today = new Date();
      today.setHours(0,0,0,0);
      const start = e.startDate ? new Date(e.startDate) : null;
      const end = e.endDate ? new Date(e.endDate) : null;
      if (start && end) {
        if (today < start) return 'upcoming';
        if (today >= start && today <= end) return 'active';
        return 'past';
      }
      return 'unknown';
    }

    function fmtDate(d) {
      if (!d) return '—';
      return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function render() {
      const st = selStatus.value;
      const type = selType.value;
      const q = search.value.trim().toLowerCase();

      let filtered = calendarEvents.map(e => Object.assign({}, e, { _status: status(e) }))
        .filter(e => {
          if (st === 'current') {
            if (e._status !== 'upcoming' && e._status !== 'active') return false;
          } else if (st !== 'all' && e._status !== st) {
            return false;
          }
          if (type && e.type !== type) return false;
          if (q && !e.eventName.toLowerCase().includes(q) && !e.featuredCars.toLowerCase().includes(q)) return false;
          return true;
        })
        .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));

      count.textContent = `${filtered.length} event${filtered.length === 1 ? '' : 's'}`;
      if (!filtered.length) {
        list.innerHTML = '<p class="empty-state">No events match your filters.</p>';
        return;
      }
      list.innerHTML = filtered.map(e => {
        const badge = e._status === 'active' ? '<span class="badge badge-epic">Active</span>' :
          e._status === 'upcoming' ? '<span class="badge badge-uncommon">Upcoming</span>' :
          e._status === 'past' ? '<span class="badge badge-common">Past</span>' : '';
        return `<div class="cal-card">
          <div class="cal-header"><h4>${e.eventName}</h4>${badge}</div>
          <div class="cal-meta"><span>${e.type}</span> &middot; <span>${e.format}</span> &middot; <span>${fmtDate(e.startDate)} – ${fmtDate(e.endDate)}</span></div>
          <p><strong>Featured cars:</strong> ${e.featuredCars || '—'}</p>
          ${e.relatedUpdate ? `<p><strong>Update:</strong> ${e.relatedUpdate}</p>` : ''}
          ${e.notes ? `<p class="cal-notes">${e.notes}</p>` : ''}
        </div>`;
      }).join('');
    }

    selStatus.addEventListener('change', render);
    selType.addEventListener('change', render);
    search.addEventListener('input', render);
    render();
  }

  function initGarage() {
    const table = $('#garage-body').closest('table');
    let sortKey = '', sortDir = 1;

    function switchTab(name) {
      $$('#garage-tab-bar .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
      $$('.tab-panel[data-tab]').forEach(p => p.classList.toggle('active', p.dataset.tab === name));
    }

    function editGarageCar(id) {
      const c = getGarage().find(g => g.id === id);
      if (!c) return;
      switchTab('add');
      const input = $('#garage-form-car');
      const formId = $('#garage-form-id');
      if (formId) formId.value = id;
      input.value = c.carName;
      input.focus();
      $('#gf-class').value = c.class || '';
      $('#gf-rank').value = c.rankCurrent != null ? c.rankCurrent : (c.rankMax != null ? c.rankMax : '');
      $('#gf-stars').value = c.stars != null ? c.stars : '';
      $('#gf-topspeed').value = c.topSpeed != null ? c.topSpeed : '';
      $('#gf-accel').value = c.acceleration != null ? c.acceleration : '';
      $('#gf-handling').value = c.handling != null ? c.handling : '';
      $('#gf-nitro').value = c.nitro != null ? c.nitro : '';
    }
    window.editGarageCar = editGarageCar;

    function removeGarageCar(id) {
      saveLocalGarage(getLocalGarage().filter(g => g.id !== id));
      render();
    }
    window.removeGarageCar = removeGarageCar;

    function renderStats() {
      const data = getGarage();
      const catalog = (typeof cars !== 'undefined' ? cars : []);
      const classCounts = {};
      let totalRank = 0, countWithRank = 0, bpTotal = 0, bpToMaxTotal = 0;
      data.forEach(c => {
        classCounts[c.class] = (classCounts[c.class] || 0) + 1;
        if (c.rankCurrent != null) { totalRank += c.rankCurrent; countWithRank++; }
        if (c.blueprintCurrent != null) bpTotal += c.blueprintCurrent;
        const btm = (c.blueprintCurrent != null && c.blueprintMax != null) ? c.blueprintMax - c.blueprintCurrent : null;
        if (btm != null) bpToMaxTotal += btm;
      });
      const pct = catalog.length ? Math.round(data.length / catalog.length * 100) : 0;
      const top = [...data].sort((a, b) => (b.rankCurrent || 0) - (a.rankCurrent || 0)).slice(0, 3).map(c => c.carName).join(', ') || '—';
      const classHtml = Object.entries(classCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="stat-card"><span class="num">${v}</span><span class="label">${esc(k)}</span></div>`).join('');
      const avgRank = countWithRank ? Math.round(totalRank / countWithRank).toLocaleString() : '—';
      const statContainer = $('#garage-stats');
      if (statContainer) statContainer.innerHTML = `
        <div class="stat-card"><span class="num">${data.length}</span><span class="label">Owned</span></div>
        <div class="stat-card"><span class="num">${pct}%</span><span class="label">Of catalog</span></div>
        <div class="stat-card"><span class="num">${avgRank}</span><span class="label">Avg rank</span></div>
        <div class="stat-card"><span class="num">${bpTotal.toLocaleString()}</span><span class="label">Total BPs</span></div>
        <div class="stat-card"><span class="num">${bpToMaxTotal.toLocaleString()}</span><span class="label">BPs to max</span></div>
        ${classHtml}
        <div class="stat-card" style="grid-column:1/-1;"><span class="num" style="font-size:0.95rem;">${esc(top)}</span><span class="label">Top 3 by rank</span></div>
      `;
    }

    let filterText = '', filterClass = '', filterBad = false;
    const catalogNames = new Set((typeof cars !== 'undefined' ? cars : []).map(c => c.carName));

    function isBad(c) {
      return !c.class || c.rankCurrent == null || c.topSpeed == null || c.stars == null || !catalogNames.has(c.carName);
    }

    function filterData(data) {
      const q = filterText.trim().toLowerCase();
      return data.filter(c => {
        if (filterClass && c.class !== filterClass) return false;
        if (filterBad && !isBad(c)) return false;
        if (!q) return true;
        return (c.carName || '').toLowerCase().includes(q) || (c.class || '').toLowerCase().includes(q);
      });
    }

    function render() {
      const data = getGarage();
      const filtered = filterData(data);
      if (sortKey) filtered.sort((a, b) => compareValues(a[sortKey], b[sortKey], sortDir));
      $('#garage-count').textContent = `${filtered.length} car${filtered.length === 1 ? '' : 's'}`;
      renderStats();
      if (!filtered.length) {
        $('#garage-body').innerHTML = '<tr><td colspan="12" class="empty-state">No cars in garage. Use the form below to add cars.</td></tr>';
        setSortIndicators(table, sortKey, sortDir);
        return;
      }
      renderTable('garage-body', filtered, (c, row) => {
        row.appendChild(makeCell(c.carName));
        row.appendChild(makeCell(c.class));
        row.appendChild(makeCell(c.rankCurrent != null && c.rankMax != null ? `${c.rankCurrent.toLocaleString()} / ${c.rankMax.toLocaleString()}` : '—', 'num'));
        row.appendChild(makeCell(c.stars != null ? c.stars : '—', 'num'));
        row.appendChild(makeCell(c.blueprintCurrent != null ? c.blueprintCurrent : '—', 'num'));
        row.appendChild(makeCell(c.blueprintMax != null ? c.blueprintMax : '—', 'num'));
        const toMax = (c.blueprintCurrent != null && c.blueprintMax != null) ? c.blueprintMax - c.blueprintCurrent : null;
        row.appendChild(makeCell(toMax != null ? toMax : '—', 'num'));
        row.appendChild(makeCell(c.topSpeed != null ? c.topSpeed : '—', 'num'));
        row.appendChild(makeCell(c.acceleration != null ? c.acceleration : '—', 'num'));
        row.appendChild(makeCell(c.handling != null ? c.handling : '—', 'num'));
        row.appendChild(makeCell(c.nitro != null ? c.nitro : '—', 'num'));
        const actions = makeCell('');
        const editBtn = document.createElement('button');
        editBtn.className = 'btn';
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', () => editGarageCar(c.id));
        actions.appendChild(editBtn);
        const del = document.createElement('button');
        del.className = 'btn';
        del.textContent = 'Remove';
        del.style.marginLeft = '0.25rem';
        del.addEventListener('click', () => removeGarageCar(c.id));
        actions.appendChild(del);
        row.appendChild(actions);
      });
      setSortIndicators(table, sortKey, sortDir);
    }

    initSortHeaders(table, key => {
      sortDir = sortKey === key ? -sortDir : 1;
      sortKey = key;
      render();
    });

    const filterTextInput = $('#garage-filter-text');
    const filterClassSelect = $('#garage-filter-class');
    const filterBadCheck = $('#garage-filter-bad');
    const filterClearBtn = $('#garage-filter-clear');
    function onFilterChange() {
      filterText = filterTextInput ? filterTextInput.value : '';
      filterClass = filterClassSelect ? filterClassSelect.value : '';
      filterBad = filterBadCheck ? filterBadCheck.checked : false;
      render();
    }
    if (filterTextInput) filterTextInput.addEventListener('input', onFilterChange);
    if (filterClassSelect) filterClassSelect.addEventListener('change', onFilterChange);
    if (filterBadCheck) filterBadCheck.addEventListener('change', onFilterChange);
    if (filterClearBtn) filterClearBtn.addEventListener('click', () => {
      if (filterTextInput) filterTextInput.value = '';
      if (filterClassSelect) filterClassSelect.value = '';
      if (filterBadCheck) filterBadCheck.checked = false;
      onFilterChange();
    });

    $$('#garage-tab-bar .tab-btn').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));

    render();

    const exportBtn = $('#garage-export');
    const importInput = $('#garage-import');
    const importStatus = $('#garage-import-status');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(getLocalGarage(), null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'garage-backup.json';
        a.click();
      });
    }
    if (importInput) {
      importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const imported = JSON.parse(ev.target.result);
            if (!Array.isArray(imported)) throw new Error('Expected an array of garage entries.');
            const valid = imported.filter(g => g && g.id && g.carName);
            if (!valid.length) throw new Error('No valid garage entries found.');
            saveLocalGarage(valid);
            importStatus.textContent = `Imported ${valid.length} car(s). Reloading...`;
            location.reload();
          } catch (err) {
            importStatus.textContent = err.message;
          }
        };
        reader.readAsText(file);
      });
    }

    initGarageGauntlet();
  }

  function initGarageGauntlet() {
    const table = $('#garage-gauntlet-body').closest('table');
    if (!table) return;
    let sortKey = '', sortDir = 1;
    let filterText = '', filterClass = '';

    function slugify(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''); }

    function buildCarStats() {
      const logs = getGauntletLogs();
      const trackList = (typeof tracks !== 'undefined' ? tracks : []);
      const carMap = new Map();
      logs.forEach((l) => {
        const carId = l.car_id;
        if (!carMap.has(carId)) carMap.set(carId, { sessions: new Set(), logs: 0, tracks: new Set(), lastUsed: null, totalError: 0, trackTimes: new Map() });
        const s = carMap.get(carId);
        if (l.session_id) s.sessions.add(l.session_id);
        s.logs++;
        s.tracks.add(l.track_id);
        if (!s.lastUsed || l.timestamp > s.lastUsed) s.lastUsed = l.timestamp;
        s.totalError += (l.actual_time_sec - l.predicted_time_sec);
        const existing = s.trackTimes.get(l.track_id);
        if (!existing || l.actual_time_sec < existing.time) s.trackTimes.set(l.track_id, { time: l.actual_time_sec });
      });
      const garage = getGarage();
      return garage.map((g) => {
        const s = carMap.get(g.id);
        if (!s) return null;
        const sortedTracks = [...s.trackTimes.entries()].sort((a, b) => a[1].time - b[1].time);
        const best = sortedTracks[0];
        const worst = sortedTracks[sortedTracks.length - 1];
        const trackName = (id) => (trackList.find(t => slugify(t.trackName) === id) || {}).trackName || id;
        return {
          id: g.id,
          carName: g.carName,
          class: g.class,
          sessions: s.sessions.size,
          logs: s.logs,
          tracks: s.tracks.size,
          lastUsed: s.lastUsed,
          avgError: s.logs ? s.totalError / s.logs : 0,
          bestTrack: best ? trackName(best[0]) : '—',
          worstTrack: worst ? trackName(worst[0]) : '—'
        };
      }).filter(Boolean);
    }

    let data = [];
    function filterData() {
      const q = filterText.trim().toLowerCase();
      return data.filter(c => {
        if (filterClass && c.class !== filterClass) return false;
        if (!q) return true;
        return (c.carName || '').toLowerCase().includes(q) || (c.class || '').toLowerCase().includes(q);
      });
    }

    function render() {
      data = buildCarStats();
      $('#garage-gauntlet-count').textContent = `${data.length} car${data.length === 1 ? '' : 's'} with logs`;
      const filtered = filterData();
      if (sortKey) filtered.sort((a, b) => compareValues(a[sortKey], b[sortKey], sortDir));
      if (!filtered.length) {
        $('#garage-gauntlet-body').innerHTML = '<tr><td colspan="9" class="empty-state">No Gauntlet logs for owned cars yet. Record sessions on the Gauntlet page.</td></tr>';
        setSortIndicators(table, sortKey, sortDir);
        return;
      }
      renderTable('garage-gauntlet-body', filtered, (c, row) => {
        row.appendChild(makeCell(c.carName));
        row.appendChild(makeCell(c.class));
        row.appendChild(makeCell(c.sessions, 'num'));
        row.appendChild(makeCell(c.logs, 'num'));
        row.appendChild(makeCell(c.tracks, 'num'));
        row.appendChild(makeCell(c.lastUsed ? new Date(c.lastUsed).toLocaleDateString() : '—', 'num'));
        row.appendChild(makeCell(c.avgError > 0 ? `+${fmt(c.avgError)}` : fmt(c.avgError), 'num'));
        row.appendChild(makeCell(c.bestTrack));
        row.appendChild(makeCell(c.worstTrack));
      });
      setSortIndicators(table, sortKey, sortDir);
    }

    initSortHeaders(table, key => {
      sortDir = sortKey === key ? -sortDir : 1;
      sortKey = key;
      render();
    });

    const filterTextInput = $('#garage-gauntlet-filter-text');
    const filterClassSelect = $('#garage-gauntlet-filter-class');
    const filterClearBtn = $('#garage-gauntlet-filter-clear');
    function onFilterChange() {
      filterText = filterTextInput ? filterTextInput.value : '';
      filterClass = filterClassSelect ? filterClassSelect.value : '';
      render();
    }
    if (filterTextInput) filterTextInput.addEventListener('input', onFilterChange);
    if (filterClassSelect) filterClassSelect.addEventListener('change', onFilterChange);
    if (filterClearBtn) filterClearBtn.addEventListener('click', () => {
      if (filterTextInput) filterTextInput.value = '';
      if (filterClassSelect) filterClassSelect.value = '';
      onFilterChange();
    });

    render();
  }

  function addManualCarsNav() {
    const tools = $('#nav-tools');
    if (!tools) return;
    if (tools.querySelector('a[href="manual_cars.html"]')) return;
    tools.insertAdjacentHTML('beforeend', '<li><a href="manual_cars.html">Manual Cars</a></li>');
  }

  function initManualCars() {
    const STORAGE_KEY = 'manualCarOverrides';
    const TRACKED = ['rankStock', 'rankMax', 'topSpeedStock', 'topSpeedMax', 'accelerationStock', 'accelerationMax', 'handlingStock', 'handlingMax', 'nitroStock', 'nitroMax', 'blueprintCount', 'totalUpgradeCost'];

    function loadOverrides() {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
    }
    function saveOverrides(o) { localStorage.setItem(STORAGE_KEY, JSON.stringify(o)); }

    function effective(car) {
      const o = loadOverrides();
      return Object.assign({}, car, o[car.carName] || {});
    }

    function missingFields(car) {
      const e = effective(car);
      return TRACKED.filter(f => e[f] == null || e[f] === '');
    }

    function getQueue() {
      return cars.filter(c => missingFields(c).length > 0).sort((a, b) => a.carName.localeCompare(b.carName));
    }

    const tbody = $('#manual-cars-body');
    const count = $('#manual-cars-count');
    const dialog = $('#manual-car-dialog');
    const form = $('#manual-car-form');
    const carNameDisplay = $('#dialog-car-name');
    const exportBtn = $('#manual-cars-export');
    const exportJsBtn = $('#manual-cars-export-js');

    function buildMergedDataJs() {
      const overrides = loadOverrides();
      const mergedCars = cars.map(c => Object.assign({}, c, overrides[c.carName] || {}));
      const arrays = {
        cars: mergedCars,
        tracks: typeof tracks !== 'undefined' ? tracks : [],
        careerSeasons: typeof careerSeasons !== 'undefined' ? careerSeasons : [],
        careerRaces: typeof careerRaces !== 'undefined' ? careerRaces : [],
        events: typeof events !== 'undefined' ? events : [],
        calendarEvents: typeof calendarEvents !== 'undefined' ? calendarEvents : []
      };
      return Object.entries(arrays)
        .map(([name, arr]) => `const ${name} = ${JSON.stringify(arr, null, 2)};`)
        .join('\n\n') + '\n';
    }

    function render() {
      const queue = getQueue();
      tbody.innerHTML = '';
      count.textContent = `${queue.length} car${queue.length === 1 ? '' : 's'} need manual updates`;
      queue.forEach(car => {
        const row = document.createElement('tr');
        row.appendChild(makeCell(car.carName));
        row.appendChild(makeCell(car.class));
        row.appendChild(makeCell(car.manufacturer));
        row.appendChild(makeCell(missingFields(car).join(', ')));
        const actionTd = makeCell('');
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.textContent = 'Edit';
        btn.addEventListener('click', () => openDialog(car));
        actionTd.appendChild(btn);
        row.appendChild(actionTd);
        tbody.appendChild(row);
      });
    }

    function openDialog(car) {
      const e = effective(car);
      $('#edit-car-name').value = car.carName;
      carNameDisplay.textContent = car.carName;
      TRACKED.forEach(f => {
        const input = $(`#edit-${f}`);
        if (input) input.value = e[f] == null ? '' : e[f];
      });
      dialog.showModal();
    }

    function closeDialog() { dialog.close(); }

    $('#dialog-close').addEventListener('click', closeDialog);
    $('#edit-cancel').addEventListener('click', closeDialog);
    dialog.addEventListener('click', (ev) => { if (ev.target === dialog) closeDialog(); });

    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const carName = $('#edit-car-name').value;
      const overrides = loadOverrides();
      overrides[carName] = overrides[carName] || {};
      TRACKED.forEach(f => {
        const input = $(`#edit-${f}`);
        const raw = input.value.trim();
        if (raw === '') {
          overrides[carName][f] = null;
        } else {
          const num = Number(raw);
          overrides[carName][f] = isNaN(num) ? raw : num;
        }
      });
      saveOverrides(overrides);
      closeDialog();
      render();
    });

    exportBtn.addEventListener('click', () => {
      const overrides = loadOverrides();
      const data = Object.entries(overrides).map(([name, vals]) => ({ carName: name, ...vals }));
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'manual_cars.json';
      a.click();
      URL.revokeObjectURL(a.href);
    });

    if (exportJsBtn) {
      exportJsBtn.addEventListener('click', () => {
        const blob = new Blob([buildMergedDataJs()], { type: 'text/javascript' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'data.js';
        a.click();
        URL.revokeObjectURL(a.href);
      });
    }

    render();
  }

  window.makeSearchable = makeSearchable;
  window.initSearchableSelects = initSearchableSelects;
})();
