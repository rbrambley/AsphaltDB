#!/usr/bin/env python3
"""Validate the contents of js/data.js and report data-quality issues."""

import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path

from data_lib import load_data_js, match_name, normalize_name, save_data_js

ROOT = Path(__file__).resolve().parents[1]
DATA_JS = ROOT / 'js' / 'data.js'
REPORT_PATH = ROOT / 'scripts' / 'validation_report.json'

REQUIRED_CAR_FIELDS = [
    'carName', 'class', 'rarity', 'rankStock', 'rankMax',
    'topSpeedStock', 'topSpeedMax', 'accelerationStock', 'accelerationMax',
    'handlingStock', 'handlingMax', 'nitroStock', 'nitroMax',
]

NUMERIC_CAR_FIELDS = [
    'rankStock', 'rankMax', 'topSpeedStock', 'topSpeedMax',
    'accelerationStock', 'accelerationMax', 'handlingStock', 'handlingMax',
    'nitroStock', 'nitroMax',
]

OPTIONAL_CAR_FIELDS = [
    'releaseYear', 'blueprintCount', 'commonParts', 'rareParts', 'epicParts',
    'commonPartsCost', 'rarePartsCost', 'epicPartsCost', 'upgradeCredits', 'totalUpgradeCost',
]


def is_numeric(value) -> bool:
    if value is None or value == '':
        return True
    if isinstance(value, (int, float)):
        return True
    if isinstance(value, str):
        return bool(re.fullmatch(r'[\d,\.\s]+', value.strip().replace(',', '').replace('.', '')))
    return False


def validate(data: dict, strict: bool = False) -> dict:
    errors = []
    warnings = []

    cars = data.get('cars', [])
    tracks = data.get('tracks', [])
    career_races = data.get('careerRaces', [])
    calendar = data.get('calendarEvents', [])
    events = data.get('events', [])

    # Car duplicates
    seen_names = {}
    for i, car in enumerate(cars):
        name = car.get('carName')
        if not name:
            errors.append({'type': 'missing-car-name', 'index': i})
            continue
        if name in seen_names:
            errors.append({'type': 'duplicate-car', 'carName': name, 'first': seen_names[name], 'second': i})
        else:
            seen_names[name] = i

    # Car required fields
    for i, car in enumerate(cars):
        for field in REQUIRED_CAR_FIELDS:
            if field not in car or car[field] in (None, ''):
                issue = {'type': 'missing-required-field', 'carName': car.get('carName', f'#{i}'), 'field': field}
                (errors if strict else warnings).append(issue)
        for field in NUMERIC_CAR_FIELDS:
            if field in car and not is_numeric(car[field]):
                errors.append({'type': 'non-numeric-field', 'carName': car.get('carName', f'#{i}'), 'field': field, 'value': car[field]})

    if strict:
        for i, car in enumerate(cars):
            for field in OPTIONAL_CAR_FIELDS:
                if field not in car or car[field] in (None, ''):
                    warnings.append({'type': 'missing-optional-field', 'carName': car.get('carName', f'#{i}'), 'field': field})

    # Track duplicates
    seen_tracks = {}
    for i, track in enumerate(tracks):
        name = track.get('trackName')
        if not name:
            errors.append({'type': 'missing-track-name', 'index': i})
            continue
        if name in seen_tracks:
            errors.append({'type': 'duplicate-track', 'trackName': name, 'first': seen_tracks[name], 'second': i})
        else:
            seen_tracks[name] = i

    # Career race track links
    track_names = {t.get('trackName', '') for t in tracks}
    for i, race in enumerate(career_races):
        track = race.get('track', '')
        if not track:
            warnings.append({'type': 'missing-race-track', 'index': i})
            continue
        matched, _ = match_name(track, list(track_names), threshold=0.65)
        if not matched:
            errors.append({'type': 'unmatched-race-track', 'raceIndex': i, 'track': track, 'season': race.get('season', '')})

    # Calendar events
    for i, ev in enumerate(calendar):
        for field in ('eventName', 'type', 'startDate', 'endDate'):
            if not ev.get(field):
                warnings.append({'type': 'missing-calendar-field', 'index': i, 'field': field})
        start = ev.get('startDate')
        end = ev.get('endDate')
        if start and end:
            try:
                if datetime.fromisoformat(start) > datetime.fromisoformat(end):
                    warnings.append({'type': 'inverted-date-range', 'index': i, 'eventName': ev.get('eventName', '')})
            except ValueError:
                warnings.append({'type': 'unparseable-date', 'index': i, 'startDate': start, 'endDate': end})

    # Generic events
    for i, ev in enumerate(events):
        if not ev.get('eventName'):
            warnings.append({'type': 'missing-event-name', 'index': i})

    return {
        'errors': errors,
        'warnings': warnings,
        'summary': {
            'cars': len(cars),
            'tracks': len(tracks),
            'careerRaces': len(career_races),
            'calendarEvents': len(calendar),
            'events': len(events),
            'errorCount': len(errors),
            'warningCount': len(warnings),
        },
    }


def main():
    parser = argparse.ArgumentParser(description='Validate js/data.js')
    parser.add_argument('--data', type=Path, default=DATA_JS)
    parser.add_argument('--strict', action='store_true', help='Warn on missing optional fields')
    parser.add_argument('--report', type=Path, default=REPORT_PATH)
    parser.add_argument('--dry-run', action='store_true', help='Do not write report')
    args = parser.parse_args()

    data = load_data_js(args.data)
    result = validate(data, strict=args.strict)

    if not args.dry_run:
        args.report.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding='utf-8')

    print(json.dumps(result['summary'], indent=2))
    for err in result['errors'][:20]:
        print('ERROR:', err)
    for warn in result['warnings'][:20]:
        print('WARN:', warn)
    if len(result['errors']) > 20:
        print(f'... and {len(result["errors"]) - 20} more errors')
    if len(result['warnings']) > 20:
        print(f'... and {len(result["warnings"]) - 20} more warnings')

    sys.exit(1 if result['errors'] else 0)


if __name__ == '__main__':
    main()
