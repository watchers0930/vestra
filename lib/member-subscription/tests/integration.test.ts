import { beforeAll, afterAll, afterEach, describe, it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import type { IamportPayment } from "@/lib/danal/iamport-rest";
import type { MemberOrderRequest } from "@/types/member-subscription";

// Isolated-DB integration harness for member subscriptions. Mirrors the guest
// integration pattern. Runs ONLY against a dedicated loopback database and is skipped
// otherwise, so CI without the DB stays green. The PG layer (iamport-rest) is mocked so
// no real charge is ever made; everything else runs against the real schema.
//
// NOTE: unexecuted until MEMBER_TEST_DATABASE_URL is attached (no local postgres here).
// Run with: MEMBER_TEST_DATABASE_URL=postgresql://<user>@127.0.0.1:55439/vestra_member_isolated \
//   npx vitest run --config lib/member-subscription/vitest.config.ts lib/member-subscription/tests/integration.test.ts

// Controllable fake PG. Tests set `pg.payment` to the snapshot the provider should return.
const pg = vi.hoisted(() => ({ payment: null as IamportPayment | null, impByMerchant: null as string | null }));
vi.mock("@/lib/danal/iamport-rest", async importOriginal => ({
  ...await importOriginal<typeof import("@/lib/danal/iamport-rest")>(),
  getPaymentByImpUid: vi.fn(async () => { if (!pg.payment) throw new Error("no fake payment set"); return pg.payment; }),
  findImpUidByMerchantUid: vi.fn(async () => pg.impByMerchant),
}));

const url = process.env.MEMBER_TEST_DATABASE_URL;
if (url && !/^postgresql:\/\/[^@]+@127\.0\.0\.1:55439\/vestra_member_isolated$/.test(url)) {
  throw new Error("Member integration tests require the dedicated loopback database (vestra_member_isolated)");
}
const integration = describe.skipIf(!url);

integration("isolated PostgreSQL member subscription contract", () => {
  let prisma: typeof import("@/lib/prisma").prisma;
  let raw: PrismaClient;
  let orders: typeof import("../orders");
  let callback: typeof import("../payment-callback");
  let recovery: typeof import("../recovery");
  let status: typeof import("../status");
  let trial: typeof import("../trial");
  let cron: typeof import("../cron");
  let ctx: typeof import("../callback-context");
  const MID = "9999";

  beforeAll(async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DATABASE_URL", url!);
    vi.stubEnv("DIRECT_URL", url!);
    vi.stubEnv("MEMBER_SUBSCRIPTION_ENABLED", "true");
    vi.stubEnv("MEMBER_POLICY_VERSION", "itest-policy");
    vi.stubEnv("NEXT_PUBLIC_MEMBER_PRICE_VERSION", "itest-price");
    vi.stubEnv("MEMBER_POLICY_EFFECTIVE_AT", "2026-01-01T00:00:00.000Z");
    vi.stubEnv("MEMBER_PAYMENT_ENVIRONMENT", "test");
    vi.stubEnv("MEMBER_SUBSCRIPTION_ISOLATED_TEST", "true");
    vi.stubEnv("MEMBER_MERCHANT_CONFIG_VERSION", "itest-mcv");
    vi.stubEnv("GUEST_PAYMENT_MODE", "portone_v1");
    vi.stubEnv("NEXT_PUBLIC_PORTONE_V1_IMP_CODE", "imp_itest");
    vi.stubEnv("PORTONE_V1_REST_API_KEY", "itest-key");
    vi.stubEnv("PORTONE_V1_REST_API_SECRET", "itest-secret");
    vi.stubEnv("DANAL_MID", MID);
    vi.stubEnv("SEARCH_INDEX_KEY", "itest-search-index-key");
    vi.resetModules(); // module-level price/policy consts must read the stubbed env
    const { PrismaClient } = await import("@prisma/client");
    raw = new PrismaClient();
    const check = await raw.$queryRaw<{ current_database: string }[]>`SELECT current_database()`;
    expect(check[0].current_database).toBe("vestra_member_isolated");
    prisma = (await import("@/lib/prisma")).prisma;
    orders = await import("../orders");
    callback = await import("../payment-callback");
    recovery = await import("../recovery");
    status = await import("../status");
    trial = await import("../trial");
    cron = await import("../cron");
    ctx = await import("../callback-context");
  });
  afterAll(async () => { await raw?.$disconnect(); });
  afterEach(async () => {
    pg.payment = null; pg.impByMerchant = null;
    await prisma.payment.deleteMany();
    await prisma.subscriptionOrder.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.memberSubscriptionPolicy.deleteMany();
    await prisma.monitoredProperty.deleteMany();
    await prisma.user.deleteMany();
  });

  // ── helpers ────────────────────────────────────────────────────────────────
  async function makeUser(role = "PERSONAL", verifyStatus = "none") {
    const id = `u_${randomUUID()}`;
    await prisma.user.create({ data: { id, email: `${id}@test.local`, role, verifyStatus,
      createdAt: new Date() } }); // created after effectiveAt → policy auto-created on first order
    return id;
  }
  function req(over: Partial<MemberOrderRequest> = {}): MemberOrderRequest {
    return { purpose: "initial", plan: "PRO", durationMonths: 3, productKind: "standard",
      idempotencyKey: randomUUID(), ...over };
  }
  function paidSnapshot(orderId: string, amount: number, over: Partial<IamportPayment> = {}): IamportPayment {
    return { imp_uid: `imp_${orderId.slice(5, 20)}`, merchant_uid: orderId, amount, currency: "KRW",
      status: "paid", pg_provider: "danal_tpay", pg_id: MID, pay_method: "card",
      paid_at: Math.floor(Date.now() / 1000), cancel_amount: 0, sandbox: true, ...over } as IamportPayment;
  }
  async function approve(userId: string, orderId: string, amount: number, snap?: Partial<IamportPayment>) {
    const order = await orders.ownedOrder(userId, orderId);
    const impUid = `imp_${orderId.slice(5, 20)}`;
    pg.payment = paidSnapshot(orderId, amount, snap);
    const signed = ctx.issueCallbackContext(order);
    return callback.memberPaymentCallback(userId, { paymentId: orderId, imp_uid: impUid,
      callbackContext: signed.callbackContext, callbackSignature: signed.callbackSignature });
  }

  // ── scenarios ───────────────────────────────────────────────────────────────
  it("#1 PRO order → approve → active subscription with receipt", async () => {
    const u = await makeUser();
    const created = await orders.createMemberOrder(u, req());
    expect(created.status).toBe("pending");
    await approve(u, created.orderId, created.amount);
    const s = await status.memberSubscriptionStatus(u);
    expect(s.plan).toBe("PRO");
    expect(s.status).toBe("active");
    expect(s.receipts.some(r => r.orderId === created.orderId && r.amount === created.amount)).toBe(true);
  });

  it("#3 role gate: PERSONAL blocked from PREMIUM; unverified business blocked; verified business ok", async () => {
    const personal = await makeUser("PERSONAL");
    await expect(orders.createMemberOrder(personal, req({ plan: "PREMIUM" }))).rejects.toMatchObject({ code: "plan_not_allowed" });
    const unverified = await makeUser("BUSINESS", "none");
    await expect(orders.createMemberOrder(unverified, req({ plan: "PREMIUM" }))).rejects.toMatchObject({ code: "verification_required" });
    const verified = await makeUser("BUSINESS", "verified");
    const ok = await orders.createMemberOrder(verified, req({ plan: "PREMIUM" }));
    expect(ok.plan).toBe("PREMIUM");
  });

  it("#4 amount SSOT: server computes amount; a tampered client amount cannot be ordered", async () => {
    const u = await makeUser();
    // MemberOrderRequest has no amount field — amount is always server-derived.
    const created = await orders.createMemberOrder(u, req({ plan: "PRO", durationMonths: 12 }));
    // 9900 * 12 with 20% discount = 95040
    expect(created.amount).toBe(Math.round(9900 * 12 * 0.8));
    // A callback claiming a different paid amount fails PG validation.
    const order = await orders.ownedOrder(u, created.orderId);
    pg.payment = paidSnapshot(created.orderId, created.amount - 1);
    const signed = ctx.issueCallbackContext(order);
    await expect(callback.memberPaymentCallback(u, { paymentId: created.orderId, imp_uid: `imp_${created.orderId.slice(5, 20)}`,
      callbackContext: signed.callbackContext, callbackSignature: signed.callbackSignature })).rejects.toMatchObject({ code: "payment_failed" });
  });

  it("#5 idempotency: same key / replayed callback never double-activates or double-charges", async () => {
    const u = await makeUser();
    const key = randomUUID();
    const a = await orders.createMemberOrder(u, req({ idempotencyKey: key }));
    const b = await orders.createMemberOrder(u, req({ idempotencyKey: key }));
    expect(b.orderId).toBe(a.orderId); // idempotent create
    await approve(u, a.orderId, a.amount);
    await approve(u, a.orderId, a.amount); // replay
    expect(await prisma.payment.count({ where: { orderId: a.orderId } })).toBe(1);
    expect(await prisma.subscription.count({ where: { userId: u } })).toBe(1);
  });

  it("#6 expiry → runMemberLifecycle pauses the member's monitoring (excluded from active batch)", async () => {
    const u = await makeUser();
    const created = await orders.createMemberOrder(u, req({ plan: "PRO", durationMonths: 3 }));
    await approve(u, created.orderId, created.amount);
    await prisma.monitoredProperty.create({ data: { userId: u, address: "서울 테스트", status: "active" } });
    // Force expiry in the past.
    await prisma.subscription.update({ where: { userId: u }, data: { endDate: new Date(Date.now() - 86_400_000) } });
    await cron.runMemberLifecycle();
    const active = await prisma.monitoredProperty.count({ where: { userId: u, status: "active" } });
    expect(active).toBe(0); // paused → registry-monitor status:active query excludes it
  });

  it("#7 refund after paid: reverify refuses activation (no term granted)", async () => {
    const u = await makeUser();
    const created = await orders.createMemberOrder(u, req());
    await approve(u, created.orderId, created.amount);
    // Simulate the order recorded paid but not yet applied, then a refund lands.
    await prisma.subscriptionOrder.updateMany({ where: { orderId: created.orderId }, data: { appliedAt: null } });
    await prisma.subscription.deleteMany({ where: { userId: u } });
    pg.payment = paidSnapshot(created.orderId, created.amount, { status: "cancelled", cancel_amount: created.amount,
      cancelled_at: Math.floor(Date.now() / 1000), paid_at: undefined });
    await cron.runMemberLifecycle();
    const sub = await prisma.subscription.findUnique({ where: { userId: u } });
    expect(sub?.status === "active").not.toBe(true); // refund did not grant a term
    const order = await prisma.subscriptionOrder.findFirst({ where: { orderId: created.orderId } });
    expect(order?.appliedAt).toBeNull();
  });

  it("#2 paid_trial is one-time: a second trial order is rejected", async () => {
    const u = await makeUser();
    const t = await orders.createMemberOrder(u, req({ productKind: "paid_trial", durationMonths: 1, plan: "PRO" }));
    await approve(u, t.orderId, t.amount);
    await expect(orders.createMemberOrder(u, req({ productKind: "paid_trial", durationMonths: 1, plan: "PRO" })))
      .rejects.toMatchObject({ code: "trial_already_used" });
  });

  it("#8 abandoned (uncharged) pending is superseded so a fresh purchase is possible", async () => {
    const u = await makeUser();
    const first = await orders.createMemberOrder(u, req({ plan: "PRO", durationMonths: 3 }));
    // Expire it with no PG charge; PG reports no transaction for the merchant.
    await prisma.subscriptionOrder.updateMany({ where: { orderId: first.orderId }, data: { expiresAt: new Date(Date.now() - 1000) } });
    pg.impByMerchant = null; // no charge exists
    const second = await orders.createMemberOrder(u, req({ plan: "PREMIUM", durationMonths: 6, idempotencyKey: randomUUID() }));
    expect(second.orderId).not.toBe(first.orderId);
    const stale = await prisma.subscriptionOrder.findFirst({ where: { orderId: first.orderId } });
    expect(["expired", "canceled", "superseded"]).toContain(stale?.status);
  });

  it("#9 grandfathered member keeps monitoring through expiry (never paused)", async () => {
    const u = await makeUser();
    await prisma.memberSubscriptionPolicy.create({ data: { userId: u, policyVersion: "itest-policy",
      grandfatheredAt: new Date(), legacyEntitlementsSnapshot: { monitoringLimit: 5 } } });
    await prisma.subscription.create({ data: { userId: u, plan: "FREE", status: "expired",
      endDate: new Date(Date.now() - 86_400_000), policyVersion: "itest-policy" } });
    await prisma.monitoredProperty.create({ data: { userId: u, address: "서울 유지", status: "active" } });
    await cron.runMemberLifecycle();
    expect(await prisma.monitoredProperty.count({ where: { userId: u, status: "active" } })).toBe(1);
  });
});
