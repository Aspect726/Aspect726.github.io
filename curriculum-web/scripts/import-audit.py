"""Audit source arithmetic and original PDF/PPTX references without executing checks."""
import ast
import json
import math
import operator
import statistics
import subprocess
import sys
import zipfile
import xml.etree.ElementTree as ET
from decimal import Decimal
from fractions import Fraction
from pathlib import Path

OPS = {ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul,
       ast.Div: operator.truediv, ast.FloorDiv: operator.floordiv, ast.Mod: operator.mod,
       ast.Pow: operator.pow}
CMPS = {ast.Eq: operator.eq, ast.NotEq: operator.ne, ast.Lt: operator.lt,
        ast.LtE: operator.le, ast.Gt: operator.gt, ast.GtE: operator.ge,
        ast.In: lambda a, b: a in b, ast.NotIn: lambda a, b: a not in b}
FUNCS = {'F': Fraction, 'D': Decimal, 'sorted': sorted, 'abs': abs, 'range': range,
         'all': all, 'min': min, 'max': max, 'ceil': math.ceil, 'gcd': math.gcd,
         'lcm': math.lcm, 'bool': bool, 'len': len, 'set': set, 'sum': sum,
         'median': statistics.median, 'mean': statistics.mean, 'str': str}


def bind(target, value, scope):
    if isinstance(target, ast.Name):
        scope[target.id] = value
    elif isinstance(target, (ast.Tuple, ast.List)):
        for name, val in zip(target.elts, value):
            bind(name, val, scope)
    else:
        raise ValueError('Unsupported comprehension target')


def evaluate(node, scope=None):
    scope = scope or {}
    if isinstance(node, ast.Expression):
        return evaluate(node.body, scope)
    if isinstance(node, ast.Constant):
        return node.value
    if isinstance(node, ast.Name) and node.id in scope:
        return scope[node.id]
    if isinstance(node, ast.Name) and node.id in FUNCS:
        return FUNCS[node.id]
    if isinstance(node, ast.Lambda) and len(node.args.args) == 1 and not node.args.defaults:
        return lambda value: evaluate(node.body, {**scope, node.args.args[0].arg: value})
    if isinstance(node, ast.Attribute):
        if isinstance(node.value, ast.Name) and node.value.id == 'statistics' and node.attr in ('mean', 'median'):
            return getattr(statistics, node.attr)
        if isinstance(node.value, ast.Name) and node.value.id == 'math' and node.attr in ('ceil', 'gcd', 'lcm'):
            return getattr(math, node.attr)
        obj = evaluate(node.value, scope)
        if node.attr == 'count' and isinstance(obj, (list, tuple)):
            return obj.count
        if node.attr == 'quantize' and isinstance(obj, Decimal):
            return obj.quantize
    if isinstance(node, (ast.List, ast.Tuple, ast.Set)):
        values = [evaluate(x, scope) for x in node.elts]
        return tuple(values) if isinstance(node, ast.Tuple) else set(values) if isinstance(node, ast.Set) else values
    if isinstance(node, ast.BinOp) and type(node.op) in OPS:
        left, right = evaluate(node.left, scope), evaluate(node.right, scope)
        if isinstance(node.op, ast.Pow) and abs(right) > 20:
            raise ValueError('Power out of bounds')
        return OPS[type(node.op)](left, right)
    if isinstance(node, ast.UnaryOp):
        val = evaluate(node.operand, scope)
        if isinstance(node.op, ast.USub): return -val
        if isinstance(node.op, ast.UAdd): return +val
        if isinstance(node.op, ast.Not): return not val
    if isinstance(node, ast.BoolOp):
        values = [evaluate(x, scope) for x in node.values]
        return all(values) if isinstance(node.op, ast.And) else any(values)
    if isinstance(node, ast.Compare):
        left = evaluate(node.left, scope)
        for op, comp in zip(node.ops, node.comparators):
            right = evaluate(comp, scope)
            if type(op) not in CMPS or not CMPS[type(op)](left, right): return False
            left = right
        return True
    if isinstance(node, ast.Call):
        args = [evaluate(x, scope) for x in node.args]
        kwargs = {}
        for kw in node.keywords:
            if kw.arg not in ('key', 'reverse'):
                raise ValueError('Keyword unsupported')
            kwargs[kw.arg] = evaluate(kw.value, scope)
        if isinstance(node.func, ast.Name) and node.func.id in FUNCS:
            result = FUNCS[node.func.id](*args, **kwargs)
            if isinstance(result, range) and len(result) > 1000:
                raise ValueError('Range out of bounds')
            return result
        if isinstance(node.func, ast.Attribute):
            return evaluate(node.func, scope)(*args, **kwargs)
    if isinstance(node, (ast.ListComp, ast.GeneratorExp)):
        def walk(i, env):
            if i == len(node.generators):
                yield evaluate(node.elt, env)
                return
            gen = node.generators[i]
            for value in evaluate(gen.iter, env):
                local = dict(env)
                bind(gen.target, value, local)
                if all(evaluate(c, local) for c in gen.ifs):
                    yield from walk(i + 1, local)
        values = list(walk(0, scope))
        if len(values) > 10000: raise ValueError('Comprehension out of bounds')
        return values
    if isinstance(node, ast.Subscript):
        return evaluate(node.value, scope)[evaluate(node.slice, scope)]
    if isinstance(node, ast.Slice):
        return slice(evaluate(node.lower, scope) if node.lower else None,
                     evaluate(node.upper, scope) if node.upper else None,
                     evaluate(node.step, scope) if node.step else None)
    raise ValueError('Unsupported syntax: ' + type(node).__name__)


def audit(source):
    source = Path(source)
    manifest = json.loads((source / 'work/expanded_student_manifest.json').read_text())
    output = source / 'outputs/DoubleAdvanced_Expanded'
    summary = {'arithmeticPassed': 0, 'arithmeticFailed': [], 'arithmeticUnverified': [],
               'packetPagesVerified': 0, 'packetReferenceConflicts': [], 'deckSlideCount': 0,
               'deckSlideTitlesVerified': 0, 'deckReferenceConflicts': [],
               'teacherGuideDaysVerified': 0, 'teacherGuideConflicts': []}
    for day in manifest['days']:
        packet = output / 'Daily_Packets' / Path(day['packet_file']).name
        pages = subprocess.check_output(['pdftotext', '-layout', str(packet), '-'], text=True).split('\f')
        if not pages[-1].strip(): pages.pop()
        if len(pages) != day['pages']:
            summary['packetReferenceConflicts'].append({'day': day['day'], 'kind': 'page-count'})
        else:
            summary['packetPagesVerified'] += len(pages)
        for section in day['sections']:
            for item in section['items']:
                key = f"D{day['day']:03d}-{section['id']}-{item['id']}"
                check = item.get('check')
                if check:
                    try:
                        ok = evaluate(ast.parse(check, mode='eval'))
                        if ok: summary['arithmeticPassed'] += 1
                        else: summary['arithmeticFailed'].append({'id': key, 'check': check})
                    except Exception as exc:
                        summary['arithmeticUnverified'].append({'id': key, 'reason': str(exc)})
                else:
                    summary['arithmeticUnverified'].append({'id': key, 'reason': 'No source check'})
                page = item.get('packet_page', 0)
                if not 1 <= page <= len(pages):
                    summary['packetReferenceConflicts'].append({'id': key, 'page': page, 'kind': 'out-of-range'})
                elif section.get('assigned'):
                    import re
                    label = re.escape(str(item['id']))
                    if not re.search(r'(?<!\w)' + label + r'\.', pages[page - 1]):
                        summary['packetReferenceConflicts'].append({'id': key, 'page': page, 'kind': 'question-label-not-found'})
    for week in range(1, 11):
        guide = output / 'Teacher_Weeks' / f'Week_{week:02d}_Teacher_Guide.pdf'
        guide_text = subprocess.check_output(['pdftotext', '-layout', str(guide), '-'], text=True)
        import re
        normalize = lambda text: re.sub('[^a-z]', '', text.lower())
        for day in (day for day in manifest['days'] if day['week'] == week):
            if f"Day {day['day']:03d}" in guide_text and normalize(day['title']) in normalize(guide_text):
                summary['teacherGuideDaysVerified'] += 1
            else:
                summary['teacherGuideConflicts'].append({'week': week, 'day': day['day'], 'kind': 'guide-day-not-found'})
    with zipfile.ZipFile(output / 'DoubleAdvanced_Weekend_Slides.pptx') as deck:
        import re
        summary['deckSlideCount'] = len([n for n in deck.namelist() if re.fullmatch(r'ppt/slides/slide\d+\.xml', n)])
        metadata = json.loads((source / 'work/expanded_deck_meta.json').read_text())
        normalize = lambda text: re.sub('[^a-z]', '', text.lower())
        for slide in metadata:
            xml = ET.fromstring(deck.read(f"ppt/slides/slide{slide['number']}.xml"))
            text = ' '.join(node.text or '' for node in xml.iter() if node.tag.endswith('}t'))
            if normalize(slide['title']) in normalize(text):
                summary['deckSlideTitlesVerified'] += 1
            else:
                summary['deckReferenceConflicts'].append({'slide': slide['number'], 'kind': 'slide-title-mismatch'})
    return summary


if __name__ == '__main__':
    print(json.dumps(audit(sys.argv[1]), indent=2))
