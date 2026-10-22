export type InterviewStatus = 'invited' | 'in_progress' | 'review_pending';

export const interviewStatusLabels: Record<InterviewStatus, string> = {
  invited: '対話待ち',
  in_progress: '対話中',
  review_pending: '確認待ち',
};

export interface Interview {
  id: string;
  candidate: string;
  job: string;
  status: InterviewStatus;
}
