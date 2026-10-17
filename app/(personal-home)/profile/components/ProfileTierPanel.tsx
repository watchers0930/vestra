import { ArrowUpCircle, CreditCard } from "lucide-react";
import s from "../profile-renewal.module.css";
import MemberSubscriptionPanel from "./MemberSubscriptionPanel";

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
}

export default function ProfileTierPanel({
  role, verifyStatus, businessNumber, setBusinessNumber, companyName, setCompanyName,
  representName, setRepresentName, selectedRole, setSelectedRole,
  upgradeLoading, upgradeMessage, handleUpgrade, subscription, cancelLoading,
  handleCancelSubscription,
}: Props) {
  const planLabel = subscription?.plan === "FREE" || !subscription?.plan ? "무료"
    : subscription.plan === "PRO" ? "프로" : subscription.plan === "BUSINESS" ? "비즈니스" : subscription.plan;

  return (
    <div>
      {/* 회원 선불 구독 현황(신규 SSOT, GET /status) — 기존 구독 관리 카드와 독립 */}
      <MemberSubscriptionPanel />

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

        {/* 레거시 월 기준 가격 카드(29,900/99,000)는 신규 선불 구독 가격(월 기준 9,900원 등)과 충돌하므로
            제거한다. 요금제 안내·구매는 상단 회원 구독 패널과 /renewal/pricing(신규 계약)이 담당한다(#12). */}
      </div>
    </div>
  );
}
