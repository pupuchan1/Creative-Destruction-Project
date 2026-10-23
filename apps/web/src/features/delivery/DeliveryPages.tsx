import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { campaigns, findCampaign, integrationMarkup } from './model';
import type { Campaign } from './model';

export function CandidateBrand() {
  return (
    <span className="brand">
      <span className="brand-mark" aria-hidden="true">
        H
      </span>
      <span>
        HaaS<small>採用ヒアリング</small>
      </span>
    </span>
  );
}

function PublicShell({ children, company }: { children: ReactNode; company?: Campaign }) {
  return (
    <div className="standalone delivery-shell">
      <a className="skip-link" href="#main">
        本文へ移動
      </a>
      <header>
        <CandidateBrand />
        <span className="muted">{company?.companyName ?? '受検のご案内'}</span>
      </header>
      <main id="main" className="delivery-main">
        {children}
      </main>
      <p className="standalone-foot">Powered by HaaS / 架空の企業による画面確認用サンプル</p>
    </div>
  );
}

export function InvalidInvitation() {
  return (
    <PublicShell>
      <section className="card">
        <p className="eyebrow">LINK UNAVAILABLE</p>
        <h1 tabIndex={-1}>この受検リンクは利用できません</h1>
        <p>
          案内元の企業にリンクをご確認ください。実際の招待の期限・失効確認は、API接続後に提供します。
        </p>
        <p className="muted">このデモでは、登録済みの架空リンクだけを表示します。</p>
      </section>
    </PublicShell>
  );
}

export function CareersExample() {
  const { companySlug } = useParams();
  const campaign = campaigns.find((item) => item.companySlug === companySlug);
  if (!campaign) return <InvalidInvitation />;
  return (
    <PublicShell company={campaign}>
      <div className="info-box">
        各社の採用サイトに置く入口のイメージです。このページ自体もHaaS内の架空サンプルです。
      </div>
      <section className="careers-hero">
        <p className="eyebrow">{campaign.companyName} / CAREERS</p>
        <h1 tabIndex={-1}>
          あなたとつくる、
          <br />
          <span className="accent">次の可能性。</span>
        </h1>
        <p>{campaign.description}</p>
      </section>
      <section className="card entry-module" aria-label="採用サイトに設置するカード">
        <div>
          <p className="eyebrow">FIRST CONVERSATION</p>
          <h2>まずは、あなたのことを。</h2>
          <p>4つの質問を通じて、経験と仕事の希望を整理します。HaaSの専用ページへ移動します。</p>
        </div>
        <Link className="button primary" to={`/apply/${campaign.id}`}>
          事前ヒアリングへ進む ↗
        </Link>
      </section>
    </PublicShell>
  );
}

export function CampaignLanding() {
  const { campaignId } = useParams();
  const campaign = findCampaign(campaignId);
  const [unavailable, setUnavailable] = useState(false);
  if (!campaign) return <InvalidInvitation />;
  return (
    <PublicShell company={campaign}>
      <section className="card campaign-intro">
        <span className="badge blue">{campaign.companyName}</span>
        <p className="eyebrow spaced">HOSTED BY HAAS</p>
        <h1 tabIndex={-1}>{campaign.title}</h1>
        <p>{campaign.description}</p>
        <ol className="delivery-flow">
          <li>
            <strong>01</strong>ご案内・仕事の希望
          </li>
          <li>
            <strong>02</strong>4つの質問に回答
          </li>
          <li>
            <strong>03</strong>要約を訂正して提出
          </li>
        </ol>
        <div className="info-box">
          <strong>ブラウザで受けられる、企業専用のヒアリング</strong>
          <p>
            提出する前に内容を確認し、答え直し・補足ができます。本番では、ご本人専用の受検リンクから進みます。
          </p>
        </div>
        <button className="button primary" onClick={() => setUnavailable(true)}>
          受検リンクを取得する
        </button>
        {unavailable && (
          <p className="feedback" role="status">
            現在利用できません。招待APIが未接続のため、個別リンクは発行せず、情報も送信しません。
          </p>
        )}
        <div className="demo-entry">
          <span className="badge">画面確認用</span>
          <p>ダミーの受検リンクで、提出前までの流れを試せます。個人情報の入力は不要です。</p>
          <Link className="button secondary" to={`/candidate/${campaign.demoInvitationId}`}>
            ダミーの受検リンクで試す →
          </Link>
        </div>
        <Link className="back-link" to={`/careers/${campaign.companySlug}`}>
          ← {campaign.companyName}の採用サイトへ戻る
        </Link>
      </section>
    </PublicShell>
  );
}

export function IntegrationSettings() {
  const campaign = campaigns[0]!;
  const [style, setStyle] = useState<'button' | 'card'>('button');
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">WEBSITE INTEGRATION</p>
          <h1 tabIndex={-1}>採用サイトへの設置</h1>
          <p className="muted">自社サイトの入口から、HaaSの専用ページへ案内します。</p>
        </div>
      </div>
      <ol className="delivery-flow">
        <li>
          <strong>01</strong>採用サイトに入口を設置
        </li>
        <li>
          <strong>02</strong>候補者がHaaSで受検
        </li>
        <li>
          <strong>03</strong>提出内容を企業が確認
        </li>
      </ol>
      <div className="two-columns">
        <section className="card integration-config">
          <p className="eyebrow">INSTALL</p>
          <h2>ボタンまたはカードを設置</h2>
          <p>
            JavaScript
            SDKの導入は不要です。公開の案内ページへのリンクを、既存サイトのHTMLに追加する構成です。
          </p>
          <fieldset className="preference-fieldset">
            <legend>入口の形</legend>
            <div className="integration-options">
              <label>
                <input
                  type="radio"
                  name="entry-style"
                  checked={style === 'button'}
                  onChange={() => setStyle('button')}
                />{' '}
                ボタン
              </label>
              <label>
                <input
                  type="radio"
                  name="entry-style"
                  checked={style === 'card'}
                  onChange={() => setStyle('card')}
                />{' '}
                カード
              </label>
            </div>
          </fieldset>
          <label className="answer-label" htmlFor="integration-code">
            設置用HTMLの例
          </label>
          <textarea
            id="integration-code"
            readOnly
            rows={style === 'card' ? 9 : 4}
            value={integrationMarkup(campaign, style)}
          />
          <p className="field-help">
            .exampleは説明用のドメインです。本番のHTTPS
            URL確定後に置き換えます。実際の公開リンクや招待を発行した状態ではありません。
          </p>
        </section>
        <section className="card">
          <p className="eyebrow">PREVIEW</p>
          <h2>候補者の入口を確認</h2>
          <div className={`module-preview ${style === 'card' ? 'module-preview-card' : ''}`}>
            {style === 'card' && (
              <>
                <h3>あなたの経験をお聞かせください</h3>
                <p>HaaSの専用ページで、経験と仕事の希望を整理できます。</p>
              </>
            )}
            <Link className="button primary" to={`/apply/${campaign.id}`}>
              事前ヒアリングへ進む（HaaS）↗
            </Link>
          </div>
          <Link className="back-link" to={`/careers/${campaign.companySlug}`}>
            採用サイトへの設置例を見る →
          </Link>
          <div className="info-box">
            <strong>個別の受検リンクは別に発行</strong>
            <p>
              公開カードには候補者情報や認証情報を入れません。求人と企業に紐づく案内ページから、個別招待へつなぎます。
            </p>
          </div>
          <Link className="text-link" to="/interviews/invite">
            個別招待の画面へ →
          </Link>
        </section>
      </div>
      <section className="card">
        <h2>提出後は、企業のワークスペースへ</h2>
        <p>
          本番ではHaaS内で結果を確認し、必要に応じて採用管理システムへ連携します。API未接続のため、今は独立した架空記録で表示を確認できます。
        </p>
        <Link className="text-link" to="/interviews/sample-a/report">
          企業側の結果サンプルを見る →
        </Link>
      </section>
    </>
  );
}
