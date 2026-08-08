
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
    const select = $('#theme-select');
    if (select) {
      select.value = stored;
      select.addEventListener('change', () => {
        const val = select.value;
        document.documentElement.setAttribute('data-theme', val);
        localStorage.setItem('theme', val);
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
      th.addEventListener('click', () => onSort(th.dataset.sort));
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
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {});
    }
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
  function getCombinedGarage() {
    const local = getLocalGarage();
    const localIds = new Set(local.map(g => g.id));
    const base = (typeof garage !== 'undefined' ? garage : []);
    return [...local, ...base.filter(g => !localIds.has(g.id))];
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
  }

  function initGlobalSearch() {
    const inner = $('.header-inner');
    if (!inner || $('#global-search')) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'global-search';
    wrapper.id = 'global-search';
    wrapper.innerHTML = '<input type="search" id="global-search-input" placeholder="Find cars, tracks, seasons, events…" aria-label="Global search" autocomplete="off" /><div id="global-search-results" class="global-search-results" role="listbox"></div>';
    inner.insertBefore(wrapper, inner.querySelector('.theme-switcher'));

    const input = $('#global-search-input');
    const results = $('#global-search-results');
    let debounce;

    function find(q) {
      const m = q.toLowerCase();
      const out = [];
      cars.filter(c => c.carName.toLowerCase().includes(m)).slice(0, 5).forEach(c => out.push({ type: 'Car', name: c.carName, link: 'cars.html?search=' + encodeURIComponent(c.carName) }));
      tracks.filter(t => t.trackName.toLowerCase().includes(m)).slice(0, 4).forEach(t => out.push({ type: 'Track', name: t.trackName, link: 'tracks.html?search=' + encodeURIComponent(t.trackName) }));
      careerSeasons.filter(s => s.chapter.toLowerCase().includes(m) || s.stage.toLowerCase().includes(m)).slice(0, 4).forEach(s => out.push({ type: 'Career', name: s.stage, link: 'career.html?search=' + encodeURIComponent(s.stage) }));
      events.filter(e => e.eventName.toLowerCase().includes(m) || e.eligibleCars.toLowerCase().includes(m)).slice(0, 4).forEach(e => out.push({ type: 'Event', name: e.eventName, link: 'events.html?search=' + encodeURIComponent(e.eventName) }));
      return out;
    }

    function renderResults() {
      const q = input.value.trim();
      if (!q) { results.classList.remove('open'); return; }
      const items = find(q);
      if (!items.length) {
        results.innerHTML = '<div class="global-search-empty">No results</div>';
      } else {
        results.innerHTML = items.map(i => `<div class="global-search-result" data-link="${i.link}"><strong>${i.name}</strong><small>${i.type}</small></div>`).join('');
        $$('.global-search-result', results).forEach(el => el.addEventListener('click', () => location.href = el.dataset.link));
      }
      results.classList.add('open');
    }

    input.addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(renderResults, 150); });
    input.addEventListener('focus', () => { if (input.value.trim()) renderResults(); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Escape') { input.value = ''; results.classList.remove('open'); } if (e.key === 'Enter' && input.value.trim()) location.href = 'cars.html?search=' + encodeURIComponent(input.value.trim()); });
    document.addEventListener('click', (e) => { if (!wrapper.contains(e.target)) results.classList.remove('open'); });
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

  // ---------- Home ----------
  function initHome() {
    const byClass = {};
    cars.forEach(c => { byClass[c.class] = (byClass[c.class] || 0) + 1; });
    $('#stat-cars').textContent = cars.length;
    $('#stat-tracks').textContent = tracks.length;
    $('#stat-seasons').textContent = careerSeasons.length;
    $('#stat-events').textContent = events.length;
    $('#stat-classes').textContent = Object.keys(byClass).length;
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
    const passInput = $('#sp-pass');
    const conditionSelect = $('#sp-condition');
    const classSelect = $('#sp-class');
    const targetInput = $('#sp-target');
    const locationsInput = $('#sp-locations');
    const modeInput = $('#sp-mode');
    const solveBtn = $('#sp-solve');
    const results = $('#sp-results');
    const tracksBody = $('#sp-tracks-body');
    const carsBody = $('#sp-cars-body');
    const racesBody = $('#sp-races-body');

    missionConditions.forEach(c => conditionSelect.add(new Option(c.label, c.id)));
    [...new Set(cars.map(c => c.class))].sort().forEach(v => classSelect.add(new Option(v, v)));

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
      const mode = modeInput.value.toLowerCase();

      const matchedTracks = tracks.filter(t => matchesLocations(t, locs) && matchesCondition(t, cond))
        .sort((a, b) => a.trackName.localeCompare(b.trackName));
      const trackNames = new Set(matchedTracks.map(t => t.trackName));

      const matchedCars = cars.filter(c => !cls || c.class === cls)
        .sort((a, b) => a.carName.localeCompare(b.carName));

      const matchedRaces = careerRaces.filter(r => {
        return trackNames.has(r.track) && (!mode || r.mode.toLowerCase().includes(mode));
      });

      results.style.display = 'block';
      $('#sp-tracks-count').textContent = `${matchedTracks.length} track${matchedTracks.length === 1 ? '' : 's'}`;
      tracksBody.innerHTML = matchedTracks.map(t => `<tr><td>${t.trackName}</td><td>${t.environment}</td><td>${t.length}</td><td>${t.hazards || '—'}</td></tr>`).join('');

      $('#sp-cars-count').textContent = `${matchedCars.length} car${matchedCars.length === 1 ? '' : 's'}`;
      carsBody.innerHTML = matchedCars.map(c => `<tr><td>${c.carName}</td><td>${c.class}</td><td>${c.rarity || '—'}</td><td>${c.maxRank || c.rank || '—'}</td></tr>`).join('');

      $('#sp-races-count').textContent = `${matchedRaces.length} race${matchedRaces.length === 1 ? '' : 's'}`;
      racesBody.innerHTML = matchedRaces.map(r => `<tr><td>${r.chapter}</td><td>${r.season}</td><td>${r.race}</td><td>${r.rank}</td><td>${r.mode}</td><td>${r.track}</td><td>${r.credits}</td><td>${r.rep}</td></tr>`).join('');
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

  // ---------- Dashboard ----------
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

      const ownedNames = ownedFilter === 'owned' ? new Set(getCombinedGarage().map(g => g.carName.toLowerCase())) : null;

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

    const evoCars = cars.filter(c => c.evoEligible);
    [...new Set(evoCars.map(c => c.class))].sort().forEach(v => selClass.add(new Option(v, v)));
    [...new Set(evoCars.map(c => c.evoInfo).filter(Boolean))].sort().forEach(v => selUpdate.add(new Option(v, v)));

    let sortKey = '', sortDir = 1;
    const table = $('#evo-body').closest('table');

    function render() {
      const q = search.value.toLowerCase();
      const cls = selClass.value;
      const upd = selUpdate.value;
      let filtered = evoCars.filter(c => {
        return (!q || c.carName.toLowerCase().includes(q)) &&
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
    render();
  }

  function initGauntlet() {
    const trackSearch = $('#gauntlet-track-search');
    const gauntletTracks = tracks.filter(t => t.length === 'Short');
    let trackSortKey = '', trackSortDir = 1;
    const trackTable = $('#gauntlet-track-body').closest('table');

    function renderTracks() {
      const q = trackSearch.value.toLowerCase();
      let filtered = gauntletTracks.filter(t => t.trackName.toLowerCase().includes(q) || t.environment.toLowerCase().includes(q));
      if (trackSortKey) filtered = [...filtered].sort((a, b) => compareValues(a[trackSortKey], b[trackSortKey], trackSortDir));
      $('#gauntlet-track-count').textContent = `${filtered.length} track${filtered.length === 1 ? '' : 's'}`;
      $('#gauntlet-track-body').innerHTML = filtered.map(t =>
        `<tr><td>${t.trackName}</td><td>${t.environment}</td><td>${t.length}</td><td>${t.difficulty}</td><td>${t.hazards}</td><td>${t.recClasses}</td></tr>`
      ).join('');
      setSortIndicators(trackTable, trackSortKey, trackSortDir);
    }

    initSortHeaders(trackTable, key => {
      trackSortDir = trackSortKey === key ? -trackSortDir : 1;
      trackSortKey = key;
      renderTracks();
    });
    trackSearch.addEventListener('input', renderTracks);
    renderTracks();

    const selClass = $('#gauntlet-class');
    [...new Set(cars.map(c => c.class))].sort().forEach(v => selClass.add(new Option(v, v)));

    function shortTrackScore(c) {
      if (c.accelerationMax == null || c.handlingMax == null || c.nitroMax == null) return null;
      return Math.round(c.accelerationMax * 1.2 + c.handlingMax * 1.2 + c.nitroMax);
    }

    let carSortKey = '', carSortDir = 1;
    const carTable = $('#gauntlet-car-body').closest('table');

    function renderCars() {
      const cls = selClass.value;
      let filtered = cars.filter(c => c.accelerationMax != null && c.handlingMax != null && c.nitroMax != null && (cls === 'All' || c.class === cls));
      filtered = filtered.map(c => Object.assign(c, { _sts: shortTrackScore(c) }));
      if (carSortKey) {
        filtered = [...filtered].sort((a, b) => compareValues(a[carSortKey], b[carSortKey], carSortDir));
      } else {
        filtered.sort((a, b) => (b._sts || 0) - (a._sts || 0) || (b.rankMax || 0) - (a.rankMax || 0));
      }
      $('#gauntlet-car-count').textContent = `${filtered.length} car${filtered.length === 1 ? '' : 's'}`;
      $('#gauntlet-car-body').innerHTML = filtered.map(c =>
        `<tr><td>${c.carName}</td><td>${c.class}</td><td><span class="badge badge-${(c.rarity || '').toLowerCase()}">${c.rarity}</span></td>` +
        `<td class="num">${fix(c.topSpeedMax)}</td><td class="num">${fix(c.accelerationMax)}</td>` +
        `<td class="num">${fix(c.handlingMax)}</td><td class="num">${fix(c.nitroMax)}</td>` +
        `<td class="num">${c._sts}</td><td class="num">${fmt(c.rankMax)}</td></tr>`
      ).join('');
      setSortIndicators(carTable, carSortKey, carSortDir);
    }

    initSortHeaders(carTable, key => {
      carSortDir = carSortKey === key ? -carSortDir : 1;
      carSortKey = key;
      renderCars();
    });
    selClass.addEventListener('change', renderCars);
    renderCars();

    const lineup = $('#gauntlet-lineup');
    const carOptions = cars.filter(c => c.rankMax != null).sort((a, b) => a.carName.localeCompare(b.carName))
      .map(c => `<option value="${c.rankMax}">${esc(c.carName)} (${c.class}, ${fmt(c.rankMax)})</option>`).join('');
    for (let i = 0; i < 5; i++) {
      const div = document.createElement('div');
      div.className = 'filter';
      div.innerHTML = `<label for="gauntlet-slot-${i}">Slot ${i + 1}</label><select id="gauntlet-slot-${i}"><option value="">— Select car —</option>${carOptions}</select>`;
      lineup.appendChild(div);
    }

    function updateSummary() {
      let total = 0;
      for (let i = 0; i < 5; i++) total += Number($(`#gauntlet-slot-${i}`).value) || 0;
      $('#gauntlet-summary').textContent = `Combined max rank: ${total.toLocaleString()}`;
    }
    for (let i = 0; i < 5; i++) $(`#gauntlet-slot-${i}`).addEventListener('change', updateSummary);
    updateSummary();
  }

  function initFarming() {
    const sel = $('#farm-car');
    const info = $('#farm-car-info');
    const results = $('#farm-results');
    const careerBody = $('#farm-career-body');
    const eventsBody = $('#farm-events-body');

    [...cars].sort((a, b) => a.carName.localeCompare(b.carName)).forEach(c => {
      sel.add(new Option(`${c.carName} (${c.class})`, c.carName));
    });

    sel.addEventListener('change', () => {
      const car = cars.find(c => c.carName === sel.value);
      if (!car) {
        info.style.display = 'none';
        results.style.display = 'none';
        return;
      }

      const bpInfo = car.blueprintCount ? ` — <strong>${fmt(car.blueprintCount)} blueprints</strong> total` : '';
      const evoBadge = car.evoEligible ? ' <span class="badge badge-legendary">EVO</span>' : '';
      info.innerHTML = `<strong>${car.carName}</strong> — Class ${car.class}, ${car.rarity || '—'}${bpInfo}${evoBadge}`;
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
    let sortKey = 'costPerRank';
    let sortDir = 1;

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
      let list = cars.filter(usable).map(enrich).filter(c =>
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
    render();
  }

  function initEventRoster() {
    const sel = $('#roster-event');
    const info = $('#roster-event-info');
    const results = $('#roster-results');
    const body = $('#roster-body');
    const table = $('#roster-table');
    let sortKey = 'rankMax';
    let sortDir = -1;

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

      let list = cars.filter(c => qualifies(c, event));
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
    render();
  }

  function initCompare() {
    const sel1 = $('#compare-car-1');
    const sel2 = $('#compare-car-2');
    const options = [...cars].sort((a, b) => a.carName.localeCompare(b.carName))
      .map(c => `<option value="${esc(c.carName)}">${esc(c.carName)} (${c.class})</option>`).join('');
    sel1.innerHTML = '<option value="">— Select car —</option>' + options;
    sel2.innerHTML = '<option value="">— Select car —</option>' + options;

    function render() {
      const c1 = cars.find(c => c.carName === sel1.value);
      const c2 = cars.find(c => c.carName === sel2.value);
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
        row('Max Rank', 'rankMax') +
        row('Top Speed (Max)', 'topSpeedMax') +
        row('Acceleration (Max)', 'accelerationMax') +
        row('Handling (Max)', 'handlingMax') +
        row('Nitro (Max)', 'nitroMax') +
        row('Blueprint Count', 'blueprintCount') +
        row('Total Upgrade Cost', 'totalUpgradeCost', true) +
        `<tr><td>Recommended Tracks</td><td>${c1.recommendedTracks || '—'}</td><td>${c2.recommendedTracks || '—'}</td></tr>` +
        `<tr><td>Notes</td><td>${c1.notes || '—'}</td><td>${c2.notes || '—'}</td></tr>`;

      results.style.display = 'block';
    }

    sel1.addEventListener('change', render);
    sel2.addEventListener('change', render);
  }

  function initGarageForm() {
    const form = $('#garage-form');
    const select = $('#garage-form-car');
    if (!form || !select) return;
    const sorted = [...cars].sort((a, b) => a.carName.localeCompare(b.carName));
    sorted.forEach(c => select.add(new Option(c.carName, c.carName)));
    select.addEventListener('change', () => {
      const car = cars.find(c => c.carName === select.value);
      if (!car) return;
      $('#gf-rank').value = car.rankMax || '';
      $('#gf-stars').value = '';
      $('#gf-topspeed').value = car.topSpeedMax || '';
      $('#gf-accel').value = car.accelerationMax || '';
      $('#gf-handling').value = car.handlingMax || '';
      $('#gf-nitro').value = car.nitroMax || '';
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const carName = select.value;
      const car = cars.find(c => c.carName === carName);
      if (!car) return;
      const id = carName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const existing = getLocalGarage().find(g => g.id === id);
      const entry = existing ? Object.assign(existing, {
        carName, matchedCar: carName, class: car.class,
        rankCurrent: Number($('#gf-rank').value) || null,
        rankMax: Number($('#gf-rank').value) || null,
        stars: Number($('#gf-stars').value) || null,
        topSpeed: Number($('#gf-topspeed').value) || null,
        acceleration: Number($('#gf-accel').value) || null,
        handling: Number($('#gf-handling').value) || null,
        nitro: Number($('#gf-nitro').value) || null,
        capturedAt: new Date().toISOString(),
        imageName: ''
      }) : {
        id, carName, matchedCar: carName, class: car.class,
        rankCurrent: Number($('#gf-rank').value) || null,
        rankMax: Number($('#gf-rank').value) || null,
        stars: Number($('#gf-stars').value) || null,
        topSpeed: Number($('#gf-topspeed').value) || null,
        acceleration: Number($('#gf-accel').value) || null,
        handling: Number($('#gf-handling').value) || null,
        nitro: Number($('#gf-nitro').value) || null,
        blueprintCurrent: null, blueprintMax: null, blueprintStatus: '',
        capturedAt: new Date().toISOString(),
        imageName: ''
      };
      const list = getLocalGarage().filter(g => g.id !== id);
      list.push(entry);
      saveLocalGarage(list);
      form.reset();
      location.reload();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    addManifestLink();
    registerSW();
    initTheme();
    initNav();
    initCollapsible();
    initGlobalSearch();
    initTooltips();
    initMobileCards();
    initEmptyStates();
    if ($('#home-stats')) initHome();
    if ($('#cars-body')) initCars();
    if ($('#tracks-body')) initTracks();
    if ($('#career-race-body')) initCareer();
    if ($('#sp-body')) initSeasonPass();
    if ($('#events-body')) initEvents();
    if ($('#dash-body')) initDashboard();
    if ($('#gauntlet-lineup')) initGauntlet();
    if ($('#evo-body')) initEvo();
    if ($('#farm-car')) initFarming();
    if ($('#roi-table')) initUpgradeRoi();
    if ($('#roster-event')) initEventRoster();
    if ($('#compare-car-1')) initCompare();
    if ($('#cal-list')) initCalendar();
    if ($('#garage-body')) initGarage();
    if ($('#garage-form')) initGarageForm();
    applySearchFromUrl();
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
    const headRow = table.querySelector('thead tr');
    const actionTh = document.createElement('th');
    actionTh.textContent = 'Actions';
    headRow.appendChild(actionTh);
    let sortKey = '', sortDir = 1;

    function render() {
      const data = getCombinedGarage();
      if (sortKey) data.sort((a, b) => compareValues(a[sortKey], b[sortKey], sortDir));
      $('#garage-count').textContent = `${data.length} car${data.length === 1 ? '' : 's'}`;
      if (!data.length) {
        $('#garage-body').innerHTML = '<tr><td colspan="9" class="empty-state">No cars in garage. Use the form below or run the OCR script.</td></tr>';
        setSortIndicators(table, sortKey, sortDir);
        return;
      }
      const localIds = new Set(getLocalGarage().map(g => g.id));
      renderTable('garage-body', data, (c, row) => {
        row.appendChild(makeCell(c.carName));
        row.appendChild(makeCell(c.class));
        row.appendChild(makeCell(c.rankCurrent != null && c.rankMax != null ? `${c.rankCurrent.toLocaleString()} / ${c.rankMax.toLocaleString()}` : '—', 'num'));
        row.appendChild(makeCell(c.stars != null ? c.stars : '—', 'num'));
        row.appendChild(makeCell(c.topSpeed != null ? c.topSpeed : '—', 'num'));
        row.appendChild(makeCell(c.acceleration != null ? c.acceleration : '—', 'num'));
        row.appendChild(makeCell(c.handling != null ? c.handling : '—', 'num'));
        row.appendChild(makeCell(c.nitro != null ? c.nitro : '—', 'num'));
        const actions = makeCell('');
        if (localIds.has(c.id)) {
          const del = document.createElement('button');
          del.className = 'btn';
          del.textContent = 'Remove';
          del.addEventListener('click', () => {
            saveLocalGarage(getLocalGarage().filter(g => g.id !== c.id));
            render();
          });
          actions.appendChild(del);
        }
        row.appendChild(actions);
      });
      setSortIndicators(table, sortKey, sortDir);
    }

    initSortHeaders(table, key => {
      sortDir = sortKey === key ? -sortDir : 1;
      sortKey = key;
      render();
    });
    render();
  }
})();
