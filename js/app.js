
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
    if (toggle) toggle.addEventListener('click', () => $('nav').classList.toggle('open'));
    $$('nav a').forEach(a => {
      const page = location.pathname.split('/').pop() || 'index.html';
      const target = a.getAttribute('href');
      if (target === page || (page === '' && target === 'index.html')) a.classList.add('active');
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

  // ---------- Home ----------
  function initHome() {
    const byClass = {};
    cars.forEach(c => { byClass[c.class] = (byClass[c.class] || 0) + 1; });
    $('#stat-cars').textContent = cars.length;
    $('#stat-tracks').textContent = tracks.length;
    $('#stat-seasons').textContent = careerSeasons.length;
    $('#stat-events').textContent = events.length;
    $('#stat-classes').textContent = Object.keys(byClass).sort().join(' / ');
  }

  // ---------- Cars ----------
  function initCars() {
    const search = $('#cars-search');
    const selClass = $('#cars-class');
    const selMfr = $('#cars-manufacturer');
    const selRarity = $('#cars-rarity');
    const selEvo = $('#cars-evo');

    const classes = [...new Set(cars.map(c => c.class))].sort();
    const mfrs = [...new Set(cars.map(c => c.manufacturer))].sort();
    const rarities = [...new Set(cars.map(c => c.rarity))].sort();
    classes.forEach(v => selClass.add(new Option(v, v)));
    mfrs.forEach(v => selMfr.add(new Option(v, v)));
    rarities.forEach(v => selRarity.add(new Option(v, v)));

    let sortKey = '', sortDir = 1;
    const table = $('#cars-body').closest('table');

    function render() {
      const q = search.value.toLowerCase();
      const cls = selClass.value;
      const mfr = selMfr.value;
      const rarity = selRarity.value;
      const evo = selEvo.value;
      let filtered = cars.filter(c => {
        const evoOk = evo === 'All' || (evo === 'yes' && c.evoEligible) || (evo === 'no' && !c.evoEligible);
        return (!q || c.carName.toLowerCase().includes(q) || c.manufacturer.toLowerCase().includes(q)) &&
               (cls === 'All' || c.class === cls) &&
               (mfr === 'All' || c.manufacturer === mfr) &&
               (rarity === 'All' || c.rarity === rarity) &&
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
        row.appendChild(makeCell(c.recommendedTracks, 'wrap'));
        row.appendChild(makeCell(c.notes, 'wrap'));
      });
      setSortIndicators(table, sortKey, sortDir);
    }

    initSortHeaders(table, key => {
      sortDir = sortKey === key ? -sortDir : 1;
      sortKey = key;
      render();
    });
    [search, selClass, selMfr, selRarity, selEvo].forEach(el => el.addEventListener('input', render));
    render();
  }

  // ---------- Tracks ----------
  function initTracks() {
    const search = $('#tracks-search');
    const selEnv = $('#tracks-env');
    const envs = [...new Set(tracks.map(t => t.environment))].sort();
    envs.forEach(v => selEnv.add(new Option(v, v)));

    let sortKey = '', sortDir = 1;
    const table = $('#tracks-body').closest('table');

    function render() {
      const q = search.value.toLowerCase();
      const env = selEnv.value;
      let filtered = tracks.filter(t => {
        return (!q || t.trackName.toLowerCase().includes(q) || t.environment.toLowerCase().includes(q)) &&
               (env === 'All' || t.environment === env);
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
    render();
  }

  // ---------- Career ----------
  function initCareer() {
    const search = $('#career-search');
    const selChapter = $('#career-chapter');
    const chapters = [...new Set(careerSeasons.map(s => s.chapter))].sort();
    chapters.forEach(v => selChapter.add(new Option(v, v)));

    let sortKey = '', sortDir = 1;
    const table = $('#career-body').closest('table');

    function render() {
      const q = search.value.toLowerCase();
      const ch = selChapter.value;
      let filtered = careerSeasons.filter(s => {
        return (!q || s.chapter.toLowerCase().includes(q) || s.stage.toLowerCase().includes(q)) &&
               (ch === 'All' || s.chapter === ch);
      });
      if (sortKey) filtered = [...filtered].sort((a, b) => compareValues(a[sortKey], b[sortKey], sortDir));
      $('#career-count').textContent = `${filtered.length} season${filtered.length === 1 ? '' : 's'}`;
      const tbody = $('#career-body');
      tbody.innerHTML = '';
      filtered.forEach(s => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${s.chapter}</td><td>${s.stage}</td><td class="num">${s.races}</td><td class="num">${s.flags}</td><td><button class="btn expand-btn" data-season="${encodeURIComponent(s.stage)}">Show races</button></td>`;
        tbody.appendChild(row);
        const detailRow = document.createElement('tr');
        detailRow.className = 'expand-row';
        detailRow.style.display = 'none';
        detailRow.innerHTML = `<td colspan="5"><div class="table-wrap"><table class="detail-table"><thead><tr><th>Race</th><th>Rank</th><th>Mode</th><th>Track</th><th>Blueprint</th><th>Credits</th><th>Rep</th></tr></thead><tbody class="detail-body"></tbody></table></div></td>`;
        tbody.appendChild(detailRow);

        const btn = row.querySelector('.expand-btn');
        btn.addEventListener('click', () => {
          const shown = detailRow.style.display !== 'none';
          if (!shown) {
            const races = careerRaces.filter(r => r.chapter === s.chapter && r.season === s.stage);
            const body = detailRow.querySelector('.detail-body');
            body.innerHTML = races.map(r => `<tr><td>${r.race}</td><td>${r.rank}</td><td>${r.mode}</td><td>${r.track}</td><td>${r.blueprint}</td><td>${r.credits}</td><td>${r.rep}</td></tr>`).join('');
            btn.textContent = `Hide races (${races.length})`;
            detailRow.style.display = 'table-row';
          } else {
            detailRow.style.display = 'none';
            btn.textContent = 'Show races';
          }
        });
      });
    }

    initSortHeaders(table, key => {
      sortDir = sortKey === key ? -sortDir : 1;
      sortKey = key;
      render();
    });
    search.addEventListener('input', render);
    selChapter.addEventListener('change', render);
    render();
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
        html += `<td>Career</td><td>${i.season}</td><td>${i.chapter}</td><td>${i.track}</td><td class="num">${i.race}</td><td class="num">${i.rank}</td><td>${i.mode}</td><td>${reward || '—'}</td></tr>`;
      } else if (i.type === 'event') {
        html += `<tr data-type="${esc('event')}" data-name="${esc(i.eventName)}" data-chapter="" data-track="${esc(i.track)}" data-race="" data-rank="" data-mode="" data-reward="${esc(i.reward)}">`;
        html += `<td>Event</td><td>${i.eventName}</td><td>—</td><td>${i.track}</td><td>—</td><td>—</td><td>—</td><td>${i.reward}</td></tr>`;
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

    const selClass = $('#dash-class');
    const selMfr = $('#dash-manufacturer');
    const selTrack = $('#dash-track');
    const selEvent = $('#dash-event');

    [...new Set(cars.map(c => c.class))].sort().forEach(v => selClass.add(new Option(v, v)));
    [...new Set(cars.map(c => c.manufacturer))].sort().forEach(v => selMfr.add(new Option(v, v)));
    [...new Set(tracks.map(t => t.trackName))].sort().forEach(v => selTrack.add(new Option(v, v)));
    [...new Set(events.map(e => e.eventName))].sort().forEach(v => selEvent.add(new Option(v, v)));

    let sortKey = '', sortDir = 1;
    const dashTable = $('#dash-body').closest('table');

    function render() {
      const classFilter = selClass.value;
      const mfrFilter = selMfr.value;
      const trackFilter = selTrack.value;
      const eventFilter = selEvent.value;
      const active = classFilter !== 'All' || mfrFilter !== 'All' || trackFilter !== 'All' || eventFilter !== 'All';

      const filteredCars = filterCars(classFilter, mfrFilter);
      const filteredCareer = filterCareer(filteredCars, trackFilter);
      const filteredEvents = filterEvents(trackFilter, eventFilter);
      const results = active ? combineResults(filteredCars, filteredCareer, filteredEvents) : [];

      const tbody = $('#dash-body');
      tbody.innerHTML = '';
      if (!active) {
        $('#dash-count').textContent = 'Select at least one filter to see results.';
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Use the filters above to combine cars, tracks, career seasons and events.</td></tr>';
        return;
      }

      // Group results by car name
      const groups = {};
      results.forEach(r => {
        if (!groups[r.carName]) {
          groups[r.carName] = { carName: r.carName, class: r.class, items: [], car: r._car };
        }
        groups[r.carName].items.push(r);
      });
      let groupArray = Object.values(groups);
      if (sortKey === 'items') {
        groupArray = groupArray.sort((a, b) => compareValues(a.items.length, b.items.length, sortDir));
      } else if (sortKey) {
        groupArray = groupArray.sort((a, b) => compareValues(a[sortKey], b[sortKey], sortDir));
      }
      $('#dash-count').textContent = `${groupArray.length} car${groupArray.length === 1 ? '' : 's'} • ${results.length} linked event${results.length === 1 ? '' : 's'}`;

      groupArray.forEach(g => {
        const car = g.car;
        const row = document.createElement('tr');
        if (car && car.rarity === 'Legendary') row.classList.add('legendary');
        if (car && car.rankMax > 3500) row.classList.add('high-rank');
        if (g.items.some(i => i._event && /exclusive|special|grand prix|car hunt/i.test(i._event.eventName))) row.classList.add('rare-event');
        row.innerHTML = `<td>${g.carName}</td><td>${g.class}</td><td class="num">${g.items.length}</td><td><button class="btn expand-btn">Show ${g.items.length} link${g.items.length === 1 ? '' : 's'}</button></td>`;
        tbody.appendChild(row);

        const detailRow = document.createElement('tr');
        detailRow.className = 'expand-row';
        detailRow.style.display = 'none';
        detailRow.innerHTML = `<td colspan="4"><div class="dash-detail"></div></td>`;
        tbody.appendChild(detailRow);

        const detail = detailRow.querySelector('.dash-detail');
        detail.innerHTML = buildDetailHtml(g.items);
        attachDetailInteractions(detail);

        const btn = row.querySelector('.expand-btn');
        btn.addEventListener('click', () => {
          const shown = detailRow.style.display !== 'none';
          detailRow.style.display = shown ? 'none' : 'table-row';
          btn.textContent = shown ? `Show ${g.items.length} link${g.items.length === 1 ? '' : 's'}` : 'Hide links';
        });
      });
      setSortIndicators(dashTable, sortKey, sortDir);
    }

    initSortHeaders(dashTable, key => {
      sortDir = sortKey === key ? -sortDir : 1;
      sortKey = key;
      render();
    });
    [selClass, selMfr, selTrack, selEvent].forEach(el => el.addEventListener('change', render));
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

  function initMatchmaker() {
    const sel = $('#match-track');
    const info = $('#track-info');
    const resultsCard = $('#results-card');
    const results = $('#match-results');

    [...tracks].sort((a, b) => a.trackName.localeCompare(b.trackName)).forEach(t => {
      sel.add(new Option(`${t.trackName} (${t.environment})`, t.trackName));
    });

    function weights(t) {
      let top = 0.6, acc = 1.0, hand = 1.0, nitro = 0.8;
      const len = (t.length || '').toLowerCase();
      if (len.includes('short')) { top = 0.2; acc = 1.2; hand = 1.2; nitro = 1.0; }
      else if (len.includes('medium')) { top = 0.8; acc = 1.0; hand = 1.0; nitro = 0.8; }
      else if (len.includes('extra')) { top = 1.8; acc = 0.4; hand = 0.4; nitro = 0.4; }
      else if (len.includes('long')) { top = 1.5; acc = 0.6; hand = 0.6; nitro = 0.6; }

      const haz = (t.hazards || '').toLowerCase();
      const diff = (t.difficulty || '').toLowerCase();
      if (haz.includes('nitro')) nitro += 0.5;
      if (haz.includes('technical') || diff.includes('hard')) hand += 0.3;
      if (haz.includes('drift')) hand += 0.2;
      return { top, acc, hand, nitro };
    }

    function score(c, w) {
      if (c.topSpeedMax == null || c.accelerationMax == null || c.handlingMax == null || c.nitroMax == null) return null;
      return Math.round(c.topSpeedMax * w.top + c.accelerationMax * w.acc + c.handlingMax * w.hand + c.nitroMax * w.nitro);
    }

    sel.addEventListener('change', () => {
      const track = tracks.find(t => t.trackName === sel.value);
      if (!track) {
        info.style.display = 'none';
        resultsCard.style.display = 'none';
        return;
      }
      const w = weights(track);
      info.innerHTML = `<strong>${track.trackName}</strong> — ${track.environment}, ${track.length || '—'}, ${track.difficulty || '—'} difficulty.<br>` +
        `Hazards: ${track.hazards || '—'}<br>Recommended classes: ${track.recClasses || '—'}<br>` +
        `Score weights — Top Speed: ${w.top.toFixed(1)}, Acceleration: ${w.acc.toFixed(1)}, Handling: ${w.hand.toFixed(1)}, Nitro: ${w.nitro.toFixed(1)}`;
      info.style.display = 'block';

      const classes = ['D', 'C', 'B', 'A', 'S'];
      let html = '';
      classes.forEach(cls => {
        const list = cars.filter(c => c.class === cls && score(c, w) != null)
          .sort((a, b) => score(b, w) - score(a, w))
          .slice(0, 5);
        html += `<h4>Class ${cls}</h4>`;
        if (!list.length) {
          html += `<p class="empty-state">No complete stat data for Class ${cls}.</p>`;
        } else {
          html += `<div class="table-wrap"><table><thead><tr><th>Rank</th><th>Car</th><th>Rarity</th><th>Top Speed</th><th>Accel</th><th>Handling</th><th>Nitro</th><th>Score</th></tr></thead><tbody>`;
          list.forEach(c => {
            html += `<tr><td class="num">${fmt(c.rankMax)}</td><td>${c.carName}</td>` +
              `<td><span class="badge badge-${(c.rarity || '').toLowerCase()}">${c.rarity}</span></td>` +
              `<td class="num">${fix(c.topSpeedMax)}</td><td class="num">${fix(c.accelerationMax)}</td>` +
              `<td class="num">${fix(c.handlingMax)}</td><td class="num">${fix(c.nitroMax)}</td>` +
              `<td class="num">${score(c, w)}</td></tr>`;
          });
          html += `</tbody></table></div>`;
        }
      });
      results.innerHTML = html;
      resultsCard.style.display = 'block';
    });
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

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNav();
    initCollapsible();
    if ($('#home-stats')) initHome();
    if ($('#cars-body')) initCars();
    if ($('#tracks-body')) initTracks();
    if ($('#career-body')) initCareer();
    if ($('#events-body')) initEvents();
    if ($('#dash-body')) initDashboard();
    if ($('#gauntlet-lineup')) initGauntlet();
    if ($('#evo-body')) initEvo();
    if ($('#match-track')) initMatchmaker();
    if ($('#farm-car')) initFarming();
    if ($('#roi-table')) initUpgradeRoi();
    if ($('#roster-event')) initEventRoster();
    if ($('#compare-car-1')) initCompare();
  });
})();
