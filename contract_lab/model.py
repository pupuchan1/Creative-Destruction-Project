"""Executable design for state, authorization scope and concurrency invariants.

Actors are trusted test fixtures, NOT authenticated users. This module has no
network, database, JWT/CSRF implementation, microphone or model integration.
"""
import copy
import json
from dataclasses import dataclass
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parents[1]
CONTRACTS = ROOT / 'contracts'
API = json.loads((CONTRACTS / 'openapi.json').read_text())
OPERATIONS = {op['operationId']: op for path in API['paths'].values()
              for method, op in path.items() if method in {'get', 'post'}}
REPORT = json.loads((CONTRACTS / 'report.schema.json').read_text())
EVENTS = json.loads((CONTRACTS / 'events.schema.json').read_text())
TIME = '2026-10-22T12:00:00Z'


def validator(schema):
    return Draft202012Validator({**schema, 'components': API['components']},
                                format_checker=FormatChecker())


@dataclass(frozen=True)
class Actor:
    subject: str
    tenant: str = 'tenant_demo'
    role: str = 'candidate'
    active: bool = True


CANDIDATE = Actor('candidate_demo')
RECRUITER = Actor('recruiter_demo', role='recruiter')
ADMIN = Actor('admin_demo', role='tenant_admin')


class Rejected(Exception):
    def __init__(self, status, code):
        self.status, self.code = status, code


def require(condition, code='INVALID_STATE', status=409):
    if not condition:
        raise Rejected(status, code)


def report_semantics(report, snapshot):
    """Validate provenance and completeness, not the truth of generated prose."""
    Draft202012Validator(REPORT, format_checker=FormatChecker()).validate(report)
    require(report['interview_id'] == snapshot['interview_id'], 'WRONG_INTERVIEW')
    require(report['transcript_version'] == snapshot['transcript_version'], 'STALE_REPORT')
    plan = {q['question_id'] for q in snapshot['template']['content']['questions']}
    results = report['content']['questions']
    require(len(results) == len(plan) and {q['question_id'] for q in results} == plan,
            'QUESTION_COVERAGE_INVALID')
    sources = {u['utterance_id']: u for u in snapshot['utterances']}

    def evidence_check(evidence, question_id=None):
        require(bool(evidence), 'EVIDENCE_REQUIRED')
        for item in evidence:
            source = sources.get(item['utterance_id'])
            require(source is not None and source['speaker'] == 'candidate', 'EVIDENCE_NOT_CANDIDATE')
            require(source['utterance_revision'] == item['utterance_revision'], 'STALE_EVIDENCE')
            require(item['quote'] in source['text'], 'QUOTE_NOT_CANONICAL')
            if question_id is not None:
                require(source['question_id'] == question_id, 'WRONG_QUESTION_EVIDENCE')

    for question in results:
        if question['status'] == 'unconfirmed':
            require(question['summary'] == '' and question['evidence'] == [], 'UNCONFIRMED_HAS_FACTS')
        else:
            require(bool(question['summary'].strip()), 'SUMMARY_REQUIRED')
            evidence_check(question['evidence'], question['question_id'])
    for question in report['content']['candidate_questions']:
        evidence_check(question['evidence'])
    if snapshot['gaps']:
        require(bool(report['content']['limitations']), 'GAP_DISCLOSURE_REQUIRED')


class Scenario:
    def __init__(self):
        self.s = json.loads((CONTRACTS / 'fixtures/interview.json').read_text())
        self.s.update(state='awaiting_consent', revision=1, transcript_version=0,
                      generation=1, last_seq=0, consent_active=False,
                      active_connection_id=None, utterances=[], report_status='none',
                      current_question_id='q_experience', finalization_confirmed=False,
                      finalization_review_id=None, finalization_review_transcript_version=None, gaps=[])
        self.events, self.audit, self.trace = [], [], []
        self.replays, self.seen, self.connections = {}, set(), {}
        self.job, self.report, self.deletion = None, None, None
        self.confirmed_version, self.review = None, None
        self.counter, self.report_counter = 0, 0
        self.deleted = False
        self.tenant = 'tenant_demo'
        self.assigned = {RECRUITER.subject}

    def identifier(self, prefix):
        self.counter += 1
        return f'{prefix}_{self.counter}'

    def emit(self, kind, data):
        self.s['last_seq'] += 1
        event = dict(schema_version='1.0', seq=self.s['last_seq'],
                     interview_id=self.s['interview_id'], occurred_at=TIME,
                     revision=self.s['revision'], transcript_version=self.s['transcript_version'],
                     generation=self.s['generation'], type=kind, data=copy.deepcopy(data))
        Draft202012Validator(EVENTS).validate(event)
        self.events.append(event)

    def changed(self, reason):
        self.s['revision'] += 1
        self.emit('interview.updated', dict(state=self.s['state'], reason=reason,
                                           finalization_confirmed=self.s['finalization_confirmed']))

    def scope(self, actor, operation):
        require(actor.active, 'AUTH_REQUIRED', 401)
        require(actor.tenant == self.tenant, 'NOT_FOUND', 404)
        role = actor.role
        if role == 'candidate':
            require(actor.subject == CANDIDATE.subject, 'NOT_FOUND', 404)
            allowed = 'candidate_self' in OPERATIONS[operation]['x-roles']
        elif role == 'recruiter':
            require(actor.subject in self.assigned, 'NOT_FOUND', 404)
            require(not (self.s['state'] == 'cancelled' and not self.s['consent_active']),
                    'CONSENT_WITHDRAWN', 403)
            allowed = 'assigned_recruiter' in OPERATIONS[operation]['x-roles']
        else:
            allowed = role == 'tenant_admin' and 'tenant_admin' in OPERATIONS[operation]['x-roles']
        require(allowed, 'FORBIDDEN', 403)
        require(not self.deleted or operation == 'getDeletionStatus', 'NOT_FOUND', 404)

    def apply(self, operation, body=None, *, actor=CANDIDATE, key=None,
              origin_valid=True, csrf_valid=True):
        """Return an application-contract response. Guards simulate trusted boundary results."""
        body = copy.deepcopy(body)
        before = self.s['last_seq']
        try:
            require(operation in self.supported, 'NOT_IMPLEMENTED_IN_LAB', 503)
            self.scope(actor, operation)  # Never replay before authorization/expiry checks.
            spec = OPERATIONS[operation]
            mutation = 'requestBody' in spec
            if mutation:
                require(origin_valid and csrf_valid, 'CSRF_REJECTED', 403)
                require(isinstance(key, str) and 16 <= len(key) <= 128, 'IDEMPOTENCY_KEY_REQUIRED', 422)
                schema = spec['requestBody']['content']['application/json']['schema']
                require(validator(schema).is_valid(body), 'INVALID_INPUT', 422)
                require(self.s['state'] != 'cancelled' or operation in {'withdrawConsent', 'requestDeletion'},
                        'INTERVIEW_REVOKED')
                cache_key = (actor.subject, operation, key)
                canonical = json.dumps(body, sort_keys=True, ensure_ascii=False, separators=(',', ':'))
                cached = self.replays.get(cache_key)
                if cached:
                    require(cached[0] == canonical, 'IDEMPOTENCY_CONFLICT')
                    return copy.deepcopy(cached[1])
                safety = operation == 'withdrawConsent' or (
                    operation == 'submitCommand' and body['command'] in {'pause', 'cancel', 'request_human'})
                if 'expected_revision' in body and not safety:
                    require(body['expected_revision'] == self.s['revision'], 'REVISION_CONFLICT')
            status, data = self.dispatch(operation, body or {}, actor)
            response = {'status': status, 'body': copy.deepcopy(data)}
            self.validate_response(operation, response)
            if mutation:
                self.replays[cache_key] = (canonical, copy.deepcopy(response))
        except Rejected as error:
            response = {'status': error.status, 'body': {'error': {
                'code': error.code, 'message': '操作を確認してください。',
                'request_id': 'req_offline', 'retryable': False,
                'current_revision': self.s['revision'] if error.status == 409 else None}}}
        self.trace.append({'operation': operation, 'actor_role': actor.role,
                           'request': body, 'response': copy.deepcopy(response),
                           'events': copy.deepcopy([e for e in self.events if e['seq'] > before])})
        return response

    @staticmethod
    def validate_response(operation, response):
        schema = OPERATIONS[operation]['responses'][str(response['status'])]['content']['application/json']['schema']
        if schema.get('$ref') == './report.schema.json':
            Draft202012Validator(REPORT).validate(response['body'])
        else:
            validator(schema).validate(response['body'])

    @property
    def supported(self):
        return {'getInterview', 'getReport', 'getDeletionStatus', 'createConsent',
                'createVoiceSession', 'submitTextAnswer', 'submitCommand', 'correctUtterance',
                'reviewFinalizationGap', 'finishInterview', 'reviewReport', 'withdrawConsent', 'requestDeletion'}

    def dispatch(self, op, body, actor):
        if op == 'getInterview':
            return 200, self.s
        if op == 'getReport':
            if self.report is not None:
                return 200, self.report
            require(self.job is not None, 'REPORT_NOT_REQUESTED', 404)
            return 202, self.job['public']
        if op == 'getDeletionStatus':
            require(self.deletion is not None, 'NOT_FOUND', 404)
            return 200, self.deletion
        if op == 'createConsent':
            require(self.s['state'] == 'awaiting_consent')
            policy = self.s['consent_document']
            require(all(body[k] == policy[k] for k in ('policy_id', 'policy_version', 'policy_hash')),
                    'POLICY_CHANGED')
            self.s.update(consent_active=True, state='ready')
            self.changed('consented')
            return 201, self.s
        if op == 'withdrawConsent':
            if self.s['state'] != 'cancelled':
                self.revoke('consent_withdrawn')
            self.s['consent_active'] = False
            ticket = self.start_deletion() if body['request_deletion'] else None
            return 202, dict(state='cancelled', revision=self.s['revision'],
                             processing_stopped=self.s['active_connection_id'] is None,
                             deletion_request_id=ticket['request_id'] if ticket else None)
        if op == 'requestDeletion':
            self.revoke('deletion_requested')
            self.s['consent_active'] = False
            return 202, self.start_deletion()
        if op == 'submitCommand':
            return self.command(body['command'])
        require(self.s['consent_active'], 'CONSENT_REQUIRED')
        if op == 'createVoiceSession':
            require(self.s['active_connection_id'] is None, 'VOICE_ALREADY_ACTIVE')
            require(self.s['state'] == 'ready')
            connection = self.identifier('vc')
            self.connections[connection] = {'generation': self.s['generation'], 'closed': False}
            self.s.update(active_connection_id=connection, state='connecting', finalization_confirmed=False)
            self.changed('connecting')
            return 201, dict(connection_id=connection, answer_sdp='NON_FUNCTIONAL_OFFLINE_SDP',
                             revision=self.s['revision'], generation=self.s['generation'])
        if op == 'submitTextAnswer':
            require(self.s['state'] in {'ready', 'active', 'paused', 'awaiting_confirmation'})
            require(self.s['active_connection_id'] is None, 'VOICE_MUST_PAUSE_FIRST')
            require(body['question_id'] in {q['question_id'] for q in self.s['template']['content']['questions']},
                    'UNKNOWN_QUESTION', 422)
            if self.s['state'] == 'ready':
                self.s['state'] = 'active'
            self.add_utterance(body['text'], body['question_id'])
            return 201, self.s
        if op == 'correctUtterance':
            require(self.s['state'] in {'ready', 'active', 'paused', 'awaiting_confirmation',
                                       'finalizing', 'review_pending', 'reviewed'})
            target = next((u for u in self.s['utterances'] if u['utterance_id'] == body['utterance_id']), None)
            require(target is not None and target['speaker'] == 'candidate', 'NOT_FOUND', 404)
            require(target['utterance_revision'] == body['expected_utterance_revision'], 'UTTERANCE_CONFLICT')
            self.audit.append(copy.deepcopy(target))
            old_report = self.report['report_version'] if self.report else None
            target.update(text=body['replacement_text'], status='corrected',
                          utterance_revision=target['utterance_revision'] + 1)
            self.content_changed('candidate_correction')
            self.emit('correction.applied', dict(correction_id=self.identifier('cor'),
                utterance_id=target['utterance_id'], utterance_revision=target['utterance_revision'],
                invalidated_report_version=old_report))
            self.emit('transcript.updated', target)
            return 200, self.s
        if op == 'reviewFinalizationGap':
            require(self.s['state'] == 'awaiting_confirmation' and self.s['active_connection_id'] is None)
            require(bool(self.s['gaps']) and body['transcript_version'] == self.s['transcript_version'], 'STALE_GAP_REVIEW')
            self.s.update(finalization_review_id=self.identifier('gapreview'),
                          finalization_review_transcript_version=self.s['transcript_version'])
            self.changed('gap_reviewed_by_human')
            return 201, self.s
        if op == 'finishInterview':
            require(self.s['state'] == 'awaiting_confirmation' and self.s['active_connection_id'] is None)
            require(body['confirmed_transcript_version'] == self.s['transcript_version'], 'TRANSCRIPT_CHANGED')
            reviewed = (self.s['finalization_review_id'] is not None and
                        self.s['finalization_review_transcript_version'] == self.s['transcript_version'])
            require(not self.s['gaps'] or reviewed, 'FINALIZATION_UNCONFIRMED')
            require(not self.connections or self.s['finalization_confirmed'] or reviewed,
                    'FINALIZATION_UNCONFIRMED')
            self.confirmed_version = self.s['transcript_version']
            public = dict(operation_id=self.identifier('job'), status='queued',
                          transcript_version=self.confirmed_version, poll_after_ms=1000)
            self.job = dict(public=public, generation=self.s['generation'],
                            transcript_version=self.confirmed_version, completed=False)
            self.s.update(state='finalizing', report_status='generating')
            self.changed('report_requested')
            self.emit('report.updated', dict(status='generating', report_version=None))
            return 202, public
        if op == 'reviewReport':
            require(self.s['state'] in {'review_pending', 'reviewed'} and self.report is not None)
            require(body['report_version'] == self.report['report_version'] and
                    self.report['transcript_version'] == self.s['transcript_version'] and
                    self.report['review_status'] != 'stale', 'STALE_REPORT')
            accepted = body['outcome'] == 'acknowledge'
            self.report['review_status'] = 'reviewed' if accepted else 'draft'
            self.s.update(state='reviewed' if accepted else 'review_pending',
                          report_status='reviewed' if accepted else 'draft')
            self.changed('human_review')
            self.review = dict(review_id=self.identifier('review'), report_version=body['report_version'],
                               outcome=body['outcome'], reviewed_at=TIME, revision=self.s['revision'])
            return 201, self.review
        raise Rejected(503, 'NOT_IMPLEMENTED_IN_LAB')

    def command(self, command):
        if command == 'cancel':
            self.revoke('candidate_cancelled')
        elif command == 'request_human':
            self.s['human_requested'] = True
            self.changed('human_requested')
        elif command == 'pause':
            require(self.s['state'] in {'ready', 'connecting', 'active', 'paused'})
            self.s['state'] = 'paused'
            self.s['generation'] += 1
            self.changed('paused')
        elif command == 'resume':
            require(self.s['state'] == 'paused' and self.s['active_connection_id'] is None)
            require(self.s['consent_active'], 'CONSENT_REQUIRED')
            self.s['state'] = 'ready'
            self.s['generation'] += 1
            self.changed('resume_ready')
        elif command == 'request_finish':
            require(self.s['consent_active'], 'CONSENT_REQUIRED')
            require(self.s['state'] in {'ready', 'active', 'paused'})
            self.s['state'] = 'awaiting_confirmation'
            self.changed('finish_requested')
        return 202, self.s

    def revoke(self, reason):
        self.s.update(state='cancelled', generation=self.s['generation'] + 1)
        self.confirmed_version = None
        self.changed(reason)

    def content_changed(self, reason):
        self.s['transcript_version'] += 1
        self.s['generation'] += 1
        self.s.update(finalization_review_id=None, finalization_review_transcript_version=None)
        self.confirmed_version, self.review = None, None
        if self.s['state'] in {'finalizing', 'review_pending', 'reviewed'}:
            self.s['state'] = 'awaiting_confirmation'
        if self.report:
            self.report['review_status'] = 'stale'
            self.s['report_status'] = 'stale'
        elif self.s['report_status'] == 'generating':
            self.s['report_status'] = 'none'
        self.changed(reason)

    def add_utterance(self, text, question, *, connection=None, start=0, end=1000):
        u = dict(utterance_id=self.identifier('ut'), utterance_revision=1, speaker='candidate',
                 text=text, status='provisional' if connection else 'confirmed',
                 question_id=question, source='voice' if connection else 'text',
                 connection_id=connection, start_ms=start if connection else None,
                 end_ms=end if connection else None)
        self.s['utterances'].append(u)
        self.content_changed('utterance_added')
        answered = {v['question_id'] for v in self.s['utterances']}
        self.s['current_question_id'] = next((q['question_id'] for q in self.s['template']['content']['questions']
                                               if q['question_id'] not in answered), None)
        self.emit('transcript.updated', u)

    def provider_ready(self, connection):
        require(self.s['active_connection_id'] == connection and self.s['state'] == 'connecting')
        self.s['state'] = 'active'
        self.changed('voice_ready')
        self.emit('voice.ready', {'connection_id': connection})

    def provider_utterance(self, connection, event_id, text, question='q_experience', start=0, end=1000):
        """Inject synthetic, preassembled ASR output. This is NOT a Live adapter."""
        require(connection in self.connections, 'UNKNOWN_CONNECTION')
        require(start <= end and start >= 0, 'INVALID_TIMELINE', 422)
        identity = (connection, event_id)
        if identity in self.seen or not self.s['consent_active'] or self.s['state'] == 'cancelled' or self.deleted:
            return False
        self.seen.add(identity)
        self.emit('transcript.fragment', dict(fragment_id=event_id, connection_id=connection,
                  speaker='candidate', delta=text, start_ms=start, end_ms=end))
        self.add_utterance(text, question, connection=connection, start=start, end=end)
        return True

    def provider_closed(self, connection, confirmed=True, seconds=1):
        require(connection in self.connections, 'UNKNOWN_CONNECTION')
        if self.connections[connection]['closed']:
            return False
        self.connections[connection]['closed'] = True
        if self.s['active_connection_id'] == connection:
            self.s['active_connection_id'] = None
            self.s['finalization_confirmed'] = confirmed
            if self.s['state'] in {'connecting', 'active'}:
                self.s['state'] = 'paused'
        if not confirmed:
            self.s['gaps'].append({'connection_id': connection, 'reason': 'transport_lost'})
            self.s.update(finalization_review_id=None, finalization_review_transcript_version=None)
            self.emit('gap_detected', dict(connection_id=connection, reason='transport_lost', recoverable=True))
        self.changed('voice_closed')
        self.emit('voice.closed', dict(connection_id=connection, finalization_confirmed=confirmed,
                                      reason='close_requested' if confirmed else 'transport_lost',
                                      usage_seconds=seconds if confirmed else None))
        return True

    def draft(self):
        """Deterministic fixture assembly, never an AI-generated summary."""
        questions = []
        for q in self.s['template']['content']['questions']:
            answers = [u for u in self.s['utterances'] if u['question_id'] == q['question_id'] and u['speaker'] == 'candidate']
            evidence = [dict(utterance_id=u['utterance_id'], utterance_revision=u['utterance_revision'], quote=u['text']) for u in answers]
            questions.append(dict(question_id=q['question_id'], status='answered' if evidence else 'unconfirmed',
                                   summary=' / '.join(u['text'] for u in answers), evidence=evidence))
        return dict(schema_version='1.0', interview_id=self.s['interview_id'],
                    report_version=self.report_counter + 1, transcript_version=self.s['transcript_version'],
                    generated_at=TIME, model='offline-fixture', prompt_version='no-model', review_status='draft',
                    content=dict(questions=questions, follow_up=[], candidate_questions=[],
                                 limitations=['音声欠落を人が確認した。'] if self.s['gaps'] else []))

    def complete_job(self, job, report=None):
        if (self.deleted or not self.s['consent_active'] or self.s['state'] != 'finalizing'
            or job['generation'] != self.s['generation']
            or job['transcript_version'] != self.confirmed_version
            or not self.job or job['public']['operation_id'] != self.job['public']['operation_id']
            or self.job['completed']):
            return False
        candidate = copy.deepcopy(report) if report is not None else self.draft()
        report_semantics(candidate, self.s)
        require(candidate['report_version'] == self.report_counter + 1, 'REPORT_VERSION_CONFLICT')
        self.report, self.report_counter = candidate, candidate['report_version']
        self.job['completed'] = True
        self.s.update(state='review_pending', report_status='draft')
        self.changed('report_stored')
        self.emit('report.updated', dict(status='draft', report_version=self.report_counter))
        return True

    def replay(self, after_seq, actor=CANDIDATE, oldest_seq=0):
        self.scope(actor, 'streamInterviewEvents')
        require(isinstance(after_seq, int) and 0 <= after_seq <= self.s['last_seq'], 'INVALID_CURSOR', 422)
        require(after_seq >= oldest_seq, 'REPLAY_EXPIRED', 410)
        return copy.deepcopy([e for e in self.events if e['seq'] > after_seq])

    def start_deletion(self):
        if not self.deletion:
            self.deletion = dict(request_id=self.identifier('del'), status='queued', requested_at=TIME,
                                 completed_at=None, app_data_deleted=False, provider_state_deleted=False,
                                 backup_expiry_at=None, retained_categories=['本文を含まない削除監査'])
        return self.deletion

    def purge(self, provider_deleted=False):
        require(self.deletion is not None and self.s['state'] == 'cancelled')
        # All secondary caches are personal-data stores too.
        self.s['utterances'] = []
        self.events.clear()
        self.audit.clear()
        self.trace.clear()
        self.replays.clear()
        self.seen.clear()
        self.connections.clear()
        self.report, self.job, self.review = None, None, None
        self.s['active_connection_id'] = None
        self.deleted = True
        self.deletion.update(status='completed' if provider_deleted else 'blocked',
                             completed_at=TIME if provider_deleted else None,
                             app_data_deleted=True, provider_state_deleted=provider_deleted,
                             backup_expiry_at='2026-11-26T12:00:00Z')
