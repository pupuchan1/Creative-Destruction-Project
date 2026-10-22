import json
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
C = ROOT / 'contracts'
C.mkdir(exist_ok=True)
(C / 'fixtures').mkdir(exist_ok=True)
def write(name, obj):
    (C/name).write_text(json.dumps(obj, ensure_ascii=False, indent=2)+'\n')
def obj(props, required=None):
    return {'type':'object','properties':props,'required':list(props) if required is None else required,'additionalProperties':False}
def arr(item, **kw): return {'type':'array','items':item, **kw}
def string(**kw): return {'type':'string', **kw}
def enum(*v): return {'type':'string','enum':list(v)}
def integer(minimum=0): return {'type':'integer','minimum':minimum}
def nullable(schema): return {'anyOf':[schema,{'type':'null'}]}
def ref(n): return {'$ref':'#/components/schemas/'+n}
ID = string(minLength=1,maxLength=128,pattern='^[A-Za-z0-9_-]+$')
TEXT = string(maxLength=20000)
DATE = string(format='date-time')
BOOL = {'type':'boolean'}
TRUE = {'type':'boolean','const':True}
STATES = enum('awaiting_consent','ready','connecting','active','paused','awaiting_confirmation','finalizing','review_pending','reviewed','cancelled','failed')
evidence = obj({'utterance_id':ID,'utterance_revision':integer(1),'quote':string(minLength=1,maxLength=4000)})
question_result = obj({'question_id':ID,'status':enum('answered','unconfirmed'),'summary':string(maxLength=4000),'evidence':arr(evidence)})
report_content = obj({'questions':arr(question_result),'follow_up':arr(string(maxLength=2000)),'candidate_questions':arr(obj({'text':TEXT,'evidence':arr(evidence)})),'limitations':arr(string(maxLength=2000))})
report = obj({'schema_version':{'const':'1.0','type':'string'},'interview_id':ID,'report_version':integer(1),'transcript_version':integer(),'generated_at':DATE,'model':string(),'prompt_version':string(),'review_status':enum('draft','stale','reviewed'),'content':report_content})
report.update({'$schema':'https://json-schema.org/draft/2020-12/schema','$id':'https://example.invalid/haas/report.schema.json','title':'HaaS evidence report v0.1 — proposed contract'})
write('report.schema.json',report)

utterance = obj({'utterance_id':ID,'utterance_revision':integer(1),'speaker':enum('candidate','assistant'),'text':TEXT,'status':enum('provisional','confirmed','corrected'),'question_id':nullable(ID),'source':enum('voice','text'),'connection_id':nullable(ID),'start_ms':nullable(integer()),'end_ms':nullable(integer())})
event_data = {
 'voice.ready':obj({'connection_id':ID}),
 'voice.closed':obj({'connection_id':ID,'finalization_confirmed':BOOL,'reason':string(),'usage_seconds':nullable({'type':'number','minimum':0})}),
 'transcript.fragment':obj({'fragment_id':ID,'connection_id':ID,'speaker':enum('candidate','assistant'),'delta':TEXT,'start_ms':integer(),'end_ms':integer()}),
 'transcript.updated':utterance,
 'interview.updated':obj({'state':STATES,'reason':string(),'finalization_confirmed':BOOL}),
 'correction.applied':obj({'correction_id':ID,'utterance_id':ID,'utterance_revision':integer(1),'invalidated_report_version':nullable(integer(1))}),
 'report.updated':obj({'status':enum('generating','draft','stale','reviewed','failed'),'report_version':nullable(integer(1))}),
 'gap_detected':obj({'connection_id':ID,'reason':string(),'recoverable':BOOL}),
 'error':obj({'code':string(),'message':string(maxLength=1000),'retryable':BOOL,'request_id':ID})
}
base={'schema_version':{'type':'string','const':'1.0'},'seq':integer(1),'interview_id':ID,'occurred_at':DATE,'revision':integer(1),'transcript_version':integer(),'generation':integer(1)}
events={'$schema':'https://json-schema.org/draft/2020-12/schema','$id':'https://example.invalid/haas/events.schema.json','title':'Application SSE envelope — not raw OpenAI events','oneOf':[obj({**base,'type':{'type':'string','const':t},'data':d}) for t,d in event_data.items()]}
write('events.schema.json',events)

schemas={}
schemas['Question']=obj({'question_id':ID,'text':string(minLength=1,maxLength=2000),'required':BOOL})
schemas['TemplateCreate']=obj({'title':string(minLength=1,maxLength=200),'job_description':string(minLength=1,maxLength=12000),'questions':arr(ref('Question'),minItems=1,maxItems=30)})
schemas['TemplateVersion']=obj({'template_version_id':ID,'version':integer(1),'created_at':DATE,'content':ref('TemplateCreate')})
schemas['InterviewCreate']=obj({'template_version_id':ID,'candidate_reference':string(minLength=1,maxLength=128),'locale':{'type':'string','const':'ja-JP'}})
schemas['InterviewInvitation']=obj({'interview_id':ID,'revision':integer(1),'invite_token':string(minLength=32,maxLength=512),'expires_at':DATE})
schemas['InviteExchange']=obj({'token':string(minLength=32,maxLength=512)})
schemas['InviteSession']=obj({'interview_id':ID,'csrf_token':string(minLength=16),'expires_at':DATE})
schemas['AppSession']=obj({'subject_id':ID,'role':enum('candidate','recruiter','tenant_admin'),'interview_id':nullable(ID),'csrf_token':string(minLength=16),'expires_at':DATE})
schemas['ConsentDocument']=obj({'policy_id':ID,'policy_version':string(),'policy_hash':string(pattern='^[a-f0-9]{64}$'),'locale':{'type':'string','const':'ja-JP'},'statements':arr(string(),minItems=1),'retention_days':integer(1),'audio_recording':{'type':'boolean','const':False}})
schemas['ConsentCreate']=obj({'expected_revision':integer(1),'policy_id':ID,'policy_version':string(),'policy_hash':string(pattern='^[a-f0-9]{64}$'),'ai_dialogue_accepted':TRUE,'transcript_processing_accepted':TRUE})
schemas['Utterance']=utterance
schemas['InterviewSnapshot']=obj({'interview_id':ID,'template_version_id':ID,'state':STATES,'revision':integer(1),'transcript_version':integer(),'generation':integer(1),'last_seq':integer(),'consent_active':BOOL,'consent_document':ref('ConsentDocument'),'active_connection_id':nullable(ID),'finalization_confirmed':BOOL,'finalization_review_id':nullable(ID),'human_requested':BOOL,'utterances':arr(ref('Utterance')),'report_status':enum('none','generating','draft','stale','reviewed','failed')})
schemas['VoiceCreate']=obj({'expected_revision':integer(1),'offer_sdp':string(minLength=1,maxLength=65536)})
schemas['VoiceAnswer']=obj({'connection_id':ID,'answer_sdp':string(minLength=1,maxLength=65536),'revision':integer(1),'generation':integer(1)})
schemas['AnswerCreate']=obj({'expected_revision':integer(1),'question_id':ID,'text':string(minLength=1,maxLength=10000)})
schemas['CommandCreate']=obj({'expected_revision':integer(1),'command':enum('pause','resume','request_finish','cancel','request_human')})
schemas['CorrectionCreate']=obj({'expected_revision':integer(1),'utterance_id':ID,'expected_utterance_revision':integer(1),'replacement_text':string(minLength=1,maxLength=10000),'reason':string(maxLength=1000),'confirmed':TRUE})
schemas['FinishCreate']=obj({'expected_revision':integer(1),'confirmed_transcript_version':integer(),'confirmed':TRUE})
schemas['FinalizationReviewCreate']=obj({'expected_revision':integer(1),'transcript_version':integer(),'gap_note':string(minLength=1,maxLength=2000),'candidate_follow_up_checked':TRUE,'confirmed':TRUE})
schemas['ReportJob']=obj({'operation_id':ID,'status':enum('queued','running','failed'),'transcript_version':integer(),'poll_after_ms':integer(100)})
schemas['ReviewCreate']=obj({'expected_revision':integer(1),'report_version':integer(1),'outcome':enum('acknowledge','request_changes'),'evidence_checked':TRUE,'corrections_checked':TRUE,'note':string(maxLength=4000)})
schemas['ReviewReceipt']=obj({'review_id':ID,'report_version':integer(1),'outcome':enum('acknowledge','request_changes'),'reviewed_at':DATE,'revision':integer(1)})
schemas['WithdrawalCreate']=obj({'request_deletion':BOOL,'confirmed':TRUE})
schemas['WithdrawalReceipt']=obj({'state':{'type':'string','const':'cancelled'},'revision':integer(1),'processing_stopped':BOOL,'deletion_request_id':nullable(ID)})
schemas['DeletionCreate']=obj({'expected_revision':integer(1),'confirmed':TRUE})
schemas['DeletionStatus']=obj({'request_id':ID,'status':enum('queued','running','completed','blocked'),'requested_at':DATE,'completed_at':nullable(DATE),'app_data_deleted':BOOL,'provider_state_deleted':BOOL,'backup_expiry_at':nullable(DATE),'retained_categories':arr(string(maxLength=500))})
schemas['Error']=obj({'error':obj({'code':string(),'message':string(maxLength=1000),'request_id':ID,'retryable':BOOL,'current_revision':nullable(integer(1))})})
api={'openapi':'3.1.0','info':{'title':'HaaS Recruitment Dialogue API — proposal','version':'0.2.0','description':'2026-10-22 review proposal; no deployed server. Human-reviewed records, no automated hiring. See docs/03-web-api-integration.md.'},'servers':[{'url':'/api/v1'}],'security':[{'sessionCookie':[]}],'paths':{},'components':{'securitySchemes':{'sessionCookie':{'type':'apiKey','in':'cookie','name':'haas_session'}},'schemas':schemas,'parameters':{}}}
schemas['InterviewSnapshot']['properties'].update({'template':ref('TemplateVersion'),'current_question_id':nullable(ID),'finalization_review_transcript_version':nullable(integer()),'gaps':arr(obj({'connection_id':ID,'reason':string()}))})
schemas['InterviewSnapshot']['required']=list(schemas['InterviewSnapshot']['properties'])
schemas['InterviewList']=obj({'items':arr(obj({'interview_id':ID,'template_version_id':ID,'candidate_reference':string(),'state':STATES,'revision':integer(1)})),'next_cursor':nullable(string())})
schemas['TemplateList']=obj({'items':arr(ref('TemplateVersion')),'next_cursor':nullable(string())})
schemas['LogoutReceipt']=obj({'revoked':TRUE})
params=api['components']['parameters']
params['IdempotencyKey']={'name':'Idempotency-Key','in':'header','required':True,'description':'Stable per logical action; principal/method/path scoped; 24h proposed. Reuse only with identical payload.','schema':string(minLength=16,maxLength=128)}
params['CsrfToken']={'name':'X-CSRF-Token','in':'header','required':True,'schema':string(minLength=16)}
def jsonresponse(desc,schema): return {'description':desc,'content':{'application/json':{'schema':schema}}}
def op(path,method,operation,summary,roles,request=None,response=None,status='200',extra_responses=None,description=''):
    p=[]
    for n in ('interview_id','request_id','template_version_id'):
        if '{'+n+'}' in path: p.append({'name':n,'in':'path','required':True,'schema':ID})
    if method=='post':
        p.append({'$ref':'#/components/parameters/IdempotencyKey'})
        if path!='/invites/exchange': p.append({'$ref':'#/components/parameters/CsrfToken'})
    out={'operationId':operation,'summary':summary,'description':description or summary,'x-roles':roles,'parameters':p,'responses':{status:jsonresponse(summary,ref(response))}}
    if request: out['requestBody']={'required':True,'content':{'application/json':{'schema':ref(request)}}}
    for code,desc in [('401','Authentication required'),('403','Operation not allowed'),('404','Resource not available in this scope'),('409','Version/state/idempotency conflict'),('422','Invalid input'),('429','Rate limit'),('503','Temporary service failure')]:
        out['responses'][code]=jsonresponse(desc,ref('Error'))
    out['responses']['429']['headers']={'Retry-After':{'schema':string(),'description':'Retry delay in seconds'}}
    if extra_responses: out['responses'].update(extra_responses)
    api['paths'].setdefault(path,{})[method]=out
    return out

op('/template-versions','post','createTemplateVersion','不変の質問テンプレート版を作る',['recruiter','tenant_admin'],'TemplateCreate','TemplateVersion','201')
api['components']['securitySchemes']['staffAccessToken']={'type':'http','scheme':'bearer','bearerFormat':'JWT','description':'Validated staff identity-provider access token; NOT an OpenAI API key. Validate issuer, audience, signature, expiry and active membership.'}
auth=op('/auth/exchange','post','exchangeStaffIdentity','企業担当者の認証tokenをアプリCookieへ交換',['recruiter','tenant_admin'],response='AppSession')
auth['security']=[{'staffAccessToken':[]}]
auth['parameters']=[p for p in auth['parameters'] if p.get('$ref')!='#/components/parameters/CsrfToken']
auth['description']='Validate JWT and server-side membership, never trust caller role claims alone. Origin validation and rate limit required. Initial exchange does not require prior CSRF token. Returns HttpOnly/Secure/SameSite=Lax haas_session cookie.'
auth['responses']['200']['headers']={'Set-Cookie':{'description':'haas_session; HttpOnly; Secure; SameSite=Lax; Path=/','schema':string()}}
op('/session','get','getAppSession','ページ再読込後のアプリセッション・CSRF取得',['candidate_self','recruiter','tenant_admin'],response='AppSession',description='Same-origin authenticated GET; Cache-Control no-store; cross-origin credentialed CORS forbidden. CSRF token rotates with session.')
logout=op('/auth/logout','post','logoutSession','アプリセッション失効とCookie削除',['candidate_self','recruiter','tenant_admin'],response='LogoutReceipt',description='Revoke server session and close its SSE subscriptions before clearing cookie. Pause/close voice connections owned by this candidate session. No interview deletion implied. Replays must not restore an expired/revoked session.')
logout['responses']['200']['headers']={'Set-Cookie':{'schema':string(),'description':'haas_session=; Max-Age=0; HttpOnly; Secure; SameSite=Lax; Path=/'}}
for path,operation,response in [('/template-versions','listTemplateVersions','TemplateList'),('/interviews','listInterviews','InterviewList')]:
 listing=op(path,'get',operation,'権限内の一覧をcursorで取得',['recruiter','tenant_admin'],response=response,description='Authorization-filtered before pagination. Stable opaque cursor binds filter and actor scope. Admin content access requires assignment. No unscoped total count.')
 listing['parameters'] += [{'name':'cursor','in':'query','schema':string(maxLength=2048)},{'name':'limit','in':'query','schema':{'type':'integer','minimum':1,'maximum':100,'default':20}}]
op('/template-versions/{template_version_id}','get','getTemplateVersion','権限内の不変質問テンプレート',['recruiter','tenant_admin'],response='TemplateVersion')
op('/interviews','post','createInterview','面談と一回交換の招待を作る',['recruiter'],'InterviewCreate','InterviewInvitation','201',description='candidate_reference is an internal opaque reference, not an email address. Creates the creator assignment atomically. Does not send an invitation externally.')
exchange=op('/invites/exchange','post','exchangeInvitation','招待tokenを面談限定Cookieへ交換',['invite_holder'],'InviteExchange','InviteSession')
exchange['security']=[]
exchange['responses']['200']['headers']={'Set-Cookie':{'description':'haas_session; HttpOnly; Secure; SameSite=Lax; Path=/','schema':string()},'Cache-Control':{'schema':{'type':'string','const':'no-store'}}}
basepath='/interviews/{interview_id}'
op(basepath,'get','getInterview','認可済み面談snapshot',['candidate_self','assigned_recruiter'],response='InterviewSnapshot')
op(basepath+'/consents','post','createConsent','表示済みpolicyの同意を記録',['candidate_self'],'ConsentCreate','InterviewSnapshot','201')
op(basepath+'/voice-sessions','post','createVoiceSession','SDP交換・sideband準備',['candidate_self'],'VoiceCreate','VoiceAnswer','201',description='Only after consent. One active connection per interview. Never auto-reuse expired SDP. Wait for voice.ready before sending microphone audio.')
sse=op(basepath+'/events','get','streamInterviewEvents','永続SSEイベント',['candidate_self','assigned_recruiter'],response='InterviewSnapshot',extra_responses={'410':jsonresponse('Replay cursor expired; fetch snapshot',ref('Error'))})
sse['parameters'] += [{'name':'Last-Event-ID','in':'header','schema':string(pattern='^[0-9]+$')},{'name':'after_seq','in':'query','schema':integer(),'description':'For page reload; Last-Event-ID takes precedence if both supplied.'}]
sse['responses']['200']={'description':'SSE id=seq; event=type; JSON data validated against events.schema.json. Heartbeat comments every 15s proposed.','content':{'text/event-stream':{'schema':string(),'example':'id: 1\nevent: voice.ready\ndata: {...}\n\n'}},'headers':{'Cache-Control':{'schema':{'type':'string','const':'no-store'}}}}
op(basepath+'/answers','post','submitTextAnswer','音声と同等の文字回答',['candidate_self'],'AnswerCreate','InterviewSnapshot','201')
op(basepath+'/commands','post','submitCommand','一時停止・再開・終了希望・取消・人への相談',['candidate_self'],'CommandCreate','InterviewSnapshot','202',description='pause/cancel/request_human do not fail solely for stale expected_revision; authorization and CSRF still apply. pause stops local mic immediately. resume changes paused to ready after voice close. request_finish starts close/drain; finish is blocked until it completes. request_human records a flag, no external message.')
op(basepath+'/corrections','post','correctUtterance','本人発話を訂正して旧生成物を無効化',['candidate_self'],'CorrectionCreate','InterviewSnapshot')
op(basepath+'/finalization-reviews','post','reviewFinalizationGap','担当者が接続終了未確認の欠落・補完を確認',['assigned_recruiter'],'FinalizationReviewCreate','InterviewSnapshot','201',description='Only after transport has stopped and gap follow-up is checked. Pins review to transcript_version. Does not set provider finalization_confirmed true. Preserve gap in report limitations. Any transcript change invalidates the review.')
op(basepath+'/finish','post','finishInterview','最新transcriptを本人が確認し下書きを依頼',['candidate_self'],'FinishCreate','ReportJob','202',description='Requires awaiting_confirmation, active consent, no active voice, confirmed finalization or human gap review pinned to exact transcript_version. Missing answers remain unconfirmed. No automatic hiring decision.')
op(basepath+'/report','get','getReport','根拠付きレポート。未完成は202',['candidate_self','assigned_recruiter'],response='ReportJob',extra_responses={'200':jsonresponse('Latest report; internal review notes excluded',{'$ref':'./report.schema.json'}),'202':jsonresponse('Report job pending',ref('ReportJob'))})
op(basepath+'/reviews','post','reviewReport','担当者が根拠・訂正を確認',['assigned_recruiter'],'ReviewCreate','ReviewReceipt','201',description='acknowledge means record review, not hiring. Exact latest report_version required. request_changes keeps review_pending; no candidate utterance overwrite.')
op(basepath+'/consent-withdrawal','post','withdrawConsent','同意を撤回し処理を停止',['candidate_self'],'WithdrawalCreate','WithdrawalReceipt','202',description='Revoke first; cancel provider and jobs asynchronously. processing_stopped is false until all processing is confirmed stopped. Does not assert provider abuse-log deletion.')
op(basepath+'/deletion-requests','post','requestDeletion','処理を失効させ非同期削除を依頼',['candidate_self','tenant_admin'],'DeletionCreate','DeletionStatus','202')
op('/deletion-requests/{request_id}','get','getDeletionStatus','自分または管理scope内の削除進捗',['candidate_self','tenant_admin'],response='DeletionStatus')
write('openapi.json',api)

tools=[{'type':'function','name':'get_interview_context','description':'Read only the authorized interview context bound to this server session.','parameters':obj({})},{'type':'function','name':'propose_next_step','description':'Propose only; server validates question, generation and authorization.','parameters':obj({'generation':integer(1),'action':enum('ask','clarify','human_review','request_finish'),'question_id':nullable(ID),'spoken_text':string(maxLength=1600)})}]
provider={'notice':'Request templates, NOT executed. Replace placeholders server-side after authentication/consent. Never send real applicant data in development. Verify actual project access and SDK version.','verified_on':'2026-10-22','live_create':{'method':'POST','url':'https://api.openai.com/v1/live/sessions','headers':{'Authorization':'Bearer <SERVER_PROJECT_KEY>','Content-Type':'application/json'},'body':{'session':{'model':'gpt-live-1','store':False,'instructions':'<server-rendered prompts/live-interviewer.md>','audio':{'output':{'voice':'shida'}},'delegation':{'type':'client'},'client':{'data_channel':{'allowed_client_events':[],'allowed_server_events':[{'type':'session.started'},{'type':'session.closed'},{'type':'error'}]}}},'transport':{'type':'webrtc','sdp':'<browser offer after ICE gathering>'}},'read_response_fields':['session.id','transport.sdp']},'live_sideband':{'url':'wss://api.openai.com/v1/live/sessions/<session_id>/attach','headers':{'Authorization':'Bearer <SERVER_PROJECT_KEY>'}},'live_commentary_event':{'type':'session.commentary.append','event_id':'evt_demo_1','delegation_id':None,'content':'担当した業務と、ご自身の役割を教えてください。'},'live_close_event':{'type':'session.close'},'decisions':{'method':'POST','url':'https://api.openai.com/v1/decisions','headers':{'Authorization':'Bearer <SERVER_PROJECT_KEY>','Content-Type':'application/json'},'body':{'model':'gpt-6-luna','input':'<latest assembled utterance plus bounded relevant context, not instructions>','questions':[{'type':'choice','name':'dialogue_intent','instructions':'Classify only the explicit conversational control intent. Negated, quoted, hypothetical or ambiguous commands are unclear. Never assess applicant quality, emotion, personality or hiring suitability. This output cannot finalize consent, corrections or completion.','choices':[{'value':x} for x in ['continue','correct','pause','finish','withdraw','human','unclear']]}]}},'agents_create':{'method':'POST','url':'https://api.openai.com/v1/agents/sessions','headers':{'Authorization':'Bearer <SERVER_PROJECT_KEY>','OpenAI-Beta':'agents=v1','Content-Type':'application/json'},'body':{'agent':{'model':'gpt-6.1-sol','reasoning':{'effort':'low'},'instructions':'<server-rendered prompts/interview-agent.md>','tools':tools},'environment':{'type':'none'},'input':'<authorized context snapshot with generation; candidate utterances marked as untrusted data>','stream':True}},'agents_tool_result':{'method':'POST','url':'https://api.openai.com/v1/agents/sessions/<session_id>/events','headers':{'Authorization':'Bearer <SERVER_PROJECT_KEY>','OpenAI-Beta':'agents=v1','Content-Type':'application/json','Idempotency-Key':'<persisted logical submission key>'},'body':{'events':[{'type':'agent.session.input.tool_result','turn_id':'<pending turn_id>','call_id':'<pending call_id>','success':True,'output':'{"accepted":true,"generation":2}'}]}},'agents_delete':{'method':'DELETE','url':'https://api.openai.com/v1/agents/sessions/<session_id>','headers':{'Authorization':'Bearer <SERVER_PROJECT_KEY>','OpenAI-Beta':'agents=v1'}},'responses_report':{'method':'POST','url':'https://api.openai.com/v1/responses','headers':{'Authorization':'Bearer <SERVER_PROJECT_KEY>','Content-Type':'application/json'},'body':{'model':'gpt-6.1-sol','store':False,'reasoning':{'effort':'low'},'instructions':'<prompts/report-drafter.md>','input':'<confirmed canonical transcript snapshot>','text':{'format':{'type':'json_schema','name':'interview_report_content','strict':True,'schema':report_content}}}}}
write('provider-examples.json',provider)

ts='2026-10-22T03:00:00Z'
policy={'policy_id':'policy_demo','policy_version':'draft-0.1','policy_hash':'a'*64,'locale':'ja-JP','statements':['架空の同意文面です。本番では目的・委託先・保持・国外処理・問い合わせ方法を確定してください。'],'retention_days':30,'audio_recording':False}
policy['policy_hash']=hashlib.sha256(json.dumps({k:v for k,v in policy.items() if k!='policy_hash'},ensure_ascii=False,sort_keys=True,separators=(',', ':')).encode()).hexdigest()
initial_ut={'utterance_id':'ut_1','utterance_revision':1,'speaker':'candidate','text':'担当した期間は5年です。','status':'provisional','question_id':'q_experience','source':'voice','connection_id':'vc_demo','start_ms':1000,'end_ms':2400}
corrected={**initial_ut,'utterance_revision':2,'text':'担当した期間は3年です。','status':'corrected'}
template={'template_version_id':'tpl_demo_v1','version':1,'created_at':ts,'content':{'title':'架空の開発職向け面談','job_description':'架空のWeb開発職。実在企業・候補者を含まない。','questions':[{'question_id':'q_experience','text':'担当した期間を教えてください。','required':True},{'question_id':'q_role','text':'担当した業務と役割を教えてください。','required':True}]}}
snapshot={'interview_id':'iv_demo','template_version_id':'tpl_demo_v1','state':'active','revision':4,'transcript_version':1,'generation':1,'last_seq':10,'consent_active':True,'consent_document':policy,'active_connection_id':'vc_demo','finalization_confirmed':False,'finalization_review_id':None,'finalization_review_transcript_version':None,'human_requested':False,'utterances':[initial_ut],'report_status':'none','template':template,'current_question_id':'q_role','gaps':[]}
write('fixtures/interview.json',snapshot)
write('fixtures/correction-request.json',{'expected_revision':4,'utterance_id':'ut_1','expected_utterance_revision':1,'replacement_text':corrected['text'],'reason':'期間の訂正','confirmed':True})
updated={**snapshot,'revision':5,'transcript_version':2,'generation':2,'last_seq':12,'utterances':[corrected]}
write('fixtures/correction-response.json',updated)
def event(seq,t,data,**kw): return {'schema_version':'1.0','seq':seq,'interview_id':'iv_demo','occurred_at':ts,'revision':5,'transcript_version':2,'generation':2,'type':t,'data':data,**kw}
ev=[event(11,'correction.applied',{'correction_id':'cor_demo','utterance_id':'ut_1','utterance_revision':2,'invalidated_report_version':None}),event(12,'transcript.updated',corrected),event(13,'voice.closed',{'connection_id':'vc_demo','finalization_confirmed':True,'reason':'close_requested','usage_seconds':1800}),event(14,'interview.updated',{'state':'awaiting_confirmation','reason':'candidate_requested_finish','finalization_confirmed':True},revision=6),event(15,'report.updated',{'status':'generating','report_version':None},revision=7),event(16,'report.updated',{'status':'draft','report_version':1},revision=8)]
write('fixtures/events.json',ev)
write('fixtures/finish-request.json',{'expected_revision':6,'confirmed_transcript_version':2,'confirmed':True})
draft={'schema_version':'1.0','interview_id':'iv_demo','report_version':1,'transcript_version':2,'generated_at':'2026-10-22T03:31:00Z','model':'gpt-6.1-sol','prompt_version':'report-ja-0.1','review_status':'draft','content':{'questions':[{'question_id':'q_experience','status':'answered','summary':'担当期間は3年と回答した。','evidence':[{'utterance_id':'ut_1','utterance_revision':2,'quote':'担当した期間は3年です。'}]},{'question_id':'q_role','status':'unconfirmed','summary':'','evidence':[]}],'follow_up':['担当した業務と役割を人が確認する。'],'candidate_questions':[],'limitations':['音声原本は保存していない。記録は候補者による訂正を反映した文字起こし。']}}
write('fixtures/report.json',draft)
write('fixtures/review-request.json',{'expected_revision':8,'report_version':1,'outcome':'acknowledge','evidence_checked':True,'corrections_checked':True,'note':'根拠と訂正を確認。役割は未確認。採否の判断ではない。'})
write('fixtures/conflict.json',{'error':{'code':'REVISION_CONFLICT','message':'最新の記録を取得して確認してください。','request_id':'req_demo','retryable':False,'current_revision':5}})
write('fixtures/deletion-status.json',{'request_id':'del_demo','status':'running','requested_at':ts,'completed_at':None,'app_data_deleted':False,'provider_state_deleted':True,'backup_expiry_at':None,'retained_categories':['本文を含まない同意・監査記録は確定した保持方針に従う。']})
write('fixtures/manifest.json',[{'file':f,'schema':s} for f,s in [('interview.json','InterviewSnapshot'),('correction-request.json','CorrectionCreate'),('correction-response.json','InterviewSnapshot'),('finish-request.json','FinishCreate'),('review-request.json','ReviewCreate'),('conflict.json','Error'),('deletion-status.json','DeletionStatus')]])
startup={
 'template-request.json':('TemplateCreate',{'title':'架空の開発職向け面談','job_description':'架空のWeb開発職。実在企業・候補者を含まない。','questions':[{'question_id':'q_experience','text':'担当した期間を教えてください。','required':True},{'question_id':'q_role','text':'担当した業務と役割を教えてください。','required':True}]}),
 'invitation-response.json':('InterviewInvitation',{'interview_id':'iv_demo','revision':1,'invite_token':'synthetic-token-never-valid-0000000000000000','expires_at':'2026-10-23T03:00:00Z'}),
 'consent-request.json':('ConsentCreate',{'expected_revision':1,'policy_id':'policy_demo','policy_version':'draft-0.1','policy_hash':policy['policy_hash'],'ai_dialogue_accepted':True,'transcript_processing_accepted':True}),
 'voice-answer.json':('VoiceAnswer',{'connection_id':'vc_demo','answer_sdp':'NON_FUNCTIONAL_SDP_PLACEHOLDER_FOR_UI_MOCK_ONLY','revision':3,'generation':1}),
 'report-job.json':('ReportJob',{'operation_id':'op_report_demo','status':'queued','transcript_version':2,'poll_after_ms':1000}),
 'session.json':('AppSession',{'subject_id':'sub_demo','role':'candidate','interview_id':'iv_demo','csrf_token':'synthetic-csrf-never-valid-00000000','expires_at':'2026-10-23T03:00:00Z'})
}
manifest=json.loads((C/'fixtures/manifest.json').read_text())
for f,(s,data) in startup.items():
 write('fixtures/'+f,data)
 manifest.append({'file':f,'schema':s})
write('fixtures/manifest.json',manifest)
print('Wrote',len(list(C.rglob('*.json'))),'contract JSON files')
