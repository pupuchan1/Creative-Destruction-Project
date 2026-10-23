export const roles = [
  { id: 'designer', label: 'プロダクトデザイン', description: '使いやすい画面や体験を考える' },
  { id: 'engineer', label: 'Webエンジニア', description: 'サービスや仕組みをつくる' },
  { id: 'marketing', label: 'マーケティング', description: 'サービスの魅力を人に届ける' },
  { id: 'exploring', label: 'まだ決まっていない', description: '興味や経験から一緒に整理する' },
] as const;

export type RoleId = (typeof roles)[number]['id'];
export type QuestionId = 'interest' | 'experience' | 'team' | 'learning';
export const interests = [
  '人の課題を解決したい',
  'ものづくりをしたい',
  '人と協力したい',
  '新しいことを学びたい',
];

export interface DemoQuestion {
  id: QuestionId;
  title: string;
  question: string;
  hint: string;
  sample: string;
  summary: string;
}

const profiles: Record<
  RoleId,
  { experience: string; experienceSummary: string; learning: string; learningSummary: string }
> = {
  designer: {
    experience:
      '大学のチーム制作で、学内イベントの申込画面を作りました。私は利用者へのヒアリングと画面設計を担当しました。5人に試してもらい、分かりにくかった入力項目を見直しました。',
    experienceSummary:
      '学内イベントの申込画面で、利用者ヒアリングと画面設計を担当。5人の試用をもとに入力項目を改善。',
    learning:
      'ユーザー調査と、使いやすさを確かめる方法をもっと学びたいです。エンジニアと相談しながら、実際に使われるサービスを作ってみたいです。',
    learningSummary:
      'ユーザー調査と使いやすさの検証を学び、エンジニアとサービスづくりに取り組みたい。',
  },
  engineer: {
    experience:
      '個人制作で、読んだ本を記録するWebアプリを作りました。Reactで一覧と検索画面を作り、友人3人に使ってもらって検索の操作を改善しました。',
    experienceSummary:
      'Reactで読書記録アプリの一覧と検索画面を制作。友人3人の試用をもとに検索の操作を改善。',
    learning:
      'バックエンドのAPI設計とテストを学びたいです。画面だけでなく、データを安全に扱う部分まで理解して開発できるようになりたいです。',
    learningSummary: 'API設計とテストを学び、データを安全に扱えるWeb開発に取り組みたい。',
  },
  marketing: {
    experience:
      '学生団体のイベント告知を担当しました。SNSに載せる文章と画像を作り、どの投稿から申し込みにつながったかをチームで振り返りました。',
    experienceSummary:
      '学生団体でSNS告知の文章と画像を制作。投稿と申し込みの関係をチームで振り返った。',
    learning:
      '数字を見ながら施策を改善する方法を学びたいです。サービスを使う人へのインタビューも経験して、伝え方を考えられるようになりたいです。',
    learningSummary: '数字に基づく施策改善と利用者インタビューを学び、伝え方を考えたい。',
  },
  exploring: {
    experience:
      '学園祭の運営チームで、当日の案内と準備の進行を担当しました。役割を一覧にして共有し、準備が重ならないように調整しました。',
    experienceSummary: '学園祭で案内と準備の進行を担当。役割の一覧を共有し、作業の重複を調整。',
    learning:
      '企画、デザイン、開発など、いくつかの仕事を体験してみたいです。まず小さなプロジェクトに参加して、自分が面白いと思えることを見つけたいです。',
    learningSummary:
      '企画・デザイン・開発を体験し、小さなプロジェクトから興味のある仕事を見つけたい。',
  },
};

export function getDemoQuestions(roleId: RoleId, selectedInterests: string[]): DemoQuestion[] {
  const profile = profiles[roleId];
  const role = roles.find((item) => item.id === roleId)!;
  const motivation = selectedInterests.length
    ? selectedInterests.join('、')
    : '自分に合う仕事を探したい';
  return [
    {
      id: 'interest',
      title: '興味のある仕事',
      question: 'どんな仕事をやってみたいですか？',
      hint: 'まだ決まっていなくても大丈夫です。気になる仕事と、その理由を教えてください。',
      sample: `${roleId === 'exploring' ? '職種はまだ決めていません。' : `${role.label}に興味があります。`}${motivation}と思っています。自分の経験を活かせる仕事に挑戦したいです。`,
      summary: `${roleId === 'exploring' ? '職種を検討中' : `${role.label}に興味がある`}。${motivation}という希望がある。`,
    },
    {
      id: 'experience',
      title: 'これまでの経験',
      question: 'これまでに取り組んだことを教えてください。',
      hint: '仕事、学校、個人制作などから一つ選び、自分の担当と工夫したことを話してみましょう。',
      sample: profile.experience,
      summary: profile.experienceSummary,
    },
    {
      id: 'team',
      title: '一緒に働くうえで大切なこと',
      question: 'チームで働くときに、大切にしたいことは何ですか？',
      hint: '相談のしかたや、意見が違ったときの進め方など、具体例があれば教えてください。',
      sample:
        '分からないことは早めに相談することを大切にしたいです。意見が違うときは、まず相手の理由を聞いて、何を優先するかを一緒に整理したいと思っています。',
      summary: '早めの相談を大切にし、意見が違うときは相手の理由と優先順位を一緒に整理したい。',
    },
    {
      id: 'learning',
      title: 'これから挑戦したいこと',
      question: 'これから身につけたいことや、挑戦してみたいことはありますか？',
      hint: '今できることだけでなく、これから学びたいことも教えてください。',
      sample: profile.learning,
      summary: profile.learningSummary,
    },
  ];
}
