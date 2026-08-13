#!/usr/bin/env python3
"""Fix cars whose rankMax/max stats came from ASEC's no-eip instead of top star."""

import json
import time
from pathlib import Path

from data_lib import load_data_js, save_data_js
from parse_asec import fetch_car_single, find_asec_match, get_cars_list

ROOT = Path(__file__).resolve().parents[1]
REPORT_PATH = ROOT / 'scripts' / 'asec_diff_report.json'


def top_star(asec_car: dict):
    max_stars = asec_car.get('max_stars')
    star = asec_car.get('stars', {}).get(f'star_{max_stars}') or {}
    return star.get('rank'), star.get('stats')


def no_eip(asec_car: dict):
    ne = asec_car.get('no_eip') or {}
    return ne.get('rank'), ne.get('stats')


def stock(asec_car: dict):
    s = asec_car.get('stock') or {}
    return s.get('rank'), s.get('stats')


def main():
    data = load_data_js(ROOT / 'js' / 'data.js')
    if not REPORT_PATH.exists():
        print(f'Report not found: {REPORT_PATH}')
        return

    report = json.loads(REPORT_PATH.read_text(encoding='utf-8'))
    asec_list = get_cars_list()
    asec_by_id = {a['id']: a for a in asec_list}

    asec_index = {}
    for item in report.get('rank_mismatches', []) + report.get('class_mismatches', []):
        asec_index[item['carName']] = item

    db_by_name = {c.get('carName'): c for c in data['cars']}

    fixed = 0
    reviewed = 0
    for car_name, item in asec_index.items():
        car = db_by_name.get(car_name)
        if not car:
            continue

        asec_id = item['asec_id']
        asec_car = fetch_car_single(asec_id)
        ne_rank, _ = no_eip(asec_car)
        ts_rank, ts_stats = top_star(asec_car)
        st_rank, st_stats = stock(asec_car)

        db_max = car.get('rankMax')

        # Apply the fix if our current rankMax is the ASEC no-eip value
        if ne_rank is not None and db_max == ne_rank:
            updates = {
                'rankStock': st_rank,
                'rankMax': ts_rank,
                'topSpeedStock': st_stats[0],
                'topSpeedMax': ts_stats[0],
                'accelerationStock': st_stats[1],
                'accelerationMax': ts_stats[1],
                'handlingStock': st_stats[2],
                'handlingMax': ts_stats[2],
                'nitroStock': st_stats[3],
                'nitroMax': ts_stats[3],
                'notes': 'Verified stats and ranks: ASEC',
            }
            for k, v in updates.items():
                if v is not None:
                    car[k] = v
            print(f'FIXED {car_name}: rankMax {db_max} -> {ts_rank}')
            fixed += 1
        else:
            print(f'REVIEW {car_name}: db={db_max}, asec no_eip={ne_rank}, asec top_star={ts_rank}, asec max_rank={asec_car.get("max_stars")}')
            reviewed += 1

        time.sleep(0.1)

    save_data_js(ROOT / 'js' / 'data.js', data)
    print(f'Fixed {fixed} cars, flagged {reviewed} for manual review.')


if __name__ == '__main__':
    main()
