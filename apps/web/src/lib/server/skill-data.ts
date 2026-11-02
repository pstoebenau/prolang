import { z } from 'zod';
export const readingSchema = z
  .object({
    id: z.string().uuid(),
    passageId: z.string(),
    at: z.iso.datetime(),
    target: z.string().min(1).max(3000),
    level: z.number().int().min(0).max(3),
    placement: z.boolean(),
    feedback: z
      .object({ score: z.number().min(0).max(100) })
      .catchall(z.json()),
  })
  .strict();
export const vocabularyResultSchema = z
  .object({
    id: z.string().uuid(),
    at: z.iso.datetime(),
    mode: z.enum(['recognition', 'recall']),
    answers: z
      .array(
        z
          .object({
            itemId: z.string(),
            answer: z.string().max(200),
            correct: z.boolean(),
          })
          .strict(),
      )
      .length(16),
  })
  .strict();
