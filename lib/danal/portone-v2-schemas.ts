// PortOne V2 결제 응답 스키마. 핵심 필드만 검증(나머지는 passthrough).
// ⚠️ PoC(§11.1) 실응답으로 필드명/구조를 반드시 재확인·보정한다.
import { z } from "zod";

// V2 결제 상태: READY | PAID | FAILED | CANCELLED | PARTIAL_CANCELLED | PAY_PENDING | VIRTUAL_ACCOUNT_ISSUED
export const v2PaymentSchema = z
  .object({
    id: z.string().min(1).max(200), // = paymentId (서버가 지정 = 기존 orderId)
    status: z.string().min(1),
    amount: z
      .object({
        total: z.number().finite(),
        paid: z.number().finite().nonnegative().optional(),
        cancelled: z.number().finite().nonnegative().optional(),
      })
      .passthrough(),
    currency: z.string().min(1),
    channel: z
      .object({
        pgProvider: z.string().optional(), // 다날 식별(DANAL 등)
        key: z.string().optional(),        // channel-key-xxxx
      })
      .passthrough()
      .optional(),
    paidAt: z.string().optional(),  // ISO8601
    pgTxId: z.string().optional(),  // PG 거래번호
  })
  .passthrough();

export type V2Payment = z.infer<typeof v2PaymentSchema>;
