import Image from "next/image";
import { User, Shield, CheckCircle2 } from "lucide-react";
import { ROLE_INFO, VERIFY_STATUS } from "./profileConstants";

interface Props {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
    verifyStatus?: string;
  };
}

export default function ProfileInfoPanel({ user }: Props) {
  const role = user.role || "PERSONAL";
  const roleInfo = ROLE_INFO[role] || ROLE_INFO.PERSONAL;
  const RoleIcon = roleInfo.icon;
  const verifyInfo = VERIFY_STATUS[user.verifyStatus || "none"];
  const VerifyIcon = verifyInfo.icon;

  return (
    <div className="space-y-6">
      {/* 사용자 정보 */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          {user.image ? (
            <Image src={user.image} alt="" width={64} height={64} className="h-16 w-16 rounded-full" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f5f5f7]">
              <User size={28} className="text-[#1d1d1f]" strokeWidth={1.5} />
            </div>
          )}
          <div>
            <h2 className="text-lg font-semibold">{user.name || "사용자"}</h2>
            <p className="text-sm text-muted">{user.email}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-white ${roleInfo.color}`}>
                <RoleIcon size={12} />
                {roleInfo.label}
              </span>
              <span className={`inline-flex items-center gap-1 text-xs ${verifyInfo.color}`}>
                <VerifyIcon size={12} />
                {verifyInfo.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 등급 혜택 */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Shield size={20} className="text-[#1d1d1f]" strokeWidth={1.5} />
          <h3 className="font-semibold">현재 등급 혜택</h3>
        </div>
        <ul className="space-y-2">
          {roleInfo.features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm">
              <CheckCircle2 size={14} className="flex-shrink-0 text-[#1d1d1f]" strokeWidth={1.5} />
              {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
