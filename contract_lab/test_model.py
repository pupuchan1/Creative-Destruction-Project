import copy
import json
import unittest

from contract_lab.model import (ADMIN, CANDIDATE, RECRUITER, Actor, Rejected,
                                Scenario, report_semantics)


class ContractBehavior(unittest.TestCase):
    def setUp(self):
        self.m = Scenario()
        self.index = 0

    def call(self, op, body=None, actor=CANDIDATE, status=200, key=None, **kw):
        self.index += 1
        if body is not None and 'expected_revision' not in body and op != 'withdrawConsent':
            body = {'expected_revision': self.m.s['revision'], **body}
        response = self.m.apply(op, body, actor=actor, key=key or f'offline-action-{self.index:05d}', **kw)
        self.assertEqual(response['status'], status, response)
        self.m.validate_response(op, response)
        return response['body']

    def consent(self):
        p = self.m.s['consent_document']
        return self.call('createConsent', {k: p[k] for k in ('policy_id', 'policy_version', 'policy_hash')}
                         | {'ai_dialogue_accepted': True, 'transcript_processing_accepted': True}, status=201)

    def answer(self, text='担当期間は3年です。'):
        return self.call('submitTextAnswer', {'question_id': 'q_experience', 'text': text}, status=201)

    def finish(self):
        if self.m.s['state'] != 'awaiting_confirmation':
            self.call('submitCommand', {'command': 'request_finish'}, status=202)
        return self.call('finishInterview', {'confirmed_transcript_version': self.m.s['transcript_version'], 'confirmed': True}, status=202)

    def correction(self, text='担当期間は4年です。'):
        u = self.m.s['utterances'][0]
        return self.call('correctUtterance', {'utterance_id': u['utterance_id'],
                         'expected_utterance_revision': u['utterance_revision'],
                         'replacement_text': text, 'reason': '本人訂正', 'confirmed': True})

    def voice(self):
        c = self.call('createVoiceSession', {'offer_sdp': 'OFFLINE_NONFUNCTIONAL'}, status=201)['connection_id']
        self.m.provider_ready(c)
        return c

    def review(self):
        return self.call('reviewReport', {'report_version': self.m.report['report_version'],
                         'outcome': 'acknowledge', 'evidence_checked': True,
                         'corrections_checked': True, 'note': '架空の記録確認'}, actor=RECRUITER, status=201)

    def test_complete_text_flow_and_human_review(self):
        self.consent(); self.answer(); self.finish()
        self.assertTrue(self.m.complete_job(copy.deepcopy(self.m.job)))
        report = self.call('getReport')
        self.assertEqual(report['content']['questions'][1]['status'], 'unconfirmed')
        self.review()
        self.assertEqual(self.m.s['state'], 'reviewed')
        self.assertNotIn('hire_score', self.m.report)

    def test_empty_interview_can_finish_without_forced_answers(self):
        self.consent(); self.finish()
        self.assertTrue(self.m.complete_job(copy.deepcopy(self.m.job)))
        self.assertEqual(self.m.report['transcript_version'], 0)
        self.assertTrue(all(q['status'] == 'unconfirmed' for q in self.m.report['content']['questions']))

    def test_voice_and_answer_require_consent(self):
        self.call('createVoiceSession', {'offer_sdp': 'OFFLINE'}, status=409)
        self.call('submitTextAnswer', {'question_id': 'q_experience', 'text': '架空'}, status=409)
        self.assertFalse(self.m.connections)

    def test_policy_hash_mismatch_and_false_consent_do_not_mutate(self):
        initial = copy.deepcopy(self.m.s)
        p = self.m.s['consent_document']
        body = dict(policy_id=p['policy_id'], policy_version=p['policy_version'], policy_hash='b'*64,
                    ai_dialogue_accepted=True, transcript_processing_accepted=True)
        self.call('createConsent', body, status=409)
        body.update(policy_hash=p['policy_hash'], ai_dialogue_accepted=False)
        self.call('createConsent', body, status=422)
        self.assertEqual(self.m.s, initial)

    def test_scope_is_checked_for_every_supported_operation(self):
        initial = copy.deepcopy(self.m.s)
        outsiders = [Actor('other_candidate'), Actor(CANDIDATE.subject, tenant='other_tenant'),
                     Actor('unassigned', role='recruiter')]
        for operation in self.m.supported:
            for actor in outsiders:
                with self.subTest(operation=operation, actor=actor):
                    r = self.m.apply(operation, {}, actor=actor, key='cross-scope-action')
                    self.assertEqual(r['status'], 404)
                    self.assertIsNone(r['body']['error']['current_revision'])
        self.assertEqual(self.m.s, initial)

    def test_admin_does_not_implicitly_read_candidate_content(self):
        self.call('getInterview', actor=ADMIN, status=403)
        self.call('getReport', actor=ADMIN, status=403)

    def test_candidate_cannot_self_review(self):
        self.consent(); self.answer(); self.finish(); self.m.complete_job(self.m.job)
        self.call('reviewReport', dict(report_version=1, outcome='acknowledge', evidence_checked=True,
                  corrections_checked=True, note=''), status=403)

    def test_origin_and_csrf_boundaries_prevent_mutation(self):
        self.consent()
        initial = copy.deepcopy(self.m.s)
        for kwargs in [dict(origin_valid=False), dict(csrf_valid=False)]:
            self.call('submitTextAnswer', {'question_id': 'q_experience', 'text': '架空'}, status=403, **kwargs)
        self.assertEqual(self.m.s, initial)

    def test_idempotent_retry_returns_same_response_without_extra_events(self):
        self.consent()
        body = dict(expected_revision=self.m.s['revision'], question_id='q_experience', text='架空')
        first = self.call('submitTextAnswer', body, key='retry-action-0001', status=201)
        count = len(self.m.events)
        again = self.call('submitTextAnswer', body, key='retry-action-0001', status=201)
        self.assertEqual(first, again)
        self.assertEqual(len(self.m.events), count)
        self.call('submitTextAnswer', {**body, 'text': '別の入力'}, key='retry-action-0001', status=409)

    def test_revocation_cannot_be_bypassed_with_old_success_replay(self):
        self.consent()
        body = dict(expected_revision=self.m.s['revision'], question_id='q_experience', text='架空')
        self.call('submitTextAnswer', body, key='revoked-retry-0001', status=201)
        self.call('withdrawConsent', {'request_deletion': False, 'confirmed': True}, status=202)
        self.call('submitTextAnswer', body, key='revoked-retry-0001', status=409)
        self.assertEqual(len(self.m.s['utterances']), 1)

    def test_expired_actor_cannot_replay_cached_success(self):
        self.consent()
        body = dict(expected_revision=self.m.s['revision'], question_id='q_experience', text='架空')
        self.call('submitTextAnswer', body, key='expired-retry-0001', status=201)
        self.call('submitTextAnswer', body, key='expired-retry-0001', status=401,
                  actor=Actor(CANDIDATE.subject, active=False))

    def test_stale_revision_never_overwrites_an_answer(self):
        self.consent(); self.answer()
        self.call('submitTextAnswer', {'expected_revision': 1, 'question_id': 'q_experience', 'text': '古い画面'}, status=409)
        self.assertEqual(len(self.m.s['utterances']), 1)

    def test_unknown_question_and_extra_fields_rejected(self):
        self.consent()
        self.call('submitTextAnswer', {'question_id': 'q_secret', 'text': '架空'}, status=422)
        self.call('submitTextAnswer', {'question_id': 'q_experience', 'text': '架空', 'tenant_id': 'other'}, status=422)

    def test_pause_and_cancel_work_even_with_stale_revision(self):
        self.consent(); self.answer()
        self.call('submitCommand', {'expected_revision': 1, 'command': 'pause'}, status=202)
        self.call('submitCommand', {'expected_revision': 1, 'command': 'cancel'}, status=202)
        self.assertEqual(self.m.s['state'], 'cancelled')

    def test_correction_cannot_modify_assistant_or_others(self):
        self.consent(); self.answer()
        self.m.s['utterances'][0]['speaker'] = 'assistant'
        u = self.m.s['utterances'][0]
        self.call('correctUtterance', dict(utterance_id=u['utterance_id'], expected_utterance_revision=1,
                  replacement_text='改変', reason='', confirmed=True), status=404)

    def test_old_generation_report_is_discarded_after_correction(self):
        self.consent(); self.answer('担当期間は5年です。'); self.finish()
        old_job = copy.deepcopy(self.m.job)
        self.correction('担当期間は3年です。')
        self.assertFalse(self.m.complete_job(old_job))
        self.assertEqual(self.m.audit[0]['text'], '担当期間は5年です。')
        self.assertEqual(self.m.s['state'], 'awaiting_confirmation')
        self.finish(); self.assertTrue(self.m.complete_job(copy.deepcopy(self.m.job)))
        self.assertIn('3年', self.m.report['content']['questions'][0]['summary'])
        self.assertNotIn('5年', json.dumps(self.m.report, ensure_ascii=False))

    def test_correction_after_review_requires_candidate_reconfirmation(self):
        self.consent(); self.answer(); self.finish(); self.m.complete_job(self.m.job); self.review()
        old_version = self.m.report['report_version']
        self.correction()
        self.assertEqual(self.m.report['review_status'], 'stale')
        self.assertIsNone(self.m.review)
        self.call('reviewReport', dict(report_version=old_version, outcome='acknowledge', evidence_checked=True,
                  corrections_checked=True, note=''), actor=RECRUITER, status=409)
        self.finish(); self.m.complete_job(self.m.job)
        self.assertEqual(self.m.report['report_version'], old_version + 1)

    def test_duplicate_report_completion_is_harmless(self):
        self.consent(); self.answer(); self.finish()
        job = copy.deepcopy(self.m.job)
        self.assertTrue(self.m.complete_job(job))
        count = len(self.m.events)
        self.assertFalse(self.m.complete_job(job))
        self.assertEqual(len(self.m.events), count)

    def test_finish_uses_exact_transcript_version(self):
        self.consent(); self.answer()
        self.call('submitCommand', {'command': 'request_finish'}, status=202)
        self.call('finishInterview', {'confirmed_transcript_version': 0, 'confirmed': True}, status=409)

    def test_multiple_voice_connections_are_rejected(self):
        self.consent(); self.voice()
        self.call('createVoiceSession', {'offer_sdp': 'ANOTHER_OFFLINE'}, status=409)
        self.assertEqual(len(self.m.connections), 1)

    def test_duplicate_provider_event_is_deduped_per_connection(self):
        self.consent(); c = self.voice()
        self.assertTrue(self.m.provider_utterance(c, 'evt_1', '架空'))
        version = self.m.s['transcript_version']
        self.assertFalse(self.m.provider_utterance(c, 'evt_1', '架空'))
        self.assertEqual(self.m.s['transcript_version'], version)

    def test_new_connection_can_reuse_event_id_without_losing_answer(self):
        self.consent(); first = self.voice()
        self.m.provider_utterance(first, 'evt_same', '前半')
        self.call('submitCommand', {'command': 'pause'}, status=202)
        self.m.provider_closed(first)
        self.call('submitCommand', {'command': 'resume'}, status=202)
        second = self.voice()
        self.m.provider_utterance(second, 'evt_same', '後半')
        self.assertEqual(len(self.m.s['utterances']), 2)
        self.assertNotEqual(first, second)

    def test_missing_finalization_blocks_finish_until_human_review(self):
        self.consent(); c = self.voice()
        self.m.provider_utterance(c, 'evt_gap', '架空')
        self.call('submitCommand', {'command': 'request_finish'}, status=202)
        self.m.provider_closed(c, confirmed=False)
        self.call('finishInterview', {'confirmed_transcript_version': 1, 'confirmed': True}, status=409)
        self.call('reviewFinalizationGap', dict(transcript_version=1, gap_note='候補者へ欠落確認',
                  candidate_follow_up_checked=True, confirmed=True), actor=RECRUITER, status=201)
        self.assertFalse(self.m.s['finalization_confirmed'])
        self.finish(); self.m.complete_job(self.m.job)
        self.assertTrue(self.m.report['content']['limitations'])

    def test_new_clean_connection_does_not_hide_an_old_gap(self):
        self.consent(); c = self.voice(); self.m.provider_closed(c, confirmed=False)
        self.call('submitCommand', {'command': 'resume'}, status=202)
        new = self.voice()
        self.call('submitCommand', {'command': 'request_finish'}, status=202)
        self.m.provider_closed(new, confirmed=True)
        self.call('finishInterview', {'confirmed_transcript_version': 0, 'confirmed': True}, status=409)

    def test_correction_invalidates_gap_review(self):
        self.consent(); c = self.voice(); self.m.provider_utterance(c, 'evt_gap', '架空')
        self.call('submitCommand', {'command': 'request_finish'}, status=202)
        self.m.provider_closed(c, confirmed=False)
        self.call('reviewFinalizationGap', dict(transcript_version=1, gap_note='確認',
                  candidate_follow_up_checked=True, confirmed=True), actor=RECRUITER, status=201)
        self.correction()
        self.assertIsNone(self.m.s['finalization_review_id'])
        self.call('finishInterview', {'confirmed_transcript_version': 2, 'confirmed': True}, status=409)

    def test_late_utterance_invalidates_report_job(self):
        self.consent(); c = self.voice(); self.m.provider_utterance(c, 'evt_early', '前半')
        self.call('submitCommand', {'command': 'request_finish'}, status=202)
        self.m.provider_closed(c); self.finish()
        job = copy.deepcopy(self.m.job)
        self.m.provider_utterance(c, 'evt_late', '後着')
        self.assertFalse(self.m.complete_job(job))
        self.assertEqual(self.m.s['state'], 'awaiting_confirmation')

    def test_withdrawal_stops_new_generation_and_discards_late_data(self):
        self.consent(); c = self.voice()
        receipt = self.call('withdrawConsent', {'request_deletion': False, 'confirmed': True}, status=202)
        self.assertFalse(receipt['processing_stopped'])
        self.assertFalse(self.m.provider_utterance(c, 'late_after_withdrawal', '取り込まない'))
        self.m.provider_closed(c)
        self.assertIsNone(self.m.s['active_connection_id'])

    def test_withdrawal_discards_inflight_report(self):
        self.consent(); self.answer(); self.finish(); job = copy.deepcopy(self.m.job)
        self.call('withdrawConsent', {'request_deletion': False, 'confirmed': True}, status=202)
        self.assertFalse(self.m.complete_job(job))
        self.assertIsNone(self.m.report)

    def test_sse_replay_order_dedupe_and_authorization(self):
        self.consent(); self.answer(); self.correction()
        last = self.m.s['last_seq']
        replay = self.m.replay(1)
        self.assertEqual([e['seq'] for e in replay], list(range(2, last + 1)))
        self.assertEqual(self.m.replay(last), [])
        with self.assertRaises(Rejected): self.m.replay(0, Actor('other_candidate'))
        with self.assertRaises(Rejected): self.m.replay(last+1)
        with self.assertRaises(Rejected): self.m.replay(0, oldest_seq=3)
        self.m.assigned.clear()
        with self.assertRaises(Rejected): self.m.replay(0, RECRUITER)

    def test_deletion_clears_text_from_events_audit_trace_and_replay_cache(self):
        self.consent(); self.answer('架空の秘密文字列XYZ'); self.correction('訂正後の秘密ABC')
        self.finish(); self.m.complete_job(self.m.job)
        self.call('requestDeletion', {'confirmed': True}, status=202)
        self.m.purge(provider_deleted=False)
        self.assertEqual(self.m.deletion['status'], 'blocked')
        self.assertNotIn('秘密', json.dumps(self.m.__dict__, ensure_ascii=False, default=str))
        self.call('getInterview', status=404)
        self.call('getDeletionStatus')
        self.m.purge(provider_deleted=True)
        self.assertEqual(self.m.deletion['status'], 'completed')
        self.assertIsNotNone(self.m.deletion['backup_expiry_at'])

    def test_provenance_rejects_fabricated_wrong_and_stale_evidence(self):
        self.consent(); self.answer(); self.finish()
        base = self.m.draft()
        variants = []
        for field, value in [('quote', '実際には話していない'), ('utterance_revision', 999), ('utterance_id', 'ut_foreign')]:
            report = copy.deepcopy(base)
            report['content']['questions'][0]['evidence'][0][field] = value
            variants.append(report)
        wrong_question = copy.deepcopy(base)
        wrong_question['content']['questions'][0]['question_id'] = 'q_role'
        variants.append(wrong_question)
        missing = copy.deepcopy(base); missing['content']['questions'].pop(); variants.append(missing)
        duplicated = copy.deepcopy(base); duplicated['content']['questions'][1] = copy.deepcopy(duplicated['content']['questions'][0]); variants.append(duplicated)
        unsupported = copy.deepcopy(base); unsupported['content']['questions'][1]['summary'] = '不明なのに経験豊富'; variants.append(unsupported)
        for report in variants:
            with self.subTest(report=report):
                with self.assertRaises(Rejected): report_semantics(report, self.m.s)
        self.assertIsNone(self.m.report)


if __name__ == '__main__':
    unittest.main()
