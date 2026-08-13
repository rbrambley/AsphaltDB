#!/usr/bin/env python3
"""Update the entire AsphaltDB car database from ASEC as the primary source."""

import time
from pathlib import Path

from data_lib import load_data_js, save_data_js
from parse_asec import fetch_car_single, find_asec_match, get_cars_list, normalize

ROOT = Path(__file__).resolve().parents[1]

RARITY_BY_STARS = {
    1: 'Common',
    2: 'Common',
    3: 'Uncommon',
    4: 'Rare',
    5: 'Epic',
    6: 'Legendary',
}


def _clean(value):
    """Convert ASEC placeholders to None."""
    if value is None or value == '' or value == '-':
        return None
    return value


def _clean_stats(stats):
    if not stats:
        return None
    cleaned = [_clean(v) for v in stats]
    if any(v is None for v in cleaned):
        return None
    return cleaned


def _rank_and_stats(asec_car: dict):
    """Return the best max rank/stats from ASEC (top star -> no_eip -> None)."""
    max_stars = asec_car.get('max_stars')
    star = asec_car.get('stars', {}).get(f'star_{max_stars}') or {}
    ts_rank = _clean(star.get('rank'))
    ts_stats = _clean_stats(star.get('stats'))

    if ts_rank is None:
        ne = asec_car.get('no_eip') or {}
        ts_rank = _clean(ne.get('rank'))
        ts_stats = _clean_stats(ne.get('stats'))

    st = asec_car.get('stock') or {}
    st_rank = _clean(st.get('rank'))
    st_stats = _clean_stats(st.get('stats'))

    return st_rank, st_stats, ts_rank, ts_stats


def find_db_match(asec_car: dict, db_cars: list, used: set) -> tuple | None:
    """Find one unused DB car matching this ASEC car.

    Match by model first (handles brand-name mismatches like DS/Citroen)
    and pick the shortest DB name that contains the ASEC model, so
    `Porsche 718 Cayman` does not swallow `Porsche 718 Cayman GT4 Clubsport`.
    """
    full = normalize(f"{asec_car.get('brand', '')} {asec_car.get('model', '')}")
    model = normalize(asec_car.get('model', ''))
    brand = normalize(asec_car.get('brand', ''))

    # First: exact full-name match
    for i, c in enumerate(db_cars):
        if i in used:
            continue
        name = normalize(c.get('carName', ''))
        if full and full == name:
            return i, c

    # Second: model contained in DB name, preferring the shortest match
    matches = []
    for i, c in enumerate(db_cars):
        if i in used:
            continue
        name = normalize(c.get('carName', ''))
        if model and model in name:
            # If brand is short or generic, the model match is enough.
            # Otherwise make sure the brand is present too.
            if len(brand) <= 2 or brand in name:
                matches.append((len(name), i, c))
    if matches:
        matches.sort(key=lambda x: x[0])
        return matches[0][1], matches[0][2]

    return None


def parts(asec_car: dict):
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
    return common, rare, epic


def blueprints(asec_car: dict) -> int:
    bp = asec_car.get('bp_patterns', {})
    return sum(
        int(bp.get(k)) for k in ('unlock', 'star2', 'star3', 'star4', 'star5', 'star6')
        if isinstance(bp.get(k), (int, float)) and bp.get(k) is not None
    )


def build_record(asec_car: dict) -> dict | None:
    st_rank, st_stats, ts_rank, ts_stats = _rank_and_stats(asec_car)

    # Skip ASEC cars that have no usable rank data
    if st_rank is None or ts_rank is None:
        return None

    common, rare, epic = parts(asec_car)

    return {
        'carName': f"{asec_car['brand']} {asec_car['model']}",
        'manufacturer': asec_car['brand'],
        'class': asec_car['car_class'],
        'rarity': RARITY_BY_STARS.get(asec_car.get('max_stars')),
        'rankStock': st_rank,
        'rankMax': ts_rank,
        'topSpeedStock': st_stats[0] if st_stats else None,
        'topSpeedMax': ts_stats[0] if ts_stats else None,
        'accelerationStock': st_stats[1] if st_stats else None,
        'accelerationMax': ts_stats[1] if ts_stats else None,
        'handlingStock': st_stats[2] if st_stats else None,
        'handlingMax': ts_stats[2] if ts_stats else None,
        'nitroStock': st_stats[3] if st_stats else None,
        'nitroMax': ts_stats[3] if ts_stats else None,
        'blueprintCount': blueprints(asec_car),
        'commonParts': common,
        'rareParts': rare,
        'epicParts': epic,
        'evoEligible': asec_car.get('evo', False),
        'notes': 'Verified stats and ranks: ASEC',
    }


def merge_asec(asec_car: dict, existing: dict) -> None:
    record = build_record(asec_car)
    if record is None:
        return

    # ASEC overwrites core fields; carName is preserved to avoid breaking references
    for k, v in record.items():
        if k == 'carName':
            continue
        if v is not None and v != '':
            existing[k] = v

    existing.setdefault('carName', record['carName'])
    if not existing.get('manufacturer'):
        existing['manufacturer'] = record['manufacturer']


def main():
    data = load_data_js(ROOT / 'js' / 'data.js')
    asec_list = get_cars_list()

    db_cars = data.get('cars', [])
    used = set()

    updated = 0
    added = 0
    skipped = 0

    for asec in asec_list:
        asec_id = asec['id']

        try:
            asec_detail = fetch_car_single(asec_id)
        except Exception as e:
            print(f'FETCH ERROR id {asec_id}: {e}')
            continue

        record = build_record(asec_detail)
        if record is None:
            print(f'SKIPPED (no data): {asec["brand"]} {asec["model"]}')
            skipped += 1
            continue

        match = find_db_match(asec, db_cars, used)
        if match is None:
            db_cars.append(record)
            used.add(len(db_cars) - 1)
            added += 1
            print(f'ADDED: {record["carName"]}')
        else:
            idx, car = match
            used.add(idx)
            merge_asec(asec_detail, car)
            updated += 1
            print(f'UPDATED: {car.get("carName")}')

        time.sleep(0.05)

    unmatched = sum(1 for i, _ in enumerate(db_cars) if i not in used)
    save_data_js(ROOT / 'js' / 'data.js', data)
    print(f'Done: {updated} updated, {added} added, {skipped} skipped, {unmatched} DB cars not in ASEC.')


if __name__ == '__main__':
    main()
