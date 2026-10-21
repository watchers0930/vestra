import { z } from "zod";
export const analysisInputSchema = z.object({
  // 정제 후 50,000자 제한과 별개로 원본 입력도 제한한다.
  rawText: z.string().max(60000),
  estimatedPrice: z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
  userDeposit: z.number().finite().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
  ownJeonseRight: z.object({ order: z.number().int().positive(), holder: z.string().trim().min(1).max(200) }).optional(),
  address: z.string().max(300).optional(),
  source: z.string().max(64).optional(),
});
