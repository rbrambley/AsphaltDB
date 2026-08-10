#!/usr/bin/env python3
"""
Generate js/garage_data.js by OCR-ing Asphalt Legends Unite car-detail screenshots.

Requirements:
    pip install pytesseract pillow
    Install Tesseract OCR: https://github.com/UB-Mannheim/tesseract/wiki
    Make sure tesseract.exe is on your PATH (or set the path below).

Usage:
    python scripts/update_garage.py
    python scripts/update_garage.py --input-dir garage-screenshots --output js/garage_data.js
"""
import argparse
import difflib
import json
import os
import re
from datetime import datetime
from pathlib import Path
from typing import List, Optional

import pytesseract
from PIL import Image

# If Tesseract is not on PATH, uncomment and set the path to tesseract.exe:
pytesseract.pytesseract.tesseract_cmd = r'C:\Users\rich\tesseract-install\tesseract.exe'

DATA_JS = Path(__file__).resolve().parents[1] / 'js' / 'data.js'
GARAGE_JS = Path(__file__).resolve().parents[1] / 'js' / 'garage_data.js'
REVIEW_JSON = Path(__file__).resolve().parents[1] / 'garage_review.json'


def load_cars():
    text = DATA_JS.read_text(encoding='utf-8')
    match = re.search(r'const cars = (\[.*?\]);', text, re.S)
    if not match:
        raise RuntimeError('const cars not found in js/data.js')
    return json.loads(match.group(1))


def normalize_name(s):
    s = re.sub(r'[^A-Za-z0-9\s]', ' ', s)
    s = re.sub(r'\s+', ' ', s)
    return s.strip().lower()


def token_sort(s):
    return ' '.join(sorted(normalize_name(s).split()))


def no_space(s):
    return re.sub(r'[^A-Za-z0-9]', '', s).lower()


def match_car_name(ocr_name, cars, threshold=0.7):
    best = None
    best_ratio = 0
    ocr_token = token_sort(ocr_name)
    ocr_nospace = no_space(ocr_name)
    for c in cars:
        car_token = token_sort(c['carName'])
        car_nospace = no_space(c['carName'])
        token_ratio = difflib.SequenceMatcher(None, ocr_token, car_token).ratio()
        nospace_ratio = difflib.SequenceMatcher(None, ocr_nospace, car_nospace).ratio()
        ratio = max(token_ratio, nospace_ratio)
        if ratio > best_ratio:
            best_ratio = ratio
            best = c
    if best and best_ratio >= threshold:
        return best['carName'], best_ratio
    return None, best_ratio


def slugify(name):
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')


def parse_words(image) -> List[dict]:
    """Run Tesseract and return a list of word boxes with text and coordinates."""
    data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
    words = []
    n = len(data['text'])
    for i in range(n):
        text = data['text'][i].strip()
        if not text:
            continue
        conf = int(data['conf'][i])
        words.append({
            'text': text,
            'x': data['left'][i],
            'y': data['top'][i],
            'w': data['width'][i],
            'h': data['height'][i],
            'conf': conf,
            'line_num': data['line_num'][i],
        })
    return words


def find_name(words, width, height, cars):
    """Extract the car name from the large text in the top-left."""
    region = [w for w in words if w['x'] < 0.45 * width and w['y'] < 0.32 * height and w['conf'] > 30]
    if not region:
        return None, None, []
    # Ignore obvious non-name words
    region = [w for w in region if w['text'].upper() not in ('BLUEPRINT', 'RACER', 'IMPORT', 'PARTS', 'MAX', 'RANK')]
    # Use the largest words by height (the big name text)
    avg_h = sum(w['h'] for w in region) / len(region)
    large = [w for w in region if w['h'] >= avg_h * 1.2]
    if not large:
        large = region
    # Group into lines by y proximity
    large.sort(key=lambda w: w['y'])
    lines = []
    current_line = []
    for w in large:
        if current_line and abs(w['y'] - current_line[-1]['y']) > w['h'] * 1.2:
            lines.append(current_line)
            current_line = []
        current_line.append(w)
    if current_line:
        lines.append(current_line)
    # Take the top 1-2 lines and sort words within each line by x
    top_lines = lines[:2]
    name_parts = []
    for line in top_lines:
        line.sort(key=lambda w: w['x'])
        name_parts.append(' '.join(w['text'] for w in line))
    raw_name = ' '.join(name_parts)
    matched, conf = match_car_name(raw_name, cars)
    return matched, raw_name, name_parts


def find_rank(words, width, height):
    """Find rank (current/max) and class."""
    rank = None
    for w in words:
        m = re.match(r'(\d{1,3}(?:,\d{3})+)/(\d{1,3}(?:,\d{3})+)', w['text'])
        if m:
            rank = {
                'rankCurrent': int(m.group(1).replace(',', '')),
                'rankMax': int(m.group(2).replace(',', '')),
            }
            break
    # Class is a single uppercase letter in the top-right
    class_letter = None
    for w in words:
        if w['x'] > 0.65 * width and w['y'] < 0.25 * height and re.match(r'^[DCSRAB]$', w['text'].upper()):
            class_letter = w['text'].upper()
            break
    if not class_letter:
        # Fallback: find a single letter near the rank text
        for w in words:
            if re.match(r'^[DCSRAB]$', w['text'].upper()):
                class_letter = w['text'].upper()
                break
    return rank, class_letter


def find_blueprint(words):
    """Find blueprint status: MAX or current/max."""
    for w in words:
        if w['text'].upper() == 'MAX':
            return {'blueprintStatus': 'MAX', 'blueprintCurrent': None, 'blueprintMax': None}
        m = re.match(r'(\d+)/(\d+)', w['text'])
        if m:
            return {
                'blueprintStatus': w['text'],
                'blueprintCurrent': int(m.group(1)),
                'blueprintMax': int(m.group(2)),
            }
    return None


def find_stat(words, label, width, height):
    """Find the numeric value to the right of a stat label."""
    label_words = [w for w in words if label.upper() in w['text'].upper()]
    if not label_words:
        return None
    target = label_words[0]
    # Find the nearest number to the right, on roughly the same line
    best = None
    best_dist = float('inf')
    for w in words:
        if re.match(r'^\d+(?:\.\d+)?$', w['text']) and w['x'] > target['x']:
            if abs(w['y'] - target['y']) < target['h'] * 2:
                dist = (w['x'] - target['x']) ** 2 + (w['y'] - target['y']) ** 2
                if dist < best_dist:
                    best_dist = dist
                    best = w
    return float(best['text']) if best else None


def parse_image(path, cars):
    image = Image.open(path)
    width, height = image.size
    words = parse_words(image)

    if not words:
        return None

    matched_name, raw_name, _ = find_name(words, width, height, cars)
    if not matched_name and not raw_name:
        return None
    rank, class_letter = find_rank(words, width, height)
    blueprint = find_blueprint(words)
    top_speed = find_stat(words, 'SPEED', width, height)
    accel = find_stat(words, 'ACCELERATION', width, height)
    handling = find_stat(words, 'HANDLING', width, height)
    nitro = find_stat(words, 'NITRO', width, height)

    car_name = matched_name if matched_name else raw_name
    result = {
        'id': slugify(car_name),
        'carName': car_name,
        'matchedCar': matched_name if matched_name else raw_name,
        'class': class_letter,
        'rankCurrent': rank['rankCurrent'] if rank else None,
        'rankMax': rank['rankMax'] if rank else None,
        'stars': None,  # Star icons are not reliably OCR'd
        'blueprintCurrent': blueprint['blueprintCurrent'] if blueprint else None,
        'blueprintMax': blueprint['blueprintMax'] if blueprint else None,
        'blueprintStatus': blueprint['blueprintStatus'] if blueprint else None,
        'topSpeed': top_speed,
        'acceleration': accel,
        'handling': handling,
        'nitro': nitro,
        'capturedAt': datetime.now().isoformat(),
        'imageName': Path(path).name,
    }
    return result


def load_existing_garage():
    if not GARAGE_JS.exists():
        return []
    text = GARAGE_JS.read_text(encoding='utf-8')
    match = re.search(r'const garage = (\[.*?\]);', text, re.S)
    if not match:
        return []
    return json.loads(match.group(1))


def save_garage(garage):
    text = f"const garage = {json.dumps(garage, indent=2)};\n"
    GARAGE_JS.write_text(text, encoding='utf-8')


def main():
    parser = argparse.ArgumentParser(description='Update garage_data.js from screenshots.')
    parser.add_argument('--input-dir', default='garage-screenshots', help='Folder containing screenshots')
    args = parser.parse_args()

    input_dir = Path(args.input_dir)
    if not input_dir.exists():
        print(f'Input directory not found: {input_dir}')
        print('Create it and place your screenshots there, then run again.')
        return

    cars = load_cars()
    existing = load_existing_garage()
    by_id = {entry['id']: entry for entry in existing}
    review = []

    images = list(input_dir.glob('*.png')) + list(input_dir.glob('*.jpg')) + list(input_dir.glob('*.jpeg'))
    # Process oldest first, newest last, so the most recent screenshot wins for a given car
    images.sort(key=lambda p: p.stat().st_mtime)
    if not images:
        print(f'No .png/.jpg images found in {input_dir}')
        return

    for img_path in images:
        print(f'Processing {img_path.name}...')
        try:
            parsed = parse_image(img_path, cars)
        except Exception as e:
            print(f'  Error: {e}')
            review.append({'imageName': img_path.name, 'error': str(e)})
            continue

        if not parsed:
            print(f'  No text found.')
            review.append({'imageName': img_path.name, 'error': 'No text found'})
            continue

        # Preserve manually-set stars if OCR did not detect them
        if parsed['id'] in by_id and by_id[parsed['id']].get('stars') and parsed['stars'] is None:
            parsed['stars'] = by_id[parsed['id']]['stars']

        by_id[parsed['id']] = parsed
        print(f'  -> {parsed["carName"]} ({parsed["class"]})')

        # Flag for review if any key field is missing or the car was not matched
        car_names = {c['carName'] for c in cars}
        if not parsed['rankCurrent'] or not parsed['topSpeed']:
            review.append({
                'imageName': img_path.name,
                'parsedName': parsed['carName'],
                'message': 'Low-confidence parse; check in garage.html and correct if needed.'
            })

    garage = sorted(by_id.values(), key=lambda e: e['carName'])
    save_garage(garage)

    if review:
        REVIEW_JSON.write_text(json.dumps(review, indent=2), encoding='utf-8')
        print(f'Wrote {len(review)} review entries to {REVIEW_JSON}')
    else:
        if REVIEW_JSON.exists():
            REVIEW_JSON.unlink()

    print(f'Wrote {len(garage)} cars to {GARAGE_JS}')


if __name__ == '__main__':
    main()
