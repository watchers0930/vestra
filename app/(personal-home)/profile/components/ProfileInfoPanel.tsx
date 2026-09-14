import Image from "next/image";
import { User, Shield, CheckCircle2, Crown } from "lucide-react";
import { ROLE_INFO, VERIFY_STATUS } from "./profileConstants";
import { isPaidPlan } from "@/lib/subscription-plan";
import s from "../profile-renewal.module.css";

interface Props {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
    verifyStatus?: string;
  };
  subscription?: { plan?: string; status?: string } | null;
}

const ROLE_CLASS: Record<string, string> = {
  ADMIN: s.roleAdmin, REALESTATE: s.roleReal, BUSINESS: s.roleBiz, RENTAL_BIZ: s.roleBiz, PERSONAL: s.rolePersonal, GUEST: s.rolePersonal,
};
const VERIFY_CLASS: Record<string, string> = {
  none: s.vNone, pending: s.vPending, verified: s.vVerified, rejected: s.vRejected,
};
const PLAN_LABEL: Record<string, string> = { FREE: "무료 플랜", PRO: "프로 플랜", BUSINESS: "비즈니스 플랜" };
const PLAN_CLASS: Record<string, string> = { FREE: s.planFree, PRO: s.planPro, BUSINESS: s.planBiz };

export default function ProfileInfoPanel({ user, subscription }: Props) {
  const role = user.role || "PERSONAL";
  const roleInfo = ROLE_INFO[role] || ROLE_INFO.PERSONAL;
  const RoleIcon = roleInfo.icon;
  const verifyKey = user.verifyStatus || "none";
  const verifyInfo = VERIFY_STATUS[verifyKey];
  const VerifyIcon = verifyInfo.icon;
  // 현재 구독 플랜 (isPaidPlan과 동일 기준: PRO/BUSINESS + active만 유료, 그 외 무료)
  const activePlan = isPaidPlan(subscription?.plan, subscription?.status) ? subscription!.plan! : "FREE";

  return (
    <div>
      {/* 사용자 정보 */}
      <div className={s.card}>
        <div className={s.profileHead}>
          {user.image ? (
            <Image src={user.image} alt="" width={64} height={64} className={s.avatar} />
          ) : (
            <div className={s.avatarFallback}>
              <User size={28} strokeWidth={1.5} />
            </div>
          )}
          <div>
            <p className={s.profileName}>{user.name || "사용자"}</p>
            <p className={s.profileEmail}>{user.email}</p>
            <div className={s.badgeRow}>
              <span className={`${s.roleBadge} ${ROLE_CLASS[role] || s.rolePersonal}`}>
                <RoleIcon size={12} />
                {roleInfo.label}
              </span>
              <span className={`${s.verifyBadge} ${VERIFY_CLASS[verifyKey]}`}>
                <VerifyIcon size={12} />
                {verifyInfo.label}
              </span>
              <span className={`${s.planBadge} ${PLAN_CLASS[activePlan] || s.planFree}`}>
                {activePlan !== "FREE" && <Crown size={12} />}
                {PLAN_LABEL[activePlan] || "무료 플랜"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 등급 혜택 */}
      <div className={s.card}>
        <div className={s.cardHead}>
          <div className={s.cardHeadL}>
            <Shield size={18} strokeWidth={1.5} className={s.cardIco} />
            <h3 className={s.cardTitle}>현재 등급 혜택</h3>
          </div>
        </div>
        <div className={s.featureList}>
          {roleInfo.features.map((f) => (
            <div key={f} className={s.featureItem}>
              <CheckCircle2 size={15} strokeWidth={1.5} className={s.featureIco} />
              {f}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
