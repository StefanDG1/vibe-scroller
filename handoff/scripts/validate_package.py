"""Validate handoff integrity. Does not test the future application."""
from __future__ import annotations
import json, re, subprocess, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
errors=[]
required=['README.md','AGENTS.md','IMPLEMENTATION-PROMPT.md','docs/PRD.md','docs/START-HERE.md','docs/DASHBOARD-AND-MOBILE-UX.md','docs/REQUIREMENTS-MAP.md','docs/LAUNCH-CHECKLIST.md','legal/TERMS.md','legal/PRIVACY.md','finance/assumptions.json','finance/calculate.py','contracts/insight.schema.json','contracts/proposal.schema.json','contracts/runner-job.schema.json']
for name in required:
    if not (ROOT/name).is_file(): errors.append('Missing '+name)
for path in ROOT.rglob('*.json'):
    try: json.loads(path.read_text(encoding='utf-8'))
    except Exception as exc: errors.append(f'Invalid JSON {path.relative_to(ROOT)}: {exc}')
md_files=[p for p in ROOT.rglob('*.md') if p.name!='ALL-DOCUMENTS.md']
for path in md_files:
    text=path.read_text(encoding='utf-8')
    if '\u2014' in text: errors.append(f'Em dash in {path.relative_to(ROOT)}')
    if text.count('```')%2: errors.append(f'Unclosed code fence: {path.relative_to(ROOT)}')
    for target in re.findall(r'\[[^\]]*\]\(([^)]+)\)',text):
        target=target.split('#',1)[0]
        if not target or re.match(r'^[a-z][a-z0-9+.-]*:',target,re.I): continue
        target=target.split(' "',1)[0]
        resolved=(path.parent/target).resolve()
        if not resolved.is_relative_to(ROOT): errors.append(f'Link escapes package: {path.name}: {target}')
        elif not resolved.exists(): errors.append(f'Broken link: {path.relative_to(ROOT)} -> {target}')
req=(ROOT/'docs/REQUIREMENTS-MAP.md').read_text()
for i in range(1,37):
    line=next((l for l in req.splitlines() if l.startswith(f'| R{i:02d} |')),None)
    if not line or 'WP' not in line or 'AC' not in line: errors.append(f'Requirement R{i:02d} lacks traceability')
prices=json.loads((ROOT/'contracts/pricing.json').read_text())
assumptions=json.loads((ROOT/'finance/assumptions.json').read_text())
if prices['tiers']!=assumptions['tiers']: errors.append('Catalogue differs between contract and finance model')
# Core fixture state invariants, independent of future UI implementation.
dash=json.loads((ROOT/'fixtures/dashboard.json').read_text())
assert dash['fixture'] is True
for source in dash['sources']:
    merged={pr['providerId'] for pr in source['pullRequests'] if pr['mergedAt'] is not None}
    if source['id']=='src_demo_001' and len(merged)!=1: errors.append('Mixed PR fixture must have exactly one merged PR')
    if source['id']=='src_demo_003' and merged: errors.append('Closed-unmerged fixture is incorrectly merged')
    if source['benefit']!='not_measured': errors.append('Fixture must not infer benefit from merge')
# Schema validation is run when the optional jsonschema package is present.
try:
    import jsonschema
except ImportError:
    print('Schema library unavailable. JSON syntax and semantic fixture checks ran; full JSON Schema validation skipped.')
else:
    for name in ('insight','proposal','runner-job'):
        schema=json.loads((ROOT/f'contracts/{name}.schema.json').read_text())
        fixture=json.loads((ROOT/f'fixtures/{name}.json').read_text())
        try:
            jsonschema.Draft202012Validator.check_schema(schema)
            jsonschema.validate(fixture,schema)
            altered=dict(fixture,unauthorizedExtra='reject this')
            try: jsonschema.validate(altered,schema)
            except jsonschema.ValidationError: pass
            else: errors.append(f'{name} schema accepts extra properties')
        except Exception as exc: errors.append(f'{name} schema validation: {exc}')
    print('All three schema examples validated; unknown-property rejection checked.')
proc=subprocess.run([sys.executable,str(ROOT/'finance/test_model.py')],cwd=ROOT,capture_output=True,text=True)
if proc.returncode: errors.append('Finance tests failed: '+proc.stdout+proc.stderr)
else: print('Finance invariant tests passed.')
if errors:
    print('\n'.join(errors));sys.exit(1)
print(f'Package checks passed: {len(md_files)} Markdown files, JSON syntax, local links, 36 requirement mappings, catalogue consistency, and fixture invariants.')
