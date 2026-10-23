import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { getDemoQuestions, interests, roles } from './demo';
import type { DemoQuestion, QuestionId, RoleId } from './demo';

interface Answer {
  text: string;
  summary: string;
  source: 'sample' | 'edited';
  supplement: string;
}

interface CandidateState {
  role: RoleId;
  selectedInterests: string[];
  agreed: boolean;
  answers: Partial<Record<QuestionId, Answer>>;
  confirmed: boolean;
  setRole: (role: RoleId) => void;
  toggleInterest: (interest: string) => void;
  setAgreed: (agreed: boolean) => void;
  saveAnswer: (question: DemoQuestion, text: string) => void;
  saveSupplement: (id: QuestionId, text: string) => void;
  confirm: () => void;
  reset: () => void;
}

const CandidateContext = createContext<CandidateState | null>(null);
const base = '/candidate/demo';

export function CandidateFlowProvider({ children }: { children: ReactNode }) {
  const [role, setRoleValue] = useState<RoleId>('designer');
  const [selectedInterests, setInterests] = useState<string[]>([interests[0]!]);
  const [agreed, setAgreed] = useState(false);
  const [answers, setAnswers] = useState<CandidateState['answers']>({});
  const [confirmed, setConfirmed] = useState(false);
  const value: CandidateState = {
    role,
    selectedInterests,
    agreed,
    answers,
    confirmed,
    setRole(nextRole) {
      setRoleValue(nextRole);
      setConfirmed(false);
    },
    toggleInterest(interest) {
      setInterests((current) =>
        current.includes(interest)
          ? current.filter((item) => item !== interest)
          : [...current, interest],
      );
      setConfirmed(false);
    },
    setAgreed,
    saveAnswer(question, text) {
      const trimmed = text.trim();
      if (!trimmed) return;
      setAnswers((current) => ({
        ...current,
        [question.id]: {
          text: trimmed,
          summary: trimmed === question.sample ? question.summary : trimmed,
          source: trimmed === question.sample ? 'sample' : 'edited',
          supplement: current[question.id]?.supplement ?? '',
        },
      }));
      setConfirmed(false);
    },
    saveSupplement(id, text) {
      setAnswers((current) =>
        current[id] ? { ...current, [id]: { ...current[id], supplement: text.trim() } } : current,
      );
      setConfirmed(false);
    },
    confirm() {
      setConfirmed(true);
    },
    reset() {
      setRoleValue('designer');
      setInterests([interests[0]!]);
      setAgreed(false);
      setAnswers({});
      setConfirmed(false);
    },
  };
  return <CandidateContext.Provider value={value}>{children}</CandidateContext.Provider>;
}

function useCandidate() {
  const value = useContext(CandidateContext);
  if (!value) throw new Error('Candidate flow requires its provider');
  return value;
}

function AudioButton({ children }: { children: ReactNode }) {
  const [unavailable, setUnavailable] = useState(false);
  return (
    <div className="action-group">
      <button className="button secondary" type="button" onClick={() => setUnavailable(true)}>
        {children}
      </button>
      {unavailable && (
        <p className="feedback" role="status">
          音声機能は現在利用できません。マイクの許可・録音・送信は行いません。
        </p>
      )}
    </div>
  );
}

export function CandidateCheck() {
  const state = useCandidate();
  return (
    <section className="card candidate-card">
      <p className="eyebrow">YOUR INTERESTS</p>
      <h1 tabIndex={-1}>仕事の希望を教えてください</h1>
      <p className="muted">
        気になる職種と、やってみたいことを選びましょう。まだ決まっていなくても大丈夫です。
      </p>
      <fieldset className="preference-fieldset">
        <legend>興味のある職種</legend>
        <div className="role-options">
          {roles.map((role) => (
            <label className="role-option" key={role.id}>
              <input
                type="radio"
                name="role"
                value={role.id}
                checked={state.role === role.id}
                onChange={() => state.setRole(role.id)}
              />
              <span>
                <strong>{role.label}</strong>
                <small>{role.description}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="preference-fieldset">
        <legend>
          やってみたいこと <span className="muted">複数選択可</span>
        </legend>
        <div className="interest-options">
          {interests.map((interest) => (
            <label key={interest}>
              <input
                type="checkbox"
                checked={state.selectedInterests.includes(interest)}
                onChange={() => state.toggleInterest(interest)}
              />
              {interest}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="info-box">
        <strong>今回はダミー回答で体験できます</strong>
        <p>
          選んだ職種に合わせた架空の回答を用意します。音声機能は現在利用できません。すでに入力した回答は、希望を選び直しても保持されます。
        </p>
      </div>
      <AudioButton>マイクを確認</AudioButton>
      <div className="consent">
        <h2>利用前の確認</h2>
        <p>
          録音・AIへの送信・正式な応募は行いません。回答はこの画面を開いている間だけ保持され、再読み込みで消えます。実際の個人情報は入力しないでください。
        </p>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={state.agreed}
            onChange={(event) => state.setAgreed(event.target.checked)}
          />
          画面確認用の説明を確認しました
        </label>
      </div>
      {state.agreed ? (
        <Link className="button primary full-width" to={`${base}/conversation`}>
          対話画面へ進む →
        </Link>
      ) : (
        <button className="button primary full-width" disabled>
          対話画面へ進む →
        </button>
      )}
      <Link className="back-link" to={base}>
        ← ご案内に戻る
      </Link>
    </section>
  );
}

export function Conversation() {
  const state = useCandidate();
  const [params] = useSearchParams();
  const questions = getDemoQuestions(state.role, state.selectedInterests);
  const requested = params.get('question');
  const question =
    questions.find((item) => item.id === requested) ??
    questions.find((item) => !state.answers[item.id]) ??
    questions[0]!;
  if (!state.agreed) return <Navigate to={`${base}/check`} replace />;
  return (
    <QuestionPanel
      key={question.id}
      question={question}
      questions={questions}
      returning={params.get('return') === 'summary'}
    />
  );
}

function QuestionPanel({
  question,
  questions,
  returning,
}: {
  question: DemoQuestion;
  questions: DemoQuestion[];
  returning: boolean;
}) {
  const state = useCandidate();
  const navigate = useNavigate();
  const saved = state.answers[question.id];
  const [draft, setDraft] = useState(saved?.text ?? '');
  const index = questions.findIndex((item) => item.id === question.id);
  const last = index === questions.length - 1;
  function next() {
    state.saveAnswer(question, draft);
    navigate(
      returning || last
        ? `${base}/summary`
        : `${base}/conversation?question=${questions[index + 1]!.id}`,
    );
  }
  return (
    <section className="card candidate-card question-page">
      <p className="eyebrow">
        QUESTION {String(index + 1).padStart(2, '0')} / {String(questions.length).padStart(2, '0')}
      </p>
      <h1 tabIndex={-1}>{question.question}</h1>
      <p className="muted">{question.hint}</p>
      <div className="question-progress" aria-label="質問の進み具合">
        {questions.map((item, position) => (
          <Link
            key={item.id}
            to={`${base}/conversation?question=${item.id}${returning ? '&return=summary' : ''}`}
            aria-current={item.id === question.id ? 'step' : undefined}
          >
            <span>{String(position + 1).padStart(2, '0')}</span>
            <span>{item.title}</span>
            {state.answers[item.id] && <span aria-label="入力済み">✓</span>}
          </Link>
        ))}
      </div>
      <div className="demo-input-note">
        <span className="badge blue">ダミー入力</span>
        <p>
          音声で回答した想定の文章を読み込めます。そのまま試すことも、自由に書き直すこともできます。
        </p>
        <button
          className="button secondary"
          type="button"
          onClick={() => setDraft(question.sample)}
        >
          ダミー回答を入力
        </button>
      </div>
      <label className="answer-label" htmlFor="candidate-answer">
        この質問への回答
      </label>
      <textarea
        id="candidate-answer"
        className="answer-input"
        rows={6}
        maxLength={2000}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="ダミー回答を入力するか、画面確認用の文章を入力してください。"
      />
      <p className="answer-help">
        実際の音声入力やAIの処理は行いません。編集した回答はそのまま確認画面に反映します。
      </p>
      <div className="question-actions">
        <button className="button primary" disabled={!draft.trim()} onClick={next}>
          {returning ? 'この回答を要約に反映する' : last ? '要約を確認する' : 'この回答で次へ →'}
        </button>
        <AudioButton>音声対話を開始</AudioButton>
      </div>
      <div className="question-footer">
        {returning ? (
          <Link className="back-link" to={`${base}/summary`}>
            変更せず要約へ戻る
          </Link>
        ) : (
          <Link
            className="back-link"
            to={
              index > 0
                ? `${base}/conversation?question=${questions[index - 1]!.id}`
                : `${base}/check`
            }
          >
            ← {index > 0 ? '前の質問へ' : '仕事の希望に戻る'}
          </Link>
        )}
        <Link className="text-link" to={`${base}/summary`}>
          ここまでの要約を見る →
        </Link>
      </div>
    </section>
  );
}

function SummaryAnswer({
  question,
  answer,
}: {
  question: DemoQuestion;
  answer: Answer | undefined;
}) {
  const state = useCandidate();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(answer?.supplement ?? '');
  return (
    <section className="summary-item" aria-label={question.title}>
      <div className="summary-item-heading">
        <h2>{question.title}</h2>
        <span className={`badge ${answer ? 'blue' : ''}`}>
          {answer ? (answer.source === 'sample' ? 'ダミー回答' : '編集した回答') : '未回答'}
        </span>
      </div>
      {answer ? (
        <>
          <p className="answer-summary">{answer.summary}</p>
          {answer.supplement && (
            <div className="supplement-result">
              <strong>補足</strong>
              <p>{answer.supplement}</p>
            </div>
          )}
          <details>
            <summary>入力した回答を見る</summary>
            <p className="original-answer">{answer.text}</p>
          </details>
        </>
      ) : (
        <p className="muted">
          まだ回答を受け取っていません。この質問に答えると要約が表示されます。
        </p>
      )}
      <div className="summary-actions">
        <Link
          className="text-link"
          to={`${base}/conversation?question=${question.id}&return=summary`}
        >
          {answer ? 'この質問をやり直す' : 'この質問に答える'} →
        </Link>
        {answer && !editing && (
          <button
            className="text-link text-link-button"
            onClick={() => {
              setDraft(answer.supplement);
              setEditing(true);
            }}
          >
            {answer.supplement ? '補足を編集する' : '補足する'}
          </button>
        )}
      </div>
      {answer && editing && (
        <form
          className="supplement-form"
          onSubmit={(event) => {
            event.preventDefault();
            state.saveSupplement(question.id, draft);
            setEditing(false);
          }}
        >
          <label htmlFor={`supplement-${question.id}`}>{question.title}の補足</label>
          <textarea
            id={`supplement-${question.id}`}
            rows={4}
            maxLength={1000}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="付け加えたいことや、訂正したい点を入力してください。"
          />
          <div className="question-actions">
            <button className="button primary" type="submit">
              補足を反映する
            </button>
            <button className="button secondary" type="button" onClick={() => setEditing(false)}>
              キャンセル
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

export function CandidateSummary() {
  const state = useCandidate();
  const navigate = useNavigate();
  const questions = getDemoQuestions(state.role, state.selectedInterests);
  const answered = questions.filter((item) => state.answers[item.id]).length;
  const role = roles.find((item) => item.id === state.role)!;
  return (
    <section className="card candidate-card summary-page">
      <p className="eyebrow">WHAT WE HEARD</p>
      <h1 tabIndex={-1}>あなたのお話をまとめました</h1>
      <p className="muted">
        お話から受け取った内容を確認してください。違うところや伝え足りないところは、質問ごとに答え直し・補足ができます。
      </p>
      <div className="info-box">
        <strong>これはダミーデータによる要約のデモです</strong>
        <p>
          ダミー回答には用意した要点を表示します。編集した回答と補足は、その文章をそのまま反映します。AIによる要約・評価・採否の判断は行っていません。
        </p>
      </div>
      <div className="summary-preferences">
        <div>
          <span className="eyebrow">SELECTED ROLE</span>
          <strong>{role.label}</strong>
          <p>{state.selectedInterests.join(' / ') || 'やってみたいことは未選択'}</p>
        </div>
        <Link className="text-link" to={`${base}/check`}>
          仕事の希望を見直す →
        </Link>
      </div>
      <p className="summary-count">
        回答済み {answered} / {questions.length}
      </p>
      <div className="summary-list">
        {questions.map((question) => (
          <SummaryAnswer
            key={question.id}
            question={question}
            answer={state.answers[question.id]}
          />
        ))}
      </div>
      {answered < questions.length && (
        <p className="feedback">
          まだ回答していない質問があります。各項目の「この質問に答える」から入力できます。再読み込みした場合、前の入力内容は残りません。
        </p>
      )}
      <div className="summary-confirm">
        <p>この内容でよければ、確認を完了してください。企業への送信や応募は行いません。</p>
        <button
          className="button primary full-width"
          disabled={answered < questions.length}
          onClick={() => {
            state.confirm();
            navigate(`${base}/complete`);
          }}
        >
          この内容で確認を完了する →
        </button>
      </div>
    </section>
  );
}

export function Complete() {
  const state = useCandidate();
  const [restarting, setRestarting] = useState(false);
  if (restarting) return <Navigate to={base} replace />;
  if (!state.confirmed) return <Navigate to={`${base}/summary`} replace />;
  return (
    <section className="card candidate-card completion-card">
      <span className="checkmark" aria-hidden="true">
        ✓
      </span>
      <p className="eyebrow spaced">PREVIEW COMPLETE</p>
      <h1 tabIndex={-1}>お話の内容を確認しました</h1>
      <p className="muted">
        ダミー回答の入力から、要約の訂正・補足までを確認できました。
        <br />
        面談の送信・応募・録音は行っていません。
      </p>
      <Link className="button secondary full-width" to={`${base}/summary`}>
        要約をもう一度見る
      </Link>
      <button
        className="button primary full-width"
        onClick={() => {
          setRestarting(true);
          state.reset();
        }}
      >
        最初からもう一度試す
      </button>
      <Link className="back-link" to="/">
        企業側のサンプル画面へ →
      </Link>
    </section>
  );
}
