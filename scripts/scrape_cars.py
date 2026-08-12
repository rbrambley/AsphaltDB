#!/usr/bin/env python3
"""Scrape/refresh car data from asphalt9.info into js/data.js."""

import argparse
import json
import re
import sys
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

from data_lib import load_data_js, match_name, save_data_js, slugify, token_sort

ROOT = Path(__file__).resolve().parents[1]
DATA_JS = ROOT / 'js' / 'data.js'
CACHE_DIR = ROOT / 'scripts' / '.cache'
SLUGS_PATH = ROOT / 'scripts' / 'car_slugs.json'
MATCH_REVIEW_PATH = ROOT / 'scripts' / 'car_match_review.json'
REPORT_PATH = ROOT / 'scripts' / 'scrape_cars_report.json'
BASE_URL = 'https://asphalt9.info'
CLASSES = ('d', 'c', 'b', 'a', 's')


def fetch(url: str, cache: Path | None = None, delay: float = 0.0) -> str:
    if cache and cache.exists():
        return cache.read_text(encoding='utf-8')
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    resp = requests.get(url, headers=headers, timeout=30)
    resp.raise_for_status()
    if delay:
        time.sleep(delay)
    if cache:
        cache.write_text(resp.text, encoding='utf-8')
    return resp.text


def discover_slugs(cache_dir: Path, delay: float = 0.5) -> dict:
    """Return a mapping {car_name: {class, slug, href}} from class list pages."""
    slugs = {}
    for cls in CLASSES:
        url = f'{BASE_URL}/asphalt9/cars/class-{cls}/'
        cache = cache_dir / f'class-{cls}.html'
        html = fetch(url, cache, delay=delay)
        soup = BeautifulSoup(html, 'html.parser')
        for a in soup.find_all('a', href=True):
            href = a['href'].rstrip('/')
            if not href.startswith(f'{BASE_URL}/asphalt9/cars/class-{cls}/'):
                continue
            slug = href.split('/')[-1]
            if slug == f'class-{cls}':
                continue
            name = a.get_text(strip=True)
            if not name:
                continue
            slugs[name] = {'class': cls, 'slug': slug, 'href': href}
    return slugs


def load_or_discover_slugs(cache_dir: Path, force: bool = False, delay: float = 0.5) -> dict:
    if not force and SLUGS_PATH.exists():
        return json.loads(SLUGS_PATH.read_text(encoding='utf-8'))
    slugs = discover_slugs(cache_dir, delay)
    SLUGS_PATH.write_text(json.dumps(slugs, indent=2, ensure_ascii=False), encoding='utf-8')
    return slugs


def rows(table) -> list[list[str]]:
    return [[cell.get_text(' ', strip=True) for cell in tr.find_all(['td', 'th'])] for tr in table.find_all('tr')]


def parse_number(s: str):
    """Parse a European-formatted number like '1.150' or '42,2' into a float/int."""
    s = s.strip().replace(' ', '')
    # asphalt9.info uses '.' as thousands separator and ',' as decimal separator.
    if ',' in s:
        s = s.replace('.', '')  # remove thousands dots
        s = s.replace(',', '.')  # comma becomes decimal dot
    else:
        s = s.replace('.', '')  # dot was thousands separator
    s = re.sub(r'[^\d.\-]', '', s)
    if not s:
        return None
    try:
        v = float(s)
        return int(v) if v == int(v) else v
    except ValueError:
        return None


def classify_table(rows_data: list[list[str]]) -> str | None:
    flat = ' '.join(c for r in rows_data for c in r).lower()
    if 'fuel' in flat and 'refill time' in flat:
        return 'info'
    if 'total blueprints' in flat:
        return 'blueprints'
    if 'import parts' in flat and 'common' in flat:
        return 'import_parts'
    if 'stage' in flat and ('credits' in flat or 'credits x 4' in flat):
        return 'upgrades'
    if 'top speed' in flat and 'acceleration' in flat and 'handling' in flat and 'nitro' in flat:
        return 'performance'
    if 'stock' in flat and any('rank' in c.lower() for c in flat.split()):
        # ranks table: cells are mostly integers
        return 'ranks'
    if 'stock' in flat and all(r and r[0].isdigit() for r in rows_data[-1:] if r):
        # simple integer table without rank header
        return 'ranks'
    return None


def parse_info_table(rows_data: list[list[str]]) -> dict:
    data = {}
    if not rows_data:
        return data
    header = [normalize_header(c) for c in rows_data[0]]
    for r in rows_data[1:]:
        for i, cell in enumerate(r):
            if i >= len(header):
                continue
            key = header[i]
            if key == 'type':
                data['rarity'] = cell
            elif key == 'fuel':
                data['fuelTank'] = parse_number(cell)
            elif key == 'refill time':
                data['refillTime'] = cell
            elif key == 'in game':
                data['inGame'] = cell
    return data


def normalize_header(s: str) -> str:
    s = re.sub(r'[^\w\s]', ' ', s).lower().strip()
    s = re.sub(r'\s+', ' ', s)
    return s


def is_star_or_stock(cell: str) -> bool:
    return 'stock' in cell.lower() or '⭐' in cell or bool(re.match(r'\d+\s*⭐?', cell.strip()))


def parse_performance_table(rows_data: list[list[str]]) -> dict:
    """Extract stock and max performance stats."""
    data = {}
    # find the row that defines the columns (contains 'Top Speed')
    header = None
    header_index = None
    for i, r in enumerate(rows_data):
        lowered = [c.lower() for c in r]
        if 'top speed' in lowered and 'acceleration' in lowered:
            header = lowered
            header_index = i
            break
    if not header:
        return data

    stock = {}
    max_stats = {}
    for r in rows_data[header_index + 1:]:
        if not r or not is_star_or_stock(r[0]):
            continue
        label = r[0].lower()
        values = {}
        for j, cell in enumerate(r):
            if j >= len(header):
                continue
            col = header[j]
            if 'top speed' in col:
                values['topSpeed'] = parse_number(cell)
            elif 'acceleration' in col:
                values['acceleration'] = parse_number(cell)
            elif 'handling' in col:
                values['handling'] = parse_number(cell)
            elif 'nitro' in col:
                values['nitro'] = parse_number(cell)
        if 'stock' in label:
            stock = values
        else:
            # highest star wins
            max_stats = values
    if stock:
        data['topSpeedStock'] = stock.get('topSpeed')
        data['accelerationStock'] = stock.get('acceleration')
        data['handlingStock'] = stock.get('handling')
        data['nitroStock'] = stock.get('nitro')
    if max_stats:
        data['topSpeedMax'] = max_stats.get('topSpeed')
        data['accelerationMax'] = max_stats.get('acceleration')
        data['handlingMax'] = max_stats.get('handling')
        data['nitroMax'] = max_stats.get('nitro')
    return data


def parse_ranks_table(rows_data: list[list[str]]) -> dict:
    data = {}
    if not rows_data:
        return data
    # Header has 'Stock', '1⭐', '2⭐', ... and a single data row with values
    for r in rows_data:
        if not r:
            continue
        if 'stock' in r[0].lower():
            # This is the header row; the next non-empty row should contain the values
            continue
        values = [parse_number(c) for c in r if c.strip()]
        if values and all(v is not None for v in values):
            data['rankStock'] = values[0]
            data['rankMax'] = values[-1]
    return data


def parse_blueprints_table(rows_data: list[list[str]]) -> dict:
    for r in rows_data:
        if 'total blueprints' in ' '.join(c.lower() for c in r):
            continue
        # The data row is the one with numbers after the header
        if r and all(parse_number(c) is not None for c in r):
            return {'blueprintCount': parse_number(r[-1])}
    return {}


def parse_upgrades_table(rows_data: list[list[str]]) -> dict:
    total = 0
    for r in rows_data:
        if not r:
            continue
        first = r[0].lower().strip()
        if first.startswith('stage') and first != 'stage':
            # Try the last column (Total) for this stage
            for cell in reversed(r):
                val = parse_number(cell)
                if val is not None:
                    total += val
                    break
        elif 'max' in first:
            # final cumulative row if present
            for cell in reversed(r):
                val = parse_number(cell)
                if val is not None:
                    total = val
                    break
    return {'upgradeCredits': int(total) if total == int(total) else total}


def parse_import_parts_table(rows_data: list[list[str]]) -> dict:
    data = {}
    keys = {
        'common': ('commonParts', 'commonPartsCost'),
        'rare': ('rareParts', 'rarePartsCost'),
        'epic': ('epicParts', 'epicPartsCost'),
    }
    for r in rows_data:
        if not r:
            continue
        label = r[0].lower()
        if label in keys:
            amount = parse_number(r[1]) if len(r) > 1 else None
            cost = parse_number(r[-1]) if len(r) > 2 else None
            parts_key, cost_key = keys[label]
            data[parts_key] = amount
            data[cost_key] = cost
        elif 'total cost' in ' '.join(c.lower() for c in r):
            # usually a two-cell row like ['Total Cost:', '606.200']
            for cell in r:
                val = parse_number(cell)
                if val is not None:
                    data['totalUpgradeCost'] = val
                    break
    return data


def parse_car_page(html: str) -> dict:
    soup = BeautifulSoup(html, 'html.parser')
    h1 = soup.find('h1')
    title = h1.get_text(strip=True) if h1 else ''
    tables = soup.find_all('table')
    result = {'pageTitle': title}

    for table in tables:
        r = rows(table)
        kind = classify_table(r)
        if kind == 'info':
            result.update(parse_info_table(r))
        elif kind == 'performance':
            result.update(parse_performance_table(r))
        elif kind == 'ranks':
            result.update(parse_ranks_table(r))
        elif kind == 'blueprints':
            result.update(parse_blueprints_table(r))
        elif kind == 'upgrades':
            result.update(parse_upgrades_table(r))
        elif kind == 'import_parts':
            result.update(parse_import_parts_table(r))

    # Always compute total upgrade cost from the parsed pieces if we have enough.
    if result.get('upgradeCredits') is not None:
        parts_cost = (result.get('commonPartsCost') or 0) + (result.get('rarePartsCost') or 0) + (result.get('epicPartsCost') or 0)
        result['totalUpgradeCost'] = result['upgradeCredits'] + parts_cost

    return result


def merge_car(target: dict, new_data: dict, force: bool = False) -> bool:
    """Fill or overwrite null/empty fields; return True if any change made."""
    changed = False
    for key, value in new_data.items():
        if value is None or value == '':
            continue
        if not force:
            if key not in target or target[key] in (None, ''):
                target[key] = value
                changed = True
        else:
            if target.get(key) != value:
                target[key] = value
                changed = True
    return changed


def main():
    parser = argparse.ArgumentParser(description='Scrape/update car data from asphalt9.info')
    parser.add_argument('--data', type=Path, default=DATA_JS)
    parser.add_argument('--class', dest='class_filter', choices=list('DCBAS'))
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--force', action='store_true', help='Overwrite existing values')
    parser.add_argument('--discover-only', action='store_true')
    parser.add_argument('--refresh-slugs', action='store_true')
    parser.add_argument('--cache-dir', type=Path, default=CACHE_DIR)
    parser.add_argument('--delay', type=float, default=0.5, help='Seconds between requests')
    args = parser.parse_args()

    args.cache_dir.mkdir(parents=True, exist_ok=True)
    slugs = load_or_discover_slugs(args.cache_dir, force=args.refresh_slugs, delay=args.delay)

    if args.discover_only:
        print(f'Discovered {len(slugs)} cars')
        return

    data = load_data_js(args.data)
    cars = data['cars']

    slug_names = list(slugs.keys())
    unmatched = []
    matched = 0
    filled = {key: 0 for key in ['rarity', 'topSpeedStock', 'topSpeedMax', 'accelerationStock', 'accelerationMax', 'handlingStock', 'handlingMax', 'nitroStock', 'nitroMax', 'rankStock', 'rankMax', 'blueprintCount', 'commonParts', 'rareParts', 'epicParts', 'commonPartsCost', 'rarePartsCost', 'epicPartsCost', 'upgradeCredits', 'totalUpgradeCost', 'fuelTank', 'refillTime']}

    for i, car in enumerate(cars):
        if args.class_filter and car.get('class', '').upper() != args.class_filter:
            continue
        matched_name, score = match_name(car.get('carName', ''), slug_names, threshold=0.7)
        if not matched_name:
            unmatched.append({'index': i, 'carName': car.get('carName', ''), 'bestScore': round(score, 3)})
            continue

        info = slugs[matched_name]
        cache = args.cache_dir / f"{info['class']}-{info['slug']}.html"
        url = info['href']
        try:
            html = fetch(url, cache, delay=args.delay)
        except Exception as e:
            unmatched.append({'index': i, 'carName': car.get('carName', ''), 'slug': info['slug'], 'error': str(e)})
            continue

        parsed = parse_car_page(html)
        if merge_car(car, parsed, force=args.force):
            matched += 1
            for key in filled:
                if car.get(key) not in (None, ''):
                    filled[key] += 1

    if unmatched:
        MATCH_REVIEW_PATH.write_text(json.dumps(unmatched, indent=2, ensure_ascii=False), encoding='utf-8')

    report = {
        'matched': matched,
        'unmatched': len(unmatched),
        'filled': filled,
        'unmatchedCars': unmatched[:50],
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding='utf-8')

    print(json.dumps(report, indent=2))

    if not args.dry_run:
        save_data_js(args.data, data)


if __name__ == '__main__':
    main()
