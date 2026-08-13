#!/usr/bin/env python3
"""Compare js/data.js against the ASEC cars list and produce a diff report."""

import json
from pathlib import Path

from data_lib import load_data_js
from parse_asec import find_asec_match, get_cars_list, normalize

ROOT = Path(__file__).resolve().parents[1]
REPORT_PATH = ROOT / 'scripts' / 'asec_diff_report.json'


def find_db_match(asec_car: dict, db_cars: list) -> dict | None:
    """Find a DB car that matches an ASEC car (reverse of find_asec_match)."""
    full = normalize(f"{asec_car.get('brand', '')} {asec_car.get('model', '')}")
    for c in db_cars:
        name = normalize(c.get('carName', ''))
        if full and (full in name or name in full):
            return c
    return None


def main():
    data = load_data_js(ROOT / 'js' / 'data.js')
    db_cars = data.get('cars', [])
    asec_list = get_cars_list()

    db_names = {normalize(c['carName']): c for c in db_cars if c.get('carName')}
    asec_fulls = {normalize(f"{a['brand']} {a['model']}"): a for a in asec_list}

    matched = []
    db_unmatched = []
    asec_unmatched = []
    rank_mismatches = []
    class_mismatches = []

    for car in db_cars:
        asec = find_asec_match(car, asec_list)
        if asec is None:
            db_unmatched.append(car.get('carName'))
            continue
        record = {
            'carName': car.get('carName'),
            'asec_id': asec.get('id'),
            'db_class': car.get('class'),
            'asec_class': asec.get('car_class'),
            'db_rankMax': car.get('rankMax'),
            'asec_max_rank': asec.get('max_rank'),
            'db_rankStock': car.get('rankStock'),
        }
        matched.append(record)

        if car.get('class') != asec.get('car_class'):
            class_mismatches.append(record)

        asec_max = asec.get('max_rank')
        db_max = car.get('rankMax')
        if db_max is None:
            rank_mismatches.append({**record, 'diff': asec_max})
        elif asec_max is not None and db_max != asec_max:
            rank_mismatches.append({**record, 'diff': asec_max - db_max})

    for a in asec_list:
        if find_db_match(a, db_cars) is None:
            asec_unmatched.append(f"{a['brand']} {a['model']} (id {a['id']})")

    report = {
        'summary': {
            'db_cars': len(db_cars),
            'asec_cars': len(asec_list),
            'matched': len(matched),
            'db_unmatched': len(db_unmatched),
            'asec_unmatched': len(asec_unmatched),
            'class_mismatches': len(class_mismatches),
            'rank_mismatches': len(rank_mismatches),
        },
        'rank_mismatches': rank_mismatches,
        'class_mismatches': class_mismatches,
        'db_unmatched': db_unmatched,
        'asec_unmatched': asec_unmatched,
    }

    REPORT_PATH.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding='utf-8')
    print(json.dumps(report['summary'], indent=2))
    print(f'Wrote {REPORT_PATH}')


if __name__ == '__main__':
    main()
