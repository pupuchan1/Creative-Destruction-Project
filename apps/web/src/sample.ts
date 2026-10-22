import type { Interview } from '@haas/domain';

// All entries are fictional, bundled fixtures. Never put real candidate data here.
export const interviews: Interview[] = [
  { id: 'sample-a', candidate: '候補者 A', job: 'プロダクトデザイナー', status: 'review_pending' },
  { id: 'sample-b', candidate: '候補者 B', job: 'プロダクトデザイナー', status: 'review_pending' },
  { id: 'sample-c', candidate: '候補者 C', job: 'プロダクトデザイナー', status: 'invited' },
];
