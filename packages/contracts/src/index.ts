import { z } from 'zod';

export const unavailableResponseSchema = z.object({
  error: z.object({
    code: z.literal('SERVICE_UNAVAILABLE'),
    message: z.string(),
  }),
});

export const unavailableResponse = unavailableResponseSchema.parse({
  error: {
    code: 'SERVICE_UNAVAILABLE',
    message: 'APIは現在利用できません。画面確認用のサンプルです。',
  },
});
