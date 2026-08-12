#!/usr/bin/env python3
"""Merge a manual car updates JSON file into js/data.js."""

import argparse
import json
from pathlib import Path

from data_lib import load_data_js, save_data_js


def merge_manual(data: list[dict], cars: list[dict]) -> tuple[int, list[str]]:
    """Apply manual updates to the cars list. Returns (updated_count, unmatched_names)."""
    by_name = {c['carName']: c for c in cars}
    updated = 0
    unmatched = []
    for entry in data:
        name = entry.get('carName')
        if not name or name not in by_name:
            unmatched.append(name or 'unnamed')
            continue
        car = by_name[name]
        for key, value in entry.items():
            if key == 'carName':
                continue
            if value is None or value == '':
                continue
            car[key] = value
        updated += 1
    return updated, unmatched


def main():
    parser = argparse.ArgumentParser(description='Merge manual car JSON into js/data.js')
    parser.add_argument('manual_json', type=Path, help='Exported manual_cars.json file')
    parser.add_argument('--data', type=Path, default=Path(__file__).resolve().parents[1] / 'js' / 'data.js')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()

    manual = json.loads(args.manual_json.read_text(encoding='utf-8'))
    if not isinstance(manual, list):
        raise SystemExit('manual JSON must be a list of car objects')

    all_data = load_data_js(args.data)
    updated, unmatched = merge_manual(manual, all_data['cars'])

    print(f'Updated {updated} car(s)')
    if unmatched:
        print(f'Unmatched: {unmatched}')

    if not args.dry_run:
        save_data_js(args.data, all_data)
        print(f'Wrote {args.data}')


if __name__ == '__main__':
    main()
