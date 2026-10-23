import type { RoleId } from '../candidate/demo';

// Public, fictional configuration only. These IDs are not authorization credentials.
export interface Campaign {
  id: string;
  companySlug: string;
  companyName: string;
  title: string;
  description: string;
  initialRole: RoleId;
  demoInvitationId: string;
}

export const campaigns: Campaign[] = [
  {
    id: 'sample-open',
    companySlug: 'sample',
    companyName: 'サンプル株式会社',
    title: 'オープンポジション / 事前ヒアリング',
    description: '興味のある仕事とこれまでの経験から、あなたに合う働き方を一緒に考えます。',
    initialRole: 'designer',
    demoInvitationId: 'demo',
  },
  {
    id: 'sora-engineering',
    companySlug: 'sora',
    companyName: 'ソラテック株式会社',
    title: 'Web開発チーム / 事前ヒアリング',
    description: 'ものづくりの経験や、Web開発でこれから挑戦したいことをお聞かせください。',
    initialRole: 'engineer',
    demoInvitationId: 'sora-demo',
  },
];

export function findCampaign(id: string | undefined) {
  return campaigns.find((campaign) => campaign.id === id);
}

export function findDemoInvitation(id: string | undefined) {
  return campaigns.find((campaign) => campaign.demoInvitationId === id);
}

// Deployment must supply the real, HTTPS assessment origin before this is distributed.
export function integrationMarkup(campaign: Campaign, style: 'button' | 'card') {
  const href = `https://assessment.haas.example/apply/${campaign.id}`;
  if (style === 'card') {
    return `<section aria-label="${campaign.companyName}の事前ヒアリング">\n  <h2>あなたの経験をお聞かせください</h2>\n  <p>HaaSの専用ページで、経験と仕事の希望を整理できます。</p>\n  <a href="${href}" referrerpolicy="no-referrer">事前ヒアリングへ進む（HaaS）</a>\n</section>`;
  }
  return `<a href="${href}" referrerpolicy="no-referrer">事前ヒアリングへ進む（HaaS）</a>`;
}
