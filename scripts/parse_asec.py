#!/usr/bin/env python3
"""Backfill AsphaltDB car data from ASEC (https://asec.tools) Netlify functions."""

import argparse
import json
import re
import time
import unicodedata
from pathlib import Path

import requests

from data_lib import load_data_js, save_data_js


def normalize(s: str) -> str:
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode('ascii')
    s = re.sub(r'[^a-z0-9]', '', s.lower())
    return s

ROOT = Path(__file__).resolve().parents[1]
DATA_JS = ROOT / 'js' / 'data.js'
CACHE = ROOT / 'scripts' / 'asec_carsList.json'

BASE = 'https://asec.tools'
LIST_URL = f'{BASE}/.netlify/functions/carsList'
CAR_URL = f'{BASE}/.netlify/functions/carSingle'

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
}


def get_cars_list() -> list:
    if CACHE.exists():
        return json.loads(CACHE.read_text(encoding='utf-8'))
    r = requests.get(LIST_URL, headers=HEADERS, timeout=30)
    r.raise_for_status()
    data = r.json()
    CACHE.write_text(json.dumps(data, indent=2), encoding='utf-8')
    return data


def find_asec_match(car: dict, asec_list: list) -> dict | None:
    """Match by normalized full name from ASEC to our carName."""
    name = normalize(car.get('carName', ''))
    for a in asec_list:
        full = normalize(f"{a.get('brand', '')} {a.get('model', '')}")
        if full and (full in name or name in full):
            return a
    return None


def fetch_car_single(car_id: int) -> dict:
    r = requests.get(f'{CAR_URL}?carID={car_id}', headers=HEADERS, timeout=20)
    r.raise_for_status()
    data = r.json()
    if not data:
        raise ValueError(f'empty response for carID {car_id}')
    # The endpoint returns a list with a single car dict
    return data[0] if isinstance(data, list) else data


def map_asec_to_db(asec_car: dict) -> dict:
    """Map ASEC carSingle payload to our data.js fields."""
    stock = asec_car.get('stock', {}) or {}
    max_ = asec_car.get('no_eip', {}) or {}
    stock_stats = stock.get('stats') or [None, None, None, None]
    max_stats = max_.get('stats') or [None, None, None, None]

    bp = asec_car.get('bp_patterns', {})
    blueprint_count = 0
    for k in ('unlock', 'star2', 'star3', 'star4', 'star5', 'star6'):
        v = bp.get(k)
        if isinstance(v, (int, float)):
            blueprint_count += int(v)

    # Upgrades: first three slots in upg_patterns.stars[*] look like common/rare/epic
    upg = asec_car.get('upg_patterns', {}).get('stars', {})
    common = rare = epic = 0
    for star, arr in upg.items():
        if not isinstance(arr, list):
            continue
        try:
            if arr[0] not in (None, '-'):
                common += int(arr[0])
            if arr[1] not in (None, '-'):
                rare += int(arr[1])
            if arr[2] not in (None, '-'):
                epic += int(arr[2])
        except (ValueError, IndexError):
            pass

    return {
        'rankStock': stock.get('rank'),
        'rankMax': max_.get('rank'),
        'topSpeedStock': stock_stats[0],
        'topSpeedMax': max_stats[0],
        'accelerationStock': stock_stats[1],
        'accelerationMax': max_stats[1],
        'handlingStock': stock_stats[2],
        'handlingMax': max_stats[2],
        'nitroStock': stock_stats[3],
        'nitroMax': max_stats[3],
        'blueprintCount': blueprint_count,
        'commonParts': common,
        'rareParts': rare,
        'epicParts': epic,
    }


def main():
    parser = argparse.ArgumentParser(description='Backfill cars from ASEC')
    parser.add_argument('--data', type=Path, default=DATA_JS)
    parser.add_argument('--missing-only', action='store_true',
                        help='Only update cars with missing stock/max stats')
    parser.add_argument('--car-name', help='Update a single named car')
    parser.add_argument('--dry-run', action='store_true', help='Preview changes without writing')
    parser.add_argument('--delay', type=float, default=0.15, help='Seconds between requests')
    args = parser.parse_args()

    data = load_data_js(args.data)
    asec_list = get_cars_list()

    cars = data.get('cars', [])
    targets = cars
    if args.car_name:
        targets = [c for c in cars if args.car_name.lower() in c.get('carName', '').lower()]
    elif args.missing_only:
        required = [
            'rankStock', 'rankMax', 'topSpeedStock', 'topSpeedMax',
            'accelerationStock', 'accelerationMax', 'handlingStock', 'handlingMax',
            'nitroStock', 'nitroMax',
        ]
        targets = [c for c in cars if any(c.get(f) in (None, '') for f in required)]

    print(f'Targets: {len(targets)} (missing-only={args.missing_only})')

    updated = 0
    for car in targets:
        match = find_asec_match(car, asec_list)
        if not match:
            print(f'NO MATCH: {car.get("carName")}')
            continue

        try:
            asec_car = fetch_car_single(match['id'])
        except Exception as e:
            print(f'FETCH ERROR for {car.get("carName")}: {e}')
            continue

        updates = map_asec_to_db(asec_car)
        print(f'{car.get("carName")} -> ASEC id {match["id"]}: {updates}')

        if not args.dry_run:
            for k, v in updates.items():
                # Only overwrite null/empty values
                if v is not None and (car.get(k) is None or car.get(k) == ''):
                    car[k] = v
                    updated += 1

        time.sleep(args.delay)

    if not args.dry_run and updated:
        save_data_js(args.data, data)
        print(f'Updated {updated} cars and saved {args.data}')
    else:
        print(f'Dry run complete. {updated} cars would be updated.')


if __name__ == '__main__':
    main()
