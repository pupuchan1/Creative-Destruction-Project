"""Export deterministic request/response sequences for Web mocks; never call AI."""
import argparse
import copy
import json

from contract_lab.model import CANDIDATE, RECRUITER, CONTRACTS, Scenario


class Recorder:
    def __init__(self):
        self.model = Scenario()
        self.initial = copy.deepcopy(self.model.s)
        self.steps = []

    def api(self, operation, body=None, actor=CANDIDATE):
        m = self.model
        if body is not None and operation != 'withdrawConsent':
            body = {'expected_revision': m.s['revision'], **body}
        response = m.apply(operation, body, actor=actor, key=f'export-step-{len(self.steps):08d}')
        self.steps.append({'kind':'api','operation':operation,'actor_role':actor.role,
                           'request':body,'response':response,'snapshot':copy.deepcopy(m.s)})
        return response['body']

    def server(self, name, *args, **kwargs):
        result = getattr(self.model, name)(*args, **kwargs)
        self.steps.append({'kind':'server_fixture','action':name,'result':result,
                           'snapshot':copy.deepcopy(self.model.s)})
        return result

    def consent(self):
        p = self.model.s['consent_document']
        self.api('createConsent', {k:p[k] for k in ('policy_id','policy_version','policy_hash')}
                 | {'ai_dialogue_accepted':True,'transcript_processing_accepted':True})

    def finish(self):
        if self.model.s['state'] != 'awaiting_confirmation':
            self.api('submitCommand', {'command':'request_finish'})
        self.api('finishInterview', {'confirmed_transcript_version':self.model.s['transcript_version'],'confirmed':True})

    def data(self, name):
        return {'scenario':name,'contract_version':'0.2.0',
                'notice':'Synthetic offline contract trace. No microphone, AI, login, storage service or real credentials.',
                'initial_snapshot':self.initial,'steps':self.steps,
                'events':copy.deepcopy(self.model.events),
                'final_report':copy.deepcopy(self.model.report)}


def scenarios():
    r = Recorder(); r.consent()
    r.api('submitTextAnswer', {'question_id':'q_experience','text':'担当した期間は5年です。'})
    u = r.model.s['utterances'][0]
    r.api('correctUtterance', {'utterance_id':u['utterance_id'],'expected_utterance_revision':1,
                             'replacement_text':'担当した期間は3年です。','reason':'期間の訂正','confirmed':True})
    r.finish(); r.server('complete_job', copy.deepcopy(r.model.job)); r.api('getReport')
    r.api('reviewReport', {'report_version':1,'outcome':'acknowledge','evidence_checked':True,
                         'corrections_checked':True,'note':'架空の確認'}, actor=RECRUITER)
    yield 'text-correction-review', r.data('text-correction-review')

    r = Recorder(); r.consent(); r.finish()
    r.server('complete_job', copy.deepcopy(r.model.job)); r.api('getReport')
    yield 'empty-interview', r.data('empty-interview')

    r = Recorder(); r.consent()
    c = r.api('createVoiceSession', {'offer_sdp':'NON_FUNCTIONAL_OFFLINE_SDP'})['connection_id']
    r.server('provider_ready', c); r.server('provider_utterance', c, 'evt_gap', '架空の回答')
    r.api('submitCommand', {'command':'request_finish'}); r.server('provider_closed', c, confirmed=False)
    r.finish()  # Intentionally returns FINALIZATION_UNCONFIRMED.
    r.api('reviewFinalizationGap', {'transcript_version':1,'gap_note':'候補者と欠落を確認',
                                   'candidate_follow_up_checked':True,'confirmed':True}, actor=RECRUITER)
    r.finish(); r.server('complete_job', copy.deepcopy(r.model.job)); r.api('getReport')
    yield 'gap-human-review', r.data('gap-human-review')

    r = Recorder(); r.consent()
    r.api('submitTextAnswer', {'question_id':'q_experience','text':'架空の回答'})
    r.finish(); old_job = copy.deepcopy(r.model.job)
    r.api('withdrawConsent', {'request_deletion':True,'confirmed':True})
    r.server('complete_job', old_job)  # Must be discarded.
    r.server('purge', provider_deleted=False); r.api('getDeletionStatus')
    r.server('purge', provider_deleted=True); r.api('getDeletionStatus')
    yield 'withdrawal-deletion', r.data('withdrawal-deletion')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    check = parser.parse_args().check
    directory = CONTRACTS / 'scenarios'
    if not check:
        directory.mkdir(exist_ok=True)
    for name, data in scenarios():
        content = json.dumps(data, ensure_ascii=False, indent=2)+'\n'
        target = directory / (name+'.json')
        if check:
            if not target.exists() or target.read_text() != content:
                raise SystemExit(f'Stale scenario: {name}')
        else:
            target.write_text(content)
    print('Four deterministic Web scenarios are current.' if check else 'Exported four deterministic Web scenarios.')
