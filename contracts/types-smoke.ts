// Compile only. No network, credentials, models, or application side effects.
import type { API, AppEvent, Report, RequestOf, ResponseOf } from './generated/api';

const finish: RequestOf<'finishInterview'> = {
  expected_revision: 4,
  confirmed_transcript_version: 0,
  confirmed: true,
};
const withdraw: RequestOf<'withdrawConsent'> = { request_deletion: true, confirmed: true };
const params: API['getInterview']['pathParams'] = { interview_id: 'iv_demo' };

function narrowEvent(event: AppEvent): string {
  if (event.type === 'transcript.updated') return event.data.text;
  if (event.type === 'voice.ready') return event.data.connection_id;
  return event.type;
}

function narrowResponse(response: ResponseOf<'getReport'>): string {
  if (response.status === 200) return response.body.content.questions[0]?.summary ?? '';
  if (response.status === 202) return response.body.operation_id;
  return response.body.error.code;
}

// @ts-expect-error Consent requires literal true, not a silently accepted false.
const denied: RequestOf<'withdrawConsent'> = { request_deletion: false, confirmed: false };
// @ts-expect-error Arbitrary hiring scores are not in the report contract.
const score: keyof Report = 'hire_score';
// @ts-expect-error GET has no request-body contract.
const invalidGet: RequestOf<'getInterview'> = {};

export { finish, withdraw, params, narrowEvent, narrowResponse, denied, score, invalidGet };
