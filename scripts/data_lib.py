"""Helpers to load and save the JS-style `js/data.js` arrays used by AsphaltDB."""

import difflib
import json
import re
import unicodedata
from pathlib import Path

ARRAY_ORDER = [
    'cars',
    'tracks',
    'careerSeasons',
    'careerRaces',
    'events',
    'calendarEvents',
]


def _extract_js_array(text: str, name: str) -> str:
    """Find the JSON array after `const <name> = [` and return it as a string."""
    pattern = re.compile(rf'\bconst\s+{re.escape(name)}\s*=\s*\[')
    match = pattern.search(text)
    if not match:
        raise RuntimeError(f'const {name} not found in data.js')

    start = match.end() - 1  # point at the '['
    depth = 0
    in_string = False
    escape = False
    i = start
    end = len(text)

    while i < end:
        ch = text[i]
        if in_string:
            if escape:
                escape = False
            elif ch == '\\':
                escape = True
            elif ch == '"':
                in_string = False
            i += 1
            continue

        if ch == '"':
            in_string = True
            i += 1
            continue

        if ch == '[':
            depth += 1
        elif ch == ']':
            depth -= 1
            if depth == 0:
                return text[start:i + 1]
        i += 1

    raise RuntimeError(f'Unterminated array for {name}')


def load_data_js(path: str | Path) -> dict[str, list]:
    """Load all known top-level JS arrays from `data.js` as Python lists."""
    text = Path(path).read_text(encoding='utf-8')
    data = {}
    for name in ARRAY_ORDER:
        try:
            array_text = _extract_js_array(text, name)
            data[name] = json.loads(array_text)
        except RuntimeError:
            data[name] = []
    return data


def save_data_js(path: str | Path, data: dict[str, list]) -> None:
    """Write `data.js` with `const <name> = [...];` blocks in stable order."""
    path = Path(path)
    parts = []
    for name in ARRAY_ORDER:
        if name not in data:
            continue
        json_text = json.dumps(data[name], ensure_ascii=False, indent=2)
        parts.append(f'const {name} = {json_text};')
    path.write_text('\n'.join(parts) + '\n', encoding='utf-8')


def _ascii_form(s: str) -> str:
    """Strip diacritics and keep ASCII letters/digits."""
    return ''.join(
        c for c in unicodedata.normalize('NFKD', s)
        if not unicodedata.combining(c)
    )


def normalize_name(s: str) -> str:
    s = _ascii_form(s)
    s = re.sub(r'[^A-Za-z0-9\s]', ' ', s)
    s = re.sub(r'\s+', ' ', s)
    return s.strip().lower()


def token_sort(s: str) -> str:
    return ' '.join(sorted(normalize_name(s).split()))


def no_space(s: str) -> str:
    s = _ascii_form(s)
    return re.sub(r'[^A-Za-z0-9]', '', s).lower()


def match_name(query: str, candidates: list[str], threshold: float = 0.7) -> tuple[str | None, float]:
    """Fuzzy-match a human-readable name against a list of candidates."""
    best = None
    best_ratio = 0.0
    q_token = token_sort(query)
    q_nospace = no_space(query)
    q_slug = slugify(query)
    for cand in candidates:
        c_token = token_sort(cand)
        c_nospace = no_space(cand)
        c_slug = slugify(cand)
        token_ratio = difflib.SequenceMatcher(None, q_token, c_token).ratio()
        nospace_ratio = difflib.SequenceMatcher(None, q_nospace, c_nospace).ratio()
        slug_ratio = difflib.SequenceMatcher(None, q_slug, c_slug).ratio()
        ratio = max(token_ratio, nospace_ratio, slug_ratio)
        if ratio > best_ratio:
            best_ratio = ratio
            best = cand
    if best and best_ratio >= threshold:
        return best, best_ratio
    return None, best_ratio


def slugify(name: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
