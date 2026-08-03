#!/usr/bin/env python3
"""
Update js/data.js calendarEvents by scraping an asphaltlegends.com season events page
and/or the Fandom Spotlight page.

Usage:
    python scripts/update_calendar.py --season-url https://asphaltlegends.com/news/touge-masters
    python scripts/update_calendar.py --spotlight
    python scripts/update_calendar.py --season-url URL --spotlight
"""
import argparse
import html
import json
import re
import urllib.request
from datetime import datetime
from pathlib import Path

DATA_JS = Path(__file__).resolve().parents[1] / 'js' / 'data.js'
MONTH_MAP = {m: i + 1 for i, m in enumerate([
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'])}


def clean(s):
    s = re.sub(r'<[^>]+>', ' ', s)
    s = html.unescape(s)
    s = re.sub(r"'''", '', s)
    s = re.sub(r'\[\[[^\]|]+\|([^\]]+)\]\]', r'\1', s)
    s = re.sub(r'\[\[([^\]]+)\]\]', r'\1', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s


def parse_dm_range(date_str, year):
    m = re.match(r'(\d{1,2})/(\d{1,2})\s*[–-]\s*(\d{1,2})/(\d{1,2})', date_str)
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
    except Exception:
        return None, None


def parse_fandom_date_range(date_str):
    s = clean(date_str)
    if not s:
        return None, None
    m = re.match(r'([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})', s)
    if m:
        mon, d, y = m.group(1), int(m.group(2)), int(m.group(3))
        try:
            dt = datetime(y, MONTH_MAP[mon], d)
            return dt.strftime('%Y-%m-%d'), dt.strftime('%Y-%m-%d')
        except Exception:
            return None, None
    m = re.match(r'([A-Za-z]+)\s+(\d{1,2})\s*[–-]\s*(\d{1,2}),\s*(\d{4})', s)
    if m:
        mon, d1, d2, y = m.group(1), int(m.group(2)), int(m.group(3)), int(m.group(4))
        try:
            start = datetime(y, MONTH_MAP[mon], d1).strftime('%Y-%m-%d')
            end = datetime(y, MONTH_MAP[mon], d2).strftime('%Y-%m-%d')
            return start, end
        except Exception:
            return None, None
    m = re.match(r'([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})?\s*[–-]\s*([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})', s)
    if m:
        sm, sd, sy, em, ed, ey = m.group(1), int(m.group(2)), m.group(3), m.group(4), int(m.group(5)), int(m.group(6))
        sy = int(sy) if sy else ey
        try:
            start = datetime(sy, MONTH_MAP[sm], sd).strftime('%Y-%m-%d')
            end = datetime(ey, MONTH_MAP[em], ed).strftime('%Y-%m-%d')
            return start, end
        except Exception:
            return None, None
    return None, None


def extract_name(s):
    s = re.sub(r'[*]+', '', s)
    s = re.sub(r'[:\s]+$', '', s)
    return s.strip()


def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode('utf-8')


def parse_season_page(url):
    page = fetch(url)
    # Year from article date
    date_m = re.search(r'(\w+)\s+(\d{1,2}),\s+(\d{4})', page)
    year = int(date_m.group(3)) if date_m else datetime.now().year

    # Season title from first h1
    h1_m = re.search(r'<h1[^>]*>(.*?)</h1>', page, re.S)
    season = 'Season Event'
    if h1_m:
        season = clean(h1_m.group(1)).split(' - ')[0].split(' | ')[0]
        season = re.sub(r'\s+SEASON\s*$', '', season, flags=re.I).strip()
        season = season.title() or 'Season Event'

    events = []

    def parse_list_items(section_html, ev_type):
        items = re.findall(r'<li[^>]*>(.*?)</li>', section_html, re.S)
        for item in items:
            m = re.search(r'<strong[^>]*>(.*?)</strong>\s*\(([^)]+)\)\s*(.*)', item, re.S)
            if not m:
                continue
            name = extract_name(clean(m.group(1)))
            date_str = clean(m.group(2))
            desc = clean(m.group(3)).strip('—').strip()
            start, end = parse_dm_range(date_str, year)
            if start:
                events.append({
                    'eventName': name,
                    'type': ev_type,
                    'format': '',
                    'startDate': start,
                    'endDate': end,
                    'rawDate': date_str,
                    'featuredCars': desc,
                    'relatedUpdate': season,
                    'notes': ''
                })

    special = re.search(r'SPECIAL EVENTS(.*?)(?:TIME LIMITED EVENTS|SHARE IT|RELATED POSTS|$)', page, re.S)
    if special:
        parse_list_items(special.group(1), 'Special Event')

    tl = re.search(r'TIME LIMITED EVENTS(.*?)(?:SHARE IT|RELATED POSTS|$)', page, re.S)
    if tl:
        parse_list_items(tl.group(1), 'Time Limited Event')
        hunt_m = re.search(r'hunting the (.*?)</li>', tl.group(1), re.S)
        if hunt_m:
            hunt_text = clean(hunt_m.group(1))
            date_re = re.compile(r'(\d{1,2}/\d{1,2}\s*[–-]\s*\d{1,2}/\d{1,2})')
            matches = list(date_re.finditer(hunt_text))
            prev_end = 0
            for m in matches:
                name = hunt_text[prev_end:m.start()]
                name = re.sub(r'(?i)^\s*(,\s*|and\s+|the\s+|for\s+)*', '', name)
                name = re.sub(r'\s*\([^)]*\)\s*$', '', name).strip()
                name = re.sub(r'[*]+', '', name)
                if not name:
                    prev_end = m.end()
                    continue
                if 'Car Hunt' not in name:
                    name = name + ' Car Hunt'
                date_str = m.group(1)
                start, end = parse_dm_range(date_str, year)
                if start:
                    events.append({
                        'eventName': name,
                        'type': 'Car Hunt',
                        'format': '',
                        'startDate': start,
                        'endDate': end,
                        'rawDate': date_str,
                        'featuredCars': '',
                        'relatedUpdate': season,
                        'notes': ''
                    })
                prev_end = m.end()

    return season, events


def parse_spotlight():
    url = 'https://asphalt.fandom.com/api.php?action=parse&page=Spotlight&prop=wikitext&format=json'
    data = json.loads(fetch(url))
    wikitext = data['parse']['wikitext']['*']
    events = []
    for table_match in re.finditer(r'\{\|class="wikitable"(.*?)\|\}', wikitext, re.S):
        table = table_match.group(1)
        rows = re.split(r'\n\|-\n', table)
        for r in rows[1:]:
            cells = re.findall(r'^[\|!](.*?)$', r, re.M)
            cells = [c for c in cells if not c.strip().startswith('!')]
            if len(cells) < 4:
                continue
            cleaned = [clean(c) for c in cells]
            name = cleaned[0]
            featured = cleaned[1]
            fmt = cleaned[2]
            date_str = cleaned[3]
            update = cleaned[4] if len(cleaned) > 4 else ''
            notes = cleaned[5] if len(cleaned) > 5 else ''
            start, end = parse_fandom_date_range(date_str)
            if start:
                events.append({
                    'eventName': name,
                    'type': 'Spotlight',
                    'format': fmt,
                    'startDate': start,
                    'endDate': end,
                    'rawDate': date_str,
                    'featuredCars': featured,
                    'relatedUpdate': update,
                    'notes': notes
                })
    return events


def load_calendar():
    text = DATA_JS.read_text(encoding='utf-8')
    match = re.search(r'const calendarEvents = (\[.*?\]);', text, re.S)
    if not match:
        raise RuntimeError('calendarEvents not found in data.js')
    return text, json.loads(match.group(1))


def save_calendar(text, events):
    text = re.sub(r'const calendarEvents = \[.*?\];',
                  lambda m: 'const calendarEvents = ' + json.dumps(events, indent=2) + ';',
                  text, flags=re.S)
    DATA_JS.write_text(text, encoding='utf-8')


def main():
    parser = argparse.ArgumentParser(description='Update AsphaltDB calendar events.')
    parser.add_argument('--season-url', help='asphaltlegends.com season news URL')
    parser.add_argument('--spotlight', action='store_true', help='Refresh Fandom Spotlight events')
    args = parser.parse_args()

    if not args.season_url and not args.spotlight:
        parser.error('Specify --season-url and/or --spotlight')

    text, calendar = load_calendar()
    initial = len(calendar)

    if args.season_url:
        season, new_events = parse_season_page(args.season_url)
        print(f'Parsed {len(new_events)} events from {season}')
        # Remove previous events from the same season to avoid stale data
        calendar = [e for e in calendar if e.get('relatedUpdate', '').lower() != season.lower()]
        for e in new_events:
            if not any(c['eventName'] == e['eventName'] and c.get('startDate') == e['startDate'] for c in calendar):
                calendar.append(e)

    if args.spotlight:
        new_events = parse_spotlight()
        print(f'Parsed {len(new_events)} Spotlight events')
        # Remove old Spotlight entries so refreshed data replaces them
        calendar = [e for e in calendar if e.get('type') != 'Spotlight']
        calendar.extend(new_events)

    calendar.sort(key=lambda e: e.get('startDate') or '')
    save_calendar(text, calendar)
    print(f'Calendar updated: {initial} -> {len(calendar)} events')


if __name__ == '__main__':
    main()
