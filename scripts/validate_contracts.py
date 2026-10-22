"""Offline contract checks; no OpenAI calls or application runtime tests."""
import copy
import hashlib
import json
import re
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker
from openapi_spec_validator import validate

ROOT = Path(__file__).resolve().parents[1]
C = ROOT / 'contracts'


def read(path):
    return json.loads(path.read_text())


api = read(C / 'openapi.json')
validate(api, base_uri=(C / 'openapi.json').as_uri())
operations = [op for path in api['paths'].values() for method, op in path.items()
              if method in {'get', 'post', 'put', 'patch', 'delete'}]
assert len({op['operationId'] for op in operations}) == len(operations)


def app_validator(name):
    return Draft202012Validator(
        {'$ref': '#/components/schemas/' + name, 'components': api['components']},
        format_checker=FormatChecker())


manifest = read(C / 'fixtures/manifest.json')
for item in manifest:
    app_validator(item['schema']).validate(read(C / 'fixtures' / item['file']))

event_schema = read(C / 'events.schema.json')
report_schema = read(C / 'report.schema.json')
for schema in [event_schema, report_schema]:
    Draft202012Validator.check_schema(schema)
events = read(C / 'fixtures/events.json')
event_validator = Draft202012Validator(event_schema, format_checker=FormatChecker())
for event in events:
    event_validator.validate(event)
assert [e['seq'] for e in events] == sorted({e['seq'] for e in events})

report = read(C / 'fixtures/report.json')
report_validator = Draft202012Validator(report_schema, format_checker=FormatChecker())
report_validator.validate(report)
snapshot = read(C / 'fixtures/correction-response.json')
policy = snapshot['consent_document']
canonical = json.dumps({k:v for k,v in policy.items() if k != 'policy_hash'},
                       ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()
assert hashlib.sha256(canonical).hexdigest() == policy['policy_hash']
utterances = {u['utterance_id']: u for u in snapshot['utterances']}
assert report['transcript_version'] == snapshot['transcript_version']
for question in report['content']['questions']:
    if question['status'] == 'unconfirmed':
        assert question['summary'] == '' and question['evidence'] == []
    else:
        assert question['evidence'], 'Factual summary requires evidence'
    for evidence in question['evidence']:
        source = utterances[evidence['utterance_id']]
        assert source['utterance_revision'] == evidence['utterance_revision']
        assert evidence['quote'] in source['text'], 'Quote must use canonical corrected text'

# These checks reject dangerous contract shapes; runtime authorization is separate.
bad = copy.deepcopy(report)
bad['hire_score'] = 90
assert not report_validator.is_valid(bad)
bad = read(C / 'fixtures/consent-request.json')
bad['ai_dialogue_accepted'] = False
assert not app_validator('ConsentCreate').is_valid(bad)
bad = read(C / 'fixtures/correction-request.json')
bad['confirmed'] = False
assert not app_validator('CorrectionCreate').is_valid(bad)
bad = copy.deepcopy(events[0])
bad['type'] = 'hire.approved'
assert not event_validator.is_valid(bad)

provider = read(C / 'provider-examples.json')
live = provider['live_create']['body']['session']
assert live['store'] is False
assert live['client']['data_channel']['allowed_client_events'] == []
assert provider['agents_create']['body']['environment']['type'] == 'none'
assert provider['responses_report']['body']['store'] is False
assert provider['responses_report']['body']['text']['format']['schema'] == report_schema['properties']['content']

scenario_count = 0
for path in (C / 'scenarios').glob('*.json'):
    scenario = read(path)
    app_validator('InterviewSnapshot').validate(scenario['initial_snapshot'])
    for step in scenario['steps']:
        app_validator('InterviewSnapshot').validate(step['snapshot'])
        if step['kind'] == 'api':
            operation = next(op for op in operations if op['operationId'] == step['operation'])
            if 'requestBody' in operation:
                schema = operation['requestBody']['content']['application/json']['schema']
                Draft202012Validator({**schema,'components':api['components']}).validate(step['request'])
            schema = operation['responses'][str(step['response']['status'])]['content']['application/json']['schema']
            if schema.get('$ref') == './report.schema.json':
                report_validator.validate(step['response']['body'])
            else:
                Draft202012Validator({**schema,'components':api['components']}).validate(step['response']['body'])
    for event in scenario['events']:
        event_validator.validate(event)
    if scenario['final_report'] is not None:
        report_validator.validate(scenario['final_report'])
    scenario_count += 1
assert scenario_count == 4, 'Expected four executable Web scenarios'
intent_cases = read(C / 'evaluations/dialogue-intents.json')['cases']
allowed_intents = {c['value'] for c in provider['decisions']['body']['questions'][0]['choices']}
assert len({c['id'] for c in intent_cases}) == len(intent_cases)
for case in intent_cases:
    assert set(case['expected']) <= allowed_intents and case['expected']
    assert case['must_not_finalize'] is True

links = 0
for md in ROOT.rglob('*.md'):
    for target in re.findall(r'\]\(([^)]+)\)', md.read_text()):
        if '://' in target or target.startswith('#'):
            continue
        assert (md.parent / target.split('#')[0]).exists(), f'Broken local link: {md}: {target}'
        links += 1

print(f'PASS: OpenAPI {len(api["paths"])} paths / {len(operations)} operations; '
      f'{len(manifest)} request/response fixtures; {len(events)} SSE events; '
      f'report evidence; 4 invalid-shape checks; provider-template consistency; '
      f'{scenario_count} Web scenarios; {len(intent_cases)} evaluation cases (not model-run); '
      f'consent hash; {links} local links.')
print('NOT TESTED: live APIs, microphone audio, latency, billing, auth/RLS/CSRF, deletion, E2E.')
