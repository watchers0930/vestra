export interface CallbackEnvelope { payload: string; signature: string }
export interface IdentityResult {
  nonce: string;
  transactionId: string;
  guestName: string;
  guestPhone: string;
  approved: boolean;
  expiresAt: number;
}
export interface PaymentResult {
  verificationReference?: string;
  orderId: string;
  transactionId: string;
  merchantId: string;
  amount: number;
  currency: string;
  paidAt: number;
  status: "paid" | "failed" | "canceled" | "refunded";
  expiresAt: number;
}
export interface IdentityAdapter {
  startVerification(input: { nonce: string; expiresAt: Date }): Promise<Record<string, string>>;
  verifyResult(input: unknown): Promise<IdentityResult>;
}
export interface PaymentAdapter {
  createPayment(input: { orderId: string; amount: number; currency: string; expiresAt: Date }): Promise<Record<string, string>>;
  verifyPayment(input: unknown): Promise<PaymentResult>;
  getPayment(transactionId: string): Promise<PaymentResult>;
  cancelPayment(transactionId: string): Promise<never>;
}
export interface DanalProvider { mode: "mock" | "danal"; merchantId: string; identity: IdentityAdapter; payment: PaymentAdapter }
