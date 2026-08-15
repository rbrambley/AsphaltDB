#!/usr/bin/env python3
"""
Track Asphalt 9 update/patch history from gameupdatenotifier.com and feed newly
discovered season events into js/data.js.

Source: https://gameupdatenotifier.com/g/asphalt-9-legends
  - The "Version History" table lists every tracked build, each with either a
    "Source" link (app-store listing, no content) or a "Patch Notes" link (a
    same-site subpage hosting the full write-up: new cars, special events and
    time-limited events).
  - Patch Notes subpages are parsed for SPECIAL EVENTS / TIME LIMITED EVENTS
    bullets (merged into `calendarEvents`, same shape used by
    scripts/update_calendar.py) and a NEW CARS section (cross-checked against
    the existing `cars` roster; unmatched names are reported, not inserted).

Usage:
    python scripts/update_from_gameupdatenotifier.py --backfill-months 12
    python scripts/update_from_gameupdatenotifier.py                # incremental, all history
    python scripts/update_from_gameupdatenotifier.py --dry-run
"""
import argparse
import html
import json
import re
import time
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path

from data_lib import load_data_js, match_name, save_data_js

ROOT = Path(__file__).resolve().parents[1]
DATA_JS = ROOT / 'js' / 'data.js'
NEW_CARS_REPORT = ROOT / 'scripts' / 'new_cars_report.json'

INDEX_URL = 'https://gameupdatenotifier.com/g/asphalt-9-legends'
BASE_URL = 'https://gameupdatenotifier.com'

MONTH_MAP = {m: i + 1 for i, m in enumerate([
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'])}
ABBR_MONTH_MAP = {
    'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
    'Jul': 7, 'Aug': 8, 'Sep': 9, 'Sept': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12,
}


def clean(s):
    s = re.sub(r'<[^>]+>', ' ', s)
    s = html.unescape(s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s


def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode('utf-8', errors='replace')


def parse_version_date(s):
    """Parse dates like 'July 22, 2026' or 'Feb. 3, 2026' into ISO format."""
    s = clean(s).replace('.', '')
    m = re.match(r'([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})', s)
    if not m:
        return None
    mon, day, year = m.group(1), int(m.group(2)), int(m.group(3))
    month_num = MONTH_MAP.get(mon) or ABBR_MONTH_MAP.get(mon)
    if not month_num:
        return None
    try:
        return datetime(year, month_num, day).strftime('%Y-%m-%d')
    except ValueError:
        return None


def parse_dm_range(date_str, year):
    m = re.search(r'(\d{1,2})/(\d{1,2})\s*[-\u2013]\s*(\d{1,2})/(\d{1,2})', date_str)
    if not m:
        return None, None
    d1, mon1, d2, mon2 = map(int, m.groups())
    y1, y2 = year, year
    if mon2 < mon1:
        y2 = y1 + 1
    try:
        start = datetime(y1, mon1, d1).strftime('%Y-%m-%d')
        end = datetime(y2, mon2, d2).strftime('%Y-%m-%d')
        return start, end
    except ValueError:
        return None, None


def fetch_index():
    """Return the Version History table as a list of update stubs."""
    page = fetch(INDEX_URL)
    rows = re.findall(
        r'<div class="row game-row">\s*'
        r'<div class="col-sm game-row-title">(.*?)</div>\s*'
        r'<div class="col-sm">(.*?)</div>\s*'
        r'<div class="col-sm">\s*'
        r'<a class="link link-primary" href="([^"]+)">(Source|Patch Notes)</a>',
        page, re.S)

    updates = []
    seen = set()
    for title_raw, date_raw, href, link_type in rows:
        title = clean(title_raw)
        version_date = parse_version_date(date_raw)
        if not title or not version_date:
            continue
        key = (title, version_date)
        if key in seen:
            continue
        seen.add(key)
        has_patch_notes = link_type == 'Patch Notes'
        source_url = href if href.startswith('http') else BASE_URL + href
        updates.append({
            'version': title,
            'versionDate': version_date,
            'sourceUrl': source_url,
            'hasPatchNotes': has_patch_notes,
        })
    return updates


def extract_section(body, heading):
    """Grab the <ul>...</ul> immediately following a <h5> section heading."""
    m = re.search(re.escape(heading) + r'.*?<ul>(.*?)</ul>', body, re.I | re.S)
    return m.group(1) if m else ''


def parse_events_section(section_html, ev_type, season, year):
    events = []
    for item in re.findall(r'<li[^>]*>(.*?)</li>', section_html, re.S):
        text = clean(item)
        if ':' not in text:
            continue
        name, _, rest = text.partition(':')
        name = name.strip()
        rest = rest.strip()
        start, end = parse_dm_range(rest, year)
        if not start:
            continue
        desc = re.sub(r'\(\s*\d{1,2}/\d{1,2}\s*[-\u2013]\s*\d{1,2}/\d{1,2}\s*\)', '', rest).strip(' -')
        events.append({
            'eventName': name,
            'type': ev_type,
            'format': '',
            'startDate': start,
            'endDate': end,
            'rawDate': rest,
            'featuredCars': desc,
            'relatedUpdate': season,
            'notes': ''
        })
    return events


def extract_new_cars(body):
    m = re.search(r'<h4>\s*NEW CARS\s*</h4>(.*?)<h4>', body, re.I | re.S)
    if not m:
        return []
    chunk = m.group(1)
    names = []
    for fragment in re.split(r'<br\s*/?>', chunk):
        name = clean(fragment)
        if name and name not in names:
            names.append(name)
    return names


def parse_patch_notes(url, season, version_date):
    page = fetch(url)
    body_m = re.search(r'<h1 class="fs-3 mb-4">Patch Notes</h1>(.*)</body>', page, re.S)
    body = body_m.group(1) if body_m else page
    # Trim the trailing container divs left over after the article content.
    body = re.sub(r'(\s*</div>){1,4}\s*$', '', body)

    year = int(version_date[:4])
    special_html = extract_section(body, 'SPECIAL EVENTS')
    tle_html = extract_section(body, 'TIME LIMITED EVENTS')
    events = (
        parse_events_section(special_html, 'Special Event', season, year) +
        parse_events_section(tle_html, 'Time Limited Event', season, year)
    )
    new_cars = extract_new_cars(body)
    return events, new_cars


def merge_calendar(calendar, events, season):
    if not events:
        return calendar, 0
    calendar = [e for e in calendar if e.get('relatedUpdate', '').lower() != season.lower()]
    added = 0
    for e in events:
        if not any(c['eventName'] == e['eventName'] and c.get('startDate') == e['startDate'] for c in calendar):
            calendar.append(e)
            added += 1
    calendar.sort(key=lambda e: e.get('startDate') or '')
    return calendar, added


def main():
    parser = argparse.ArgumentParser(description='Sync Asphalt 9 update history from gameupdatenotifier.com')
    parser.add_argument('--data', type=Path, default=DATA_JS)
    parser.add_argument('--backfill-months', type=int, default=None,
                         help='Only consider updates from the last N months (use for the initial seed run)')
    parser.add_argument('--limit', type=int, default=None,
                         help='Cap the number of new Patch Notes subpages fetched this run (politeness)')
    parser.add_argument('--delay', type=float, default=0.5, help='Seconds between requests')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()

    all_data = load_data_js(args.data)
    calendar = all_data.get('calendarEvents', [])
    cars = all_data.get('cars', [])
    game_updates = all_data.get('gameUpdates', [])

    known = {(u['version'], u['versionDate']) for u in game_updates}
    car_names = [c['carName'] for c in cars if c.get('carName')]

    cutoff = None
    if args.backfill_months:
        cutoff = (datetime.now() - timedelta(days=30 * args.backfill_months)).strftime('%Y-%m-%d')

    index = fetch_index()
    if cutoff:
        index = [u for u in index if u['versionDate'] >= cutoff]

    new_entries = [u for u in index if (u['version'], u['versionDate']) not in known]
    print(f'Found {len(index)} update(s) in range, {len(new_entries)} new')

    fetched = 0
    total_calendar_added = 0
    unmatched_report = []

    for stub in new_entries:
        entry = dict(stub, calendarSynced=False, newCarsMentioned=[], title=stub['version'], notes='')
        if stub['hasPatchNotes']:
            if args.limit is not None and fetched >= args.limit:
                print(f'Reached --limit {args.limit}, leaving "{stub["version"]}" for a future run')
                game_updates.append(entry)
                continue
            try:
                events, new_cars = parse_patch_notes(stub['sourceUrl'], stub['version'], stub['versionDate'])
            except Exception as exc:  # noqa: BLE001 - scraping is best-effort
                print(f'  ! Failed to parse patch notes for "{stub["version"]}": {exc}')
                events, new_cars = [], []
            fetched += 1
            time.sleep(args.delay)

            calendar, added = merge_calendar(calendar, events, stub['version'])
            total_calendar_added += added
            entry['calendarSynced'] = added > 0 or bool(events)

            unmatched = []
            for name in new_cars:
                match, _ = match_name(name, car_names)
                if not match:
                    unmatched.append(name)
            entry['newCarsMentioned'] = unmatched
            unmatched_report.extend({'car': n, 'update': stub['version'], 'versionDate': stub['versionDate']}
                                     for n in unmatched)

            print(f'  + {stub["version"]} ({stub["versionDate"]}): {added} calendar event(s), '
                  f'{len(unmatched)} unmatched new car(s)')
        else:
            print(f'  + {stub["version"]} ({stub["versionDate"]}): source-only, no patch notes to parse')

        game_updates.append(entry)

    game_updates.sort(key=lambda u: u.get('versionDate') or '', reverse=True)

    print(f'Total: {len(new_entries)} update(s) added, {total_calendar_added} calendar event(s) synced')

    if args.dry_run:
        print('Dry run: no files written')
        return

    all_data['calendarEvents'] = calendar
    all_data['gameUpdates'] = game_updates
    save_data_js(args.data, all_data)
    print(f'Wrote {args.data}')

    if unmatched_report:
        existing = []
        if NEW_CARS_REPORT.exists():
            existing = json.loads(NEW_CARS_REPORT.read_text(encoding='utf-8'))
        seen = {(r['car'], r['update']) for r in existing}
        for r in unmatched_report:
            if (r['car'], r['update']) not in seen:
                existing.append(r)
        NEW_CARS_REPORT.write_text(json.dumps(existing, indent=2), encoding='utf-8')
        print(f'Wrote {NEW_CARS_REPORT} ({len(unmatched_report)} new entr{"y" if len(unmatched_report)==1 else "ies"})')


if __name__ == '__main__':
    main()
