import { ArrowUpCircle, CreditCard } from "lucide-react";
import s from "../profile-renewal.module.css";

interface Props {
  role: string;
  verifyStatus?: string;
  businessNumber: string;
  setBusinessNumber: (v: string) => void;
  companyName: string;
  setCompanyName: (v: string) => void;
  representName: string;
  setRepresentName: (v: string) => void;
  selectedRole: string;
  setSelectedRole: (v: "REALESTATE" | "BUSINESS") => void;
  upgradeLoading: boolean;
  upgradeMessage: string;
  handleUpgrade: () => void;
  subscription: { plan?: string; status?: string } | null;
  cancelLoading: boolean;
  handleCancelSubscription: () => void;
  showToast: (msg: string) => void;
}

export default function ProfileTierPanel({
  role, verifyStatus, businessNumber, setBusinessNumber, companyName, setCompanyName,
  representName, setRepresentName, selectedRole, setSelectedRole,
  upgradeLoading, upgradeMessage, handleUpgrade, subscription, cancelLoading,
  handleCancelSubscription, showToast,
}: Props) {
  const planLabel = subscription?.plan === "FREE" || !subscription?.plan ? "무료"
    : subscription.plan === "PRO" ? "프로" : subscription.plan === "BUSINESS" ? "비즈니스" : subscription.plan;
  // 현재 구독 중인 플랜(무료 기본) — 아래 플랜 카드에서 이 플랜을 선택 표시
  const currentPlan = subscription?.plan && subscription.plan !== "FREE" ? subscription.plan : "FREE";

  return (
    <div>
      {/* 업그레이드 (PERSONAL만) */}
      {role === "PERSONAL" && verifyStatus !== "pending" && (
        <div className={s.card}>
          <div className={s.cardHead}>
            <div className={s.cardHeadL}>
              <ArrowUpCircle size={18} strokeWidth={1.5} className={s.cardIco} />
              <h3 className={s.cardTitle}>등급 업그레이드</h3>
            </div>
          </div>
          <p className={s.cardDesc}>사업자등록번호를 인증하여 기업/부동산 등급으로 업그레이드하세요.</p>
          <div className={s.roleSelectRow}>
            <button
              onClick={() => setSelectedRole("BUSINESS")}
              className={`${s.roleSelectBtn} ${selectedRole === "BUSINESS" ? s.onBiz : ""}`}
            >
              기업 (일 50회)
            </button>
            <button
              onClick={() => setSelectedRole("REALESTATE")}
              className={`${s.roleSelectBtn} ${selectedRole === "REALESTATE" ? s.onReal : ""}`}
            >
              부동산 (일 100회)
            </button>
          </div>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="회사명 (2~50자)"
            className={s.formInput}
            style={{ marginBottom: 8 }}
          />
          <input
            type="text"
            value={representName}
            onChange={(e) => setRepresentName(e.target.value)}
            placeholder="대표자명 (2~20자)"
            className={s.formInput}
            style={{ marginBottom: 8 }}
          />
          <input
            type="text"
            value={businessNumber}
            onChange={(e) => setBusinessNumber(e.target.value)}
            placeholder="사업자등록번호 (000-00-00000)"
            className={s.formInput}
            style={{ marginBottom: 12 }}
          />
          <button
            onClick={handleUpgrade}
            disabled={upgradeLoading || !businessNumber.trim() || !companyName.trim() || !representName.trim()}
            className={s.btnPrimary}
          >
            {upgradeLoading ? "신청 중..." : "업그레이드 신청"}
          </button>
          {upgradeMessage && <p className={s.upgradeMsg}>{upgradeMessage}</p>}
        </div>
      )}

      {/* 구독 관리 */}
      <div className={s.card}>
        <div className={s.cardHead}>
          <div className={s.cardHeadL}>
            <CreditCard size={18} strokeWidth={1.5} className={s.cardIco} />
            <h3 className={s.cardTitle}>구독 관리</h3>
          </div>
          <span className={s.comingBadge}>출시 예정</span>
        </div>

        <div className={s.subRow}>
          <div>
            <p className={s.subPlanLabel}>현재 플랜</p>
            <p className={s.subPlanVal}>{planLabel}</p>
          </div>
          <div className={s.subStatusWrap}>
            <span className={subscription?.status === "cancelled" ? s.statusCancelled : s.statusActive}>
              {subscription?.status === "cancelled" ? "해지됨" : "활성"}
            </span>
            {subscription?.plan && subscription.plan !== "FREE" && subscription.status === "active" && (
              <button onClick={handleCancelSubscription} disabled={cancelLoading} className={s.cancelBtn}>
                {cancelLoading ? "처리 중..." : "구독 해지"}
              </button>
            )}
          </div>
        </div>

        <div className={s.planGrid}>
          {[
            { label: "무료", price: "0원", plan: "FREE" },
            { label: "프로", price: "29,900원", plan: "PRO" },
            { label: "비즈니스", price: "99,000원", plan: "BUSINESS" },
          ].map((p) => {
            const on = currentPlan === p.plan;
            return (
              <div key={p.label} className={`${s.planCard} ${on ? s.onPlan : ""}`}>
                <div className={s.planName}>{p.label}</div>
                <div className={s.planPrice}>{p.price}/월</div>
                {on && <div className={s.planCurrent}>이용 중</div>}
              </div>
            );
          })}
        </div>

        <div className={s.notifyBox}>
          <p className={s.notifyT}>프리미엄 플랜이 곧 출시됩니다</p>
          <p className={s.notifyS}>출시 시 알림을 받아보세요.</p>
          <div className={s.notifyRow}>
            <input
              type="email"
              placeholder="이메일 주소 입력"
              defaultValue={typeof window !== "undefined" ? localStorage.getItem("vestra_payment_notify_email") || "" : ""}
              id="payment-notify-email"
              className={s.formInput}
            />
            <button
              onClick={() => {
                const input = document.getElementById("payment-notify-email") as HTMLInputElement;
                const email = input?.value?.trim();
                if (!email) return;
                localStorage.setItem("vestra_payment_notify_email", email);
                showToast("출시 알림이 등록되었습니다.");
              }}
              className={s.btnDark}
            >
              출시 알림 받기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
