import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, NavLink, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { interviewStatusLabels } from '@haas/domain';
import { interviews } from './sample';

function Brand() {
  return (
    <Link className="brand" to="/" aria-label="HaaS ホーム">
      <span className="brand-mark" aria-hidden="true">
        H
      </span>
      <span>
        HaaS<small>採用対話</small>
      </span>
    </Link>
  );
}

function Notice() {
  return (
    <div className="notice">
      <span className="dot" />
      画面確認用
      <span className="notice-detail">すべて架空のサンプルです。APIは現在利用できません。</span>
    </div>
  );
}

function UnavailableButton({
  children,
  className = 'button secondary',
}: {
  children: ReactNode;
  className?: string;
}) {
  const [message, setMessage] = useState(false);
  return (
    <div className="action-group">
      <button type="button" className={className} onClick={() => setMessage(true)}>
        {children}
      </button>
      {message && (
        <p className="feedback" role="status">
          現在利用できません。API接続後に利用できます。データの保存・送信は行っていません。
        </p>
      )}
    </div>
  );
}

function Heading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 tabIndex={-1}>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {children}
    </div>
  );
}

function AdminLayout() {
  return (
    <div className="workspace">
      <a className="skip-link" href="#main">
        本文へ移動
      </a>
      <aside className="sidebar">
        <Brand />
        <div className="workspace-name">
          <span className="workspace-avatar">S</span>
          <div>
            サンプル株式会社<small>採用ワークスペース</small>
          </div>
        </div>
        <p className="nav-caption">WORKSPACE</p>
        <nav aria-label="メインナビゲーション">
          <NavLink end to="/">
            <span aria-hidden="true">◫</span>概要
          </NavLink>
          <NavLink to="/jobs">
            <span aria-hidden="true">▤</span>求人・質問設定
          </NavLink>
          <NavLink to="/interviews">
            <span aria-hidden="true">☷</span>面談一覧
          </NavLink>
          <NavLink to="/settings/members">
            <span aria-hidden="true">♧</span>メンバー・権限
          </NavLink>
        </nav>
        <div className="sidebar-bottom">
          <Link to="/candidate/demo">
            候補者のサンプル画面 <span aria-hidden="true">↗</span>
          </Link>
          <Link to="/login">ログイン画面へ</Link>
          <p>HaaS / SCREEN PROTOTYPE</p>
        </div>
      </aside>
      <div className="workspace-body">
        <header className="topbar">
          <span>
            サンプル株式会社 <span className="muted">/ 採用管理</span>
          </span>
          <span className="user-avatar" aria-label="サンプルユーザー">
            S
          </span>
        </header>
        <main id="main" className="admin-main">
          <Notice />
          <Outlet />
        </main>
        <footer className="workspace-footer">
          HaaS <span>人を知るための対話を、もっと自然に。</span>
        </footer>
      </div>
    </div>
  );
}

function InterviewTable() {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>候補者</th>
            <th>求人</th>
            <th>状態</th>
            <th>
              <span className="sr-only">操作</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {interviews.map((interview, index) => (
            <tr key={interview.id}>
              <td>
                <span className="person-icon" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <strong>{interview.candidate}</strong>
              </td>
              <td>{interview.job}</td>
              <td>
                <span className={`badge ${interview.status === 'review_pending' ? 'green' : ''}`}>
                  {interviewStatusLabels[interview.status]}
                </span>
              </td>
              <td>
                {interview.status === 'review_pending' ? (
                  <Link
                    className="text-link"
                    to={`/interviews/${interview.id}/report`}
                    aria-label={`${interview.candidate}の記録を確認`}
                  >
                    記録を確認 <span aria-hidden="true">→</span>
                  </Link>
                ) : (
                  <Link className="text-link" to="/interviews/invite">
                    招待画面へ →
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Overview() {
  return (
    <>
      <Heading
        eyebrow="OVERVIEW"
        title="採用の、今を見渡す。"
        description="候補者との対話と、次のアクションをひとつの場所に。"
      >
        <Link className="button primary" to="/interviews/invite">
          ＋ 候補者を招待
        </Link>
      </Heading>
      <div className="stats">
        <div className="stat">
          <p>面談サンプル</p>
          <strong>
            {interviews.length}
            <span>件</span>
          </strong>
          <small>架空の候補者データ</small>
        </div>
        <div className="stat">
          <p>記録の確認待ち</p>
          <strong>
            {interviews.filter((i) => i.status === 'review_pending').length}
            <span>件</span>
          </strong>
          <small>サンプル記録を閲覧できます</small>
        </div>
        <div className="stat">
          <p>公開中の求人サンプル</p>
          <strong>
            1<span>件</span>
          </strong>
          <small>プロダクトデザイナー</small>
        </div>
      </div>
      <section className="card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">INTERVIEWS</p>
            <h2>最近の面談</h2>
          </div>
          <Link className="text-link" to="/interviews">
            すべて見る →
          </Link>
        </div>
        <InterviewTable />
      </section>
      <section className="intro-card">
        <div>
          <p className="eyebrow">CANDIDATE EXPERIENCE</p>
          <h2>候補者には、こんな体験を。</h2>
          <p>説明から対話、終了までの流れを確認できます。</p>
        </div>
        <Link className="button secondary" to="/candidate/demo">
          候補者の画面を見る →
        </Link>
      </section>
    </>
  );
}

function Jobs() {
  return (
    <>
      <Heading
        eyebrow="JOBS"
        title="求人・質問設定"
        description="対話で確かめたいことを、求人ごとに整理します。"
      />
      <section className="card job-card">
        <div className="section-heading">
          <span className="badge green">サンプル求人</span>
          <span className="muted">JOB 01</span>
        </div>
        <h2>プロダクトデザイナー</h2>
        <p className="muted">プロダクト開発部 / 正社員</p>
        <p>これまでの経験と、チームでのものづくりについて伺います。</p>
        <div className="card-actions">
          <Link className="button primary" to="/jobs/demo">
            求人・質問を確認 →
          </Link>
          <Link className="text-link" to="/interviews/invite">
            招待画面へ
          </Link>
        </div>
      </section>
    </>
  );
}

function JobSettings() {
  const { jobId } = useParams();
  if (jobId !== 'demo') return <NotFound />;
  return (
    <>
      <Link className="back-link" to="/jobs">
        ← 求人一覧へ
      </Link>
      <Heading
        eyebrow="JOB SETTINGS"
        title="求人と質問を設定"
        description="入力欄は画面確認用です。内容は保存されません。"
      />
      <section className="card form-card">
        <label htmlFor="job-title">求人名</label>
        <input
          id="job-title"
          defaultValue="プロダクトデザイナー"
          maxLength={100}
          autoComplete="off"
        />
        <label htmlFor="job-description">求人の説明</label>
        <textarea
          id="job-description"
          defaultValue="ユーザーの課題を捉え、チームとともにプロダクトをつくる仕事です。"
          maxLength={2000}
          rows={3}
        />
        <label htmlFor="job-questions">対話で確認する質問</label>
        <textarea
          id="job-questions"
          defaultValue={
            'これまでに担当したプロジェクトを教えてください。\nチームで意見が分かれたとき、どう進めましたか。\n今回の仕事で取り組んでみたいことを教えてください。'
          }
          maxLength={2000}
          rows={5}
        />
        <p className="field-help">個人情報や実際の候補者情報は入力しないでください。</p>
        <div className="card-actions">
          <UnavailableButton className="button primary">設定を保存</UnavailableButton>
          <Link className="text-link" to="/interviews/invite">
            招待画面へ →
          </Link>
        </div>
      </section>
    </>
  );
}

function Interviews() {
  return (
    <>
      <Heading
        eyebrow="INTERVIEWS"
        title="面談一覧"
        description="対話の状況と、担当者が確認する記録をまとめています。"
      >
        <Link className="button primary" to="/interviews/invite">
          ＋ 候補者を招待
        </Link>
      </Heading>
      <section className="card">
        <InterviewTable />
      </section>
    </>
  );
}

function Invite() {
  return (
    <>
      <Link className="back-link" to="/interviews">
        ← 面談一覧へ
      </Link>
      <Heading
        eyebrow="INVITATION"
        title="候補者を招待"
        description="求人を選び、候補者との対話の入口を用意します。"
      />
      <div className="two-columns">
        <section className="card form-card">
          <label htmlFor="invite-job">対象の求人</label>
          <select id="invite-job">
            <option>プロダクトデザイナー</option>
          </select>
          <div className="info-box">
            <strong>招待リンクはまだ発行できません</strong>
            <p>API接続後に、有効期限付きの招待リンクを発行します。</p>
          </div>
          <UnavailableButton className="button primary">招待リンクを発行</UnavailableButton>
        </section>
        <section className="card">
          <p className="eyebrow">PREVIEW</p>
          <h2>候補者の画面を確認</h2>
          <p className="muted">招待や送信をせずに、サンプルの画面遷移を確認できます。</p>
          <Link className="button secondary" to="/candidate/demo">
            候補者の画面を開く →
          </Link>
        </section>
      </div>
    </>
  );
}

function Report() {
  const { interviewId } = useParams();
  const interview = interviews.find((i) => i.id === interviewId && i.status === 'review_pending');
  if (!interview) return <NotFound />;
  return (
    <>
      <Link className="back-link" to="/interviews">
        ← 面談一覧へ
      </Link>
      <Heading
        eyebrow="INTERVIEW RECORD"
        title={`${interview.candidate}の面談記録`}
        description="架空の記録です。音声やAIから生成した結果ではありません。"
      >
        <span className="badge green">サンプル記録</span>
      </Heading>
      <div className="two-columns report-columns">
        <section className="card">
          <p className="eyebrow">SUMMARY</p>
          <h2>対話の要点</h2>
          <p>
            ユーザー調査から画面設計まで、一連のプロダクトづくりを経験。異なる職種と協力しながら進める姿勢について話しています。
          </p>
          <div className="record-item">
            <span className="badge">質問 01</span>
            <h3>これまでのプロジェクトについて</h3>
            <p>
              利用者へのヒアリングを通じて課題を整理し、改善案を提案したというサンプル回答です。
            </p>
            <details>
              <summary>発言の根拠を見る</summary>
              <blockquote>
                「まず利用者に話を聞いて、チームで課題の優先順位を整理しました。」
              </blockquote>
              <p className="field-help">架空の発言例です。録音はありません。</p>
            </details>
          </div>
          <div className="record-item">
            <span className="badge">未確認</span>
            <h3>次の面談で確認したいこと</h3>
            <p>プロジェクトにおける本人の具体的な担当範囲。</p>
          </div>
        </section>
        <section className="card report-side">
          <h2>担当者の確認</h2>
          <p className="muted">根拠と未確認事項を確認し、人が次の工程を判断します。</p>
          <label htmlFor="review-note">確認メモ</label>
          <textarea id="review-note" placeholder="画面確認用のメモ" maxLength={1000} rows={5} />
          <p className="field-help">メモは保存されません。</p>
          <UnavailableButton className="button primary">確認結果を保存</UnavailableButton>
          <UnavailableButton>記録をダウンロード</UnavailableButton>
        </section>
      </div>
    </>
  );
}

function Members() {
  return (
    <>
      <Heading
        eyebrow="WORKSPACE SETTINGS"
        title="メンバー・権限"
        description="企業のメンバーと、記録にアクセスできる範囲を管理します。"
      />
      <section className="card">
        <div className="member-row">
          <span className="workspace-avatar">S</span>
          <div>
            <strong>サンプル管理者</strong>
            <p className="muted">架空のメンバー</p>
          </div>
          <span className="badge green">管理者</span>
        </div>
        <div className="card-actions">
          <UnavailableButton>メンバーを追加</UnavailableButton>
        </div>
      </section>
    </>
  );
}

function Login() {
  return (
    <div className="standalone">
      <header>
        <Brand />
        <span className="badge">画面確認用</span>
      </header>
      <main className="login-card">
        <p className="eyebrow">WELCOME TO HAAS</p>
        <h1 tabIndex={-1}>
          対話の先に、
          <br />
          人が見える採用を。
        </h1>
        <p className="muted">企業向け採用ワークスペース</p>
        <div className="info-box">
          ログインは現在利用できません。メールアドレスやパスワードの入力は不要です。
        </div>
        <UnavailableButton className="button primary full-width">ログイン</UnavailableButton>
        <Link className="button secondary full-width" to="/">
          サンプル画面を開く →
        </Link>
      </main>
      <p className="standalone-foot">HaaS 採用対話 / SCREEN PROTOTYPE</p>
    </div>
  );
}

const candidateSteps = ['ご案内', '利用前の確認', '対話', '完了'];
function CandidateLayout() {
  const path = useLocation().pathname;
  const step = path.endsWith('/check')
    ? 1
    : path.endsWith('/conversation')
      ? 2
      : path.endsWith('/complete')
        ? 3
        : 0;
  return (
    <div className="standalone candidate-shell">
      <a className="skip-link" href="#main">
        本文へ移動
      </a>
      <header>
        <Brand />
        <Link className="text-link" to="/">
          企業画面へ戻る
        </Link>
      </header>
      <main id="main" className="candidate-main">
        <Notice />
        <ol className="steps" aria-label="面談の流れ">
          {candidateSteps.map((name, i) => (
            <li
              key={name}
              className={i === step ? 'current' : i < step ? 'past' : ''}
              aria-current={i === step ? 'step' : undefined}
            >
              <span>{i < step ? '✓' : i + 1}</span>
              {name}
            </li>
          ))}
        </ol>
        <Outlet />
      </main>
      <p className="standalone-foot">HaaS 採用対話 / 画面確認用のサンプル</p>
    </div>
  );
}

function CandidateIntro() {
  return (
    <section className="card candidate-card">
      <span className="badge green">サンプル株式会社</span>
      <p className="eyebrow spaced">A CONVERSATION ABOUT YOU</p>
      <h1 tabIndex={-1}>
        あなたの経験を、
        <br />
        あなたの言葉で。
      </h1>
      <p className="muted">プロダクトデザイナー / 事前ヒアリング</p>
      <p>
        これまで取り組んできたこと、これから挑戦したいこと。対話を通じて、あなたの経験を伺います。
      </p>
      <div className="feature-grid">
        <div>
          <strong>自分のペースで</strong>
          <p>考えながら、言い直しても大丈夫。</p>
        </div>
        <div>
          <strong>人が記録を確認</strong>
          <p>担当者が内容を確認し、次へ進めます。</p>
        </div>
      </div>
      <div className="info-box">
        現在は画面の流れだけを確認できます。音声の送信・録音・応募は行いません。
      </div>
      <Link className="button primary full-width" to="/candidate/demo/check">
        利用前の確認へ →
      </Link>
    </section>
  );
}

function CandidateCheck() {
  const [agreed, setAgreed] = useState(false);
  return (
    <section className="card candidate-card">
      <p className="eyebrow">BEFORE YOU START</p>
      <h1 tabIndex={-1}>利用前の確認</h1>
      <p className="muted">落ち着いてお話しいただける環境をご準備ください。</p>
      <div className="info-box">
        <strong>音声機能は現在利用できません</strong>
        <p>マイクの許可を求めたり、録音したりすることはありません。</p>
      </div>
      <UnavailableButton>マイクを確認</UnavailableButton>
      <div className="consent">
        <h2>説明と同意の確認</h2>
        <p>
          本番では、AIの利用、記録の目的、保存期間、中止方法をここで説明します。現在の同意欄は画面確認用で、正式な同意は記録しません。
        </p>
        <label className="checkbox">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          画面確認用の説明を確認しました
        </label>
      </div>
      {agreed ? (
        <Link className="button primary full-width" to="/candidate/demo/conversation">
          対話画面へ進む →
        </Link>
      ) : (
        <button className="button primary full-width" disabled>
          対話画面へ進む →
        </button>
      )}
      <Link className="back-link" to="/candidate/demo">
        ← ご案内に戻る
      </Link>
    </section>
  );
}

function Conversation() {
  return (
    <section className="card candidate-card conversation-card">
      <p className="eyebrow">CONVERSATION</p>
      <h1 tabIndex={-1}>対話の準備ができました</h1>
      <div className="voice-orb" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <h2>音声対話は現在利用できません</h2>
      <p className="muted">
        API接続後に、ここから対話を始められます。
        <br />
        現在は音声の送信・録音を行いません。
      </p>
      <UnavailableButton className="button primary">音声対話を開始</UnavailableButton>
      <div className="conversation-bottom">
        <Link className="button secondary full-width" to="/candidate/demo/complete">
          画面確認として完了画面へ →
        </Link>
        <Link className="back-link" to="/candidate/demo/check">
          ← 利用前の確認に戻る
        </Link>
        <Link className="text-link" to="/candidate/demo">
          中止してご案内へ戻る
        </Link>
      </div>
    </section>
  );
}

function Complete() {
  return (
    <section className="card candidate-card completion-card">
      <span className="checkmark" aria-hidden="true">
        ✓
      </span>
      <p className="eyebrow spaced">PREVIEW COMPLETE</p>
      <h1 tabIndex={-1}>画面の確認が完了しました</h1>
      <p className="muted">
        説明から対話、終了までの流れは以上です。
        <br />
        面談の送信・応募・録音は行っていません。
      </p>
      <Link className="button primary full-width" to="/candidate/demo">
        もう一度確認する
      </Link>
      <Link className="back-link" to="/">
        企業側のサンプル画面へ →
      </Link>
    </section>
  );
}

function NotFound() {
  return (
    <section className="card not-found">
      <p className="eyebrow">404 / PAGE NOT FOUND</p>
      <h1 tabIndex={-1}>ページが見つかりません</h1>
      <p className="muted">画面確認用のリンクから、もう一度お試しください。</p>
      <Link className="button primary" to="/">
        概要へ戻る
      </Link>
    </section>
  );
}

function RouteFocus() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <>
      <RouteFocus />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<AdminLayout />}>
          <Route index element={<Overview />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="jobs/:jobId" element={<JobSettings />} />
          <Route path="interviews" element={<Interviews />} />
          <Route path="interviews/invite" element={<Invite />} />
          <Route path="interviews/:interviewId/report" element={<Report />} />
          <Route path="settings/members" element={<Members />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="candidate/demo" element={<CandidateLayout />}>
          <Route index element={<CandidateIntro />} />
          <Route path="check" element={<CandidateCheck />} />
          <Route path="conversation" element={<Conversation />} />
          <Route path="complete" element={<Complete />} />
        </Route>
      </Routes>
    </>
  );
}
