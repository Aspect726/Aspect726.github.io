"""Independent count, key, mathematical-check, and slide-reference audit."""
import json
import math
import re
import statistics
from collections import Counter
from decimal import Decimal as D
from fractions import Fraction as F
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / 'expanded_student_manifest.json').read_text())
answers = json.loads((ROOT / 'expanded_answers.json').read_text())
slides = json.loads((ROOT / 'expanded_deck_meta.json').read_text())
errors = []
checks = 0

def verify(condition, message):
    global checks
    checks += 1
    if not condition:
        errors.append(message)

verify([s['number'] for s in slides] == list(range(1, len(slides) + 1)),
       'slide numbers must be unique and contiguous')
lookup = {}
for week in answers['weeks']:
    for section in week['sections']:
        for item in section['items']:
            key = f"{section['id']}:{item['id']}"
            verify(key not in lookup, f'duplicate answer key {key}')
            lookup[key] = (week['week'], section, item)

env = {'F': F, 'D': D, 'math': math, 'statistics': statistics,
       'abs': abs, 'sum': sum, 'range': range, 'all': all,
       'len': len, 'min': min, 'max': max, 'sorted': sorted,
       'set': set, 'bool': bool, 'str': str, '__builtins__': {}}
math_count = 0
for key, (_, _, item) in lookup.items():
    if item.get('check'):
        math_count += 1
        try:
            verify(bool(eval(item['check'], env)), f'math check failed {key}')
        except Exception as exc:
            verify(False, f'math check error {key}: {exc}')

verify(len(manifest['days']) == 70, 'not 70 days')
for day in manifest['days']:
    assigned = [p for s in day['sections'] if s.get('assigned') for p in s['items']]
    expected = 25 if day['weekday'] == 'Wed' else 20
    verify(len(assigned) == expected, f"day {day['day']} item count")
    verify(sorted(p['id'] for p in assigned if p['id'] in ('C1', 'C2')) == ['C1', 'C2'],
           f"day {day['day']} challenges")
    verify(day['pages'] == (3 if day['weekday'] in ('Sat', 'Sun') else 1),
           f"day {day['day']} packet page count")
    for section in day['sections']:
        for item in section['items']:
            key = f"{section['id']}:{item['id']}"
            verify(key in lookup, f'manifest missing answer {key}')
            if key in lookup:
                answer = lookup[key][2]
                for field in ('text', 'answer', 'student_page'):
                    verify(item.get(field) == answer.get(field), f'{key} mismatch {field}')

review_coverage = Counter()
lesson_coverage = Counter()
for slide in slides:
    keys = slide.get('answer_ids', [])
    for key in keys:
        verify(key in lookup, f"slide {slide['number']} unknown key {key}")
    if not keys or any(key not in lookup for key in keys):
        continue
    pages = sorted(set(lookup[key][2]['student_page'] for key in keys))
    days = set(lookup[key][1]['day'] for key in keys)
    verify(len(days) == 1, f"slide {slide['number']} crosses days")
    reference = slide.get('follow_along', '')
    match = re.search(r'Workbook pp?\.\s*([\d,\s–−-]+)', reference)
    verify(bool(match), f"slide {slide['number']} missing page reference")
    if match:
        listed = []
        for group in match.group(1).split(','):
            bounds = [int(n) for n in re.findall(r'\d+', group)]
            if bounds:
                listed.extend(range(bounds[0], bounds[-1] + 1))
        verify(set(pages).issubset(listed),
               f"slide {slide['number']} references {listed}; needs {pages}")
    for key in keys:
        (review_coverage if slide.get('review_section') else lesson_coverage)[key] += 1

for key, (_, section, item) in lookup.items():
    verify(review_coverage[key] == 1, f'{key} answer-review coverage {review_coverage[key]}')
    if re.fullmatch(r'S\d{2}', section['id']):
        verify(lesson_coverage[key] >= 1, f'{key} missing from lesson slides')

report = {'checks': checks, 'math_checks': math_count, 'answers': len(lookup),
          'days': len(manifest['days']), 'slides': len(slides), 'errors': errors,
          'status': 'pass' if not errors else 'fail'}
target = Path(__file__).with_name('final_link_audit.json')
target.write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({**report, 'errors': errors[:20]}, indent=2))
raise SystemExit(bool(errors))
