import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, NavLink, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { interviewStatusLabels } from '@haas/domain';
import { interviews } from './sample';
import {
  CandidateFlowProvider,
  CandidateCheck,
  Conversation,
  CandidateSummary,
  Complete,
  CandidateReview,
  useCandidate,
} from './features/candidate/CandidateFlow';
import { findDemoInvitation } from './features/delivery/model';
import {
  CandidateBrand,
  CareersExample,
  CampaignLanding,
  IntegrationSettings,
  InvalidInvitation,
} from './features/delivery/DeliveryPages';

function Brand() {
  return (
    <Link className="brand" to="/" aria-label="HaaS ホーム">
      <span className="brand-mark" aria-hidden="true">
        H
      </span>
      <span>
        HaaS<small>HUMAN AS A SERVICE</small>
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
      <header className="site-header">
        <Brand />
        <nav aria-label="メインナビゲーション">
          <NavLink end to="/">
            概要
          </NavLink>
          <NavLink to="/jobs">求人・質問設定</NavLink>
          <NavLink to="/interviews">面談一覧</NavLink>
          <NavLink to="/settings/integration">サイトへの設置</NavLink>
          <NavLink to="/settings/members">メンバー・権限</NavLink>
        </nav>
        <div className="header-actions">
          <Link className="text-link" to="/candidate/demo">
            候補者の画面 <span aria-hidden="true">↗</span>
          </Link>
          <Link className="account-link" to="/login" aria-label="ログイン画面へ">
            S
          </Link>
        </div>
      </header>
      <div className="workspace-body">
        <div className="workspace-bar">
          <span>
            <span className="dot" /> サンプル株式会社 <span className="muted">/ 採用管理</span>
          </span>
          <span className="workspace-label">HIRING WORKSPACE</span>
        </div>
        <main id="main" className="admin-main">
          <Notice />
          <Outlet />
        </main>
        <footer className="workspace-footer">
          <strong>HaaS</strong>
          <span>人を知るための対話を、もっと自然に。</span>
          <span className="footer-label">HUMAN AS A SERVICE.</span>
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
                <span className={`badge ${interview.status === 'review_pending' ? 'blue' : ''}`}>
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
      <div className="overview-hero">
        <Heading
          eyebrow="01 / HIRING OVERVIEW"
          title="採用の、今を見渡す。"
          description="候補者との対話と、次のアクションをひとつの場所に。"
        >
          <Link className="button primary" to="/settings/integration">
            採用サイトに設置 <span aria-hidden="true">↗</span>
          </Link>
        </Heading>
        <div className="overview-note">
          <span className="eyebrow">YOUR NEXT STEP</span>
          <p>
            対話を、
            <br />
            <strong>次の出会いへ。</strong>
          </p>
          <Link to="/interviews" className="text-link">
            確認待ちの記録を見る →
          </Link>
        </div>
      </div>
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
          <p>求人サンプル</p>
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
        <span className="intro-index" aria-hidden="true">
          02
        </span>
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
          <span className="badge blue">サンプル求人</span>
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
        description="企業と求人に紐づく、ご本人専用の受検リンクを用意します。"
      />
      <div className="two-columns">
        <section className="card form-card">
          <label htmlFor="invite-job">対象の求人</label>
          <select id="invite-job">
            <option>プロダクトデザイナー</option>
          </select>
          <div className="info-box">
            <strong>招待リンクはまだ発行できません</strong>
            <p>
              API接続後に、企業・求人・候補者を紐づけた有効期限付きリンクを発行します。公開サイトに貼る案内リンクとは別です。
            </p>
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
        description="提出後に企業が確認する結果の表示例です。候補者デモとは独立した架空記録です。"
      >
        <span className="badge blue">サンプル記録</span>
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
          <span className="badge blue">管理者</span>
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
    <div className="standalone login-shell">
      <header>
        <Brand />
        <span className="badge">画面確認用</span>
      </header>
      <main className="login-card">
        <div className="login-story">
          <p className="eyebrow">HUMAN AS A SERVICE.</p>
          <h1 tabIndex={-1}>
            対話の先に、
            <br />
            <span className="accent">人が見える</span>採用を。
          </h1>
          <p className="muted">
            一人ひとりの言葉を、次の出会いにつなぐ。
            <br />
            HaaSの採用ワークスペース。
          </p>
          <div className="login-signature" aria-hidden="true">
            H<span>aa</span>S<span className="signature-dot">.</span>
          </div>
        </div>
        <section className="login-panel">
          <p className="eyebrow">WORKSPACE ACCESS</p>
          <h2>ワークスペースへ</h2>
          <div className="info-box">
            ログインは現在利用できません。メールアドレスやパスワードの入力は不要です。
          </div>
          <UnavailableButton className="button primary full-width">ログイン</UnavailableButton>
          <Link className="button secondary full-width" to="/">
            サンプル画面を開く →
          </Link>
          <p className="field-help">現在は画面確認用のサンプルをお試しいただけます。</p>
        </section>
      </main>
      <p className="standalone-foot">HaaS 採用対話 / SCREEN PROTOTYPE</p>
    </div>
  );
}

const candidateSteps = ['ご案内', '仕事の希望', '質問に回答', '要約の確認', '提出前確認', '完了'];
function CandidateLayout() {
  const path = useLocation().pathname;
  const { invitationId } = useParams();
  const campaign = findDemoInvitation(invitationId);
  if (!campaign) return <InvalidInvitation />;
  const step = path.endsWith('/check')
    ? 1
    : path.endsWith('/conversation')
      ? 2
      : path.endsWith('/summary')
        ? 3
        : path.endsWith('/review')
          ? 4
          : path.endsWith('/complete')
            ? 5
            : 0;
  return (
    <CandidateFlowProvider key={invitationId} campaign={campaign}>
      <div className="standalone candidate-shell">
        <a className="skip-link" href="#main">
          本文へ移動
        </a>
        <header>
          <CandidateBrand />
          <Link className="text-link" to={`/careers/${campaign.companySlug}`}>
            採用サイトへ戻る
          </Link>
        </header>
        <main id="main" className={`candidate-main candidate-step-${step}`}>
          <Notice />
          <div className="candidate-company">
            <strong>{campaign.companyName}</strong>
            <span>{campaign.title}</span>
          </div>
          <ol className="steps" aria-label="面談の流れ">
            {candidateSteps.map((name, i) => (
              <li
                key={name}
                className={i === step ? 'current' : i < step ? 'past' : ''}
                aria-current={i === step ? 'step' : undefined}
              >
                <span>{i < step ? '✓' : String(i + 1).padStart(2, '0')}</span>
                {name}
              </li>
            ))}
          </ol>
          <Outlet />
        </main>
        <p className="standalone-foot">HaaS 採用対話 / 画面確認用のサンプル</p>
      </div>
    </CandidateFlowProvider>
  );
}

function CandidateIntro() {
  const { campaign, base } = useCandidate();
  return (
    <section className="card candidate-card candidate-intro">
      <div className="candidate-hero">
        <div className="candidate-copy">
          <span className="badge blue">{campaign.companyName}</span>
          <p className="eyebrow spaced">A CONVERSATION ABOUT YOU</p>
          <h1 tabIndex={-1}>
            あなたの経験を、
            <br />
            <span className="accent">あなたの言葉で。</span>
          </h1>
          <p className="muted">興味のある仕事と、あなたの経験を整理する事前ヒアリング</p>
          <p>
            やってみたい仕事を選び、4つの質問に回答。お話の要点を次の画面で確認し、伝え足りないことを補足できます。今回はダミー回答で一連の流れを体験できます。
          </p>
          <Link className="button primary" to={`${base}/check`}>
            利用前の確認へ <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className="candidate-visual" aria-hidden="true">
          <div className="visual-caption">LISTEN. UNDERSTAND. CONNECT.</div>
          <div className="blue-orb">
            <i />
            <i />
            <i />
          </div>
          <span className="visual-number">H / 01</span>
        </div>
      </div>
      <div className="feature-grid">
        <div>
          <span className="feature-number" aria-hidden="true">
            01
          </span>
          <strong>興味と経験を伝える</strong>
          <p>職種を選び、経験やこれからの希望を4つの質問で整理します。</p>
        </div>
        <div>
          <span className="feature-number" aria-hidden="true">
            02
          </span>
          <strong>要約を見て、何度でも直す</strong>
          <p>受け取った内容を確認し、答え直しや補足で整えられます。</p>
        </div>
      </div>
      <div className="info-box">
        ダミー回答も、自分で書き直した文章も確認できます。音声の送信・録音・応募は行いません。入力は再読み込みで消えます。
      </div>
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
  const { pathname, search } = useLocation();
  useEffect(() => {
    document.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [pathname, search]);
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
          <Route path="settings/integration" element={<IntegrationSettings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="careers/:companySlug" element={<CareersExample />} />
        <Route path="apply/:campaignId" element={<CampaignLanding />} />
        <Route path="candidate/:invitationId" element={<CandidateLayout />}>
          <Route index element={<CandidateIntro />} />
          <Route path="check" element={<CandidateCheck />} />
          <Route path="conversation" element={<Conversation />} />
          <Route path="summary" element={<CandidateSummary />} />
          <Route path="review" element={<CandidateReview />} />
          <Route path="complete" element={<Complete />} />
        </Route>
      </Routes>
    </>
  );
}
