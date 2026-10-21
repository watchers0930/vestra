// PortOne V2 결제 응답 스키마. 실응답(2026-10-21 t-vestra 실결제 GET /payments/{id})으로 확정.
// V1 SDK(다날)로 만든 결제도 V2 스토어에서는 V2 API로 조회되며 version="V1"로 표기된다.
import { z } from "zod";

// V2 결제 상태: READY | PAID | FAILED | CANCELLED | PARTIAL_CANCELLED | PAY_PENDING | VIRTUAL_ACCOUNT_ISSUED
export const v2PaymentSchema = z
  .object({
    id: z.string().min(1).max(200),        // = paymentId (= 서버 orderId, 다날 40자 한도 내)
    transactionId: z.string().optional(),  // 포트원 거래번호(V1 SDK 결제는 imp_xxxx)
    status: z.string().min(1),
    storeId: z.string().optional(),        // store-xxxx (스토어 대조)
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
        type: z.string().optional(),          // TEST | LIVE (sandbox 대응)
        pgProvider: z.string().optional(),    // DANAL_TPAY 등
        pgMerchantId: z.string().optional(),  // 다날 MID (pg_id 대조)
        key: z.string().optional(),           // channel-key-xxxx
      })
      .passthrough()
      .optional(),
    version: z.string().optional(),  // V1 | V2 (연동 세대)
    paidAt: z.string().optional(),   // ISO8601
    pgTxId: z.string().optional(),   // PG사 거래번호
  })
  .passthrough();

export type V2Payment = z.infer<typeof v2PaymentSchema>;
