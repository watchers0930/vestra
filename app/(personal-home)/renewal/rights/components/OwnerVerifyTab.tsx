import { User, House, AlertTriangle } from "lucide-react";
import s from "../rights-renewal.module.css";
import type { UnifiedResult } from "@/components/rights/RightsResult";

interface Props {
  result: UnifiedResult;
  ownerMatch: boolean | null;
  registryOwnerMasked: string;
}

type Chk = { key: "clOk" | "clWarn" | "clDanger"; ico: string; badge: string; text: string; sub: string };

export default function OwnerVerifyTab({ result, ownerMatch, registryOwnerMasked }: Props) {
  const gapgu = result.parsed?.gapgu ?? [];
  const eulgu = result.parsed?.eulgu ?? [];
  const title = result.parsed?.title;

  // 현재 소유자 = 말소되지 않은 가장 최근 소유권 등기
  const ownerEntries = gapgu.filter((e) => !e.isCancelled && /소유권/.test(e.purpose));
  const ownerEntry = ownerEntries[ownerEntries.length - 1];
  const registryOwner = registryOwnerMasked || ownerEntry?.holder || "확인 불가";

  const active = [...gapgu, ...eulgu].filter((e) => !e.isCancelled);
  const hasSeizure = active.some((e) => /압류|가압류|경매|공매/.test(e.purpose));
  const hasProvisional = active.some((e) => /가처분|가등기|예고등기/.test(e.purpose));
  const hasTrust = active.some((e) => /신탁/.test(e.purpose));

  const checks: Chk[] = [
    {
      key: registryOwner !== "확인 불가" ? "clOk" : "clWarn",
      ico: registryOwner !== "확인 불가" ? "✓" : "!",
      badge: registryOwner !== "확인 불가" ? "확인" : "미상",
      text: "등기부상 소유자 확인",
      sub: registryOwner !== "확인 불가" ? `현재 소유자: ${registryOwner}` : "소유자 정보를 특정하지 못했습니다.",
    },
    {
      key: hasSeizure ? "clDanger" : "clOk",
      ico: hasSeizure ? "✕" : "✓",
      badge: hasSeizure ? "위험" : "없음",
      text: "압류 · 가압류 · 경매",
      sub: hasSeizure ? "소유권을 제한하는 등기가 확인됩니다. 거래 전 반드시 확인하세요." : "압류·가압류·경매개시 등기가 없습니다.",
    },
    {
      key: hasProvisional ? "clWarn" : "clOk",
      ico: hasProvisional ? "!" : "✓",
      badge: hasProvisional ? "주의" : "없음",
      text: "가처분 · 가등기 · 예고등기",
      sub: hasProvisional ? "소유권 이전을 제한할 수 있는 등기가 있습니다. 말소 여부를 확인하세요." : "가처분·가등기·예고등기가 없습니다.",
    },
    {
      key: hasTrust ? "clWarn" : "clOk",
      ico: hasTrust ? "!" : "✓",
      badge: hasTrust ? "주의" : "없음",
      text: "신탁등기",
      sub: hasTrust ? "신탁등기가 있어 실소유·처분 권한 확인이 필요합니다." : "신탁등기가 없습니다.",
    },
  ];

  return (
    <div className={`${s.tab} ${s.on}`}>
      <div className={s.panelWrap} style={{ maxWidth: "860px" }}>
        <p className={s.secEyebrow}>Owner Verification</p>
        <h2 className={s.secTitle}>소유자 · 매도인 확인</h2>
        <p className={s.secDesc}>등기부상 소유자와 계약 상대방이 동일인인지 확인합니다. 불일치 시 사기 거래의 위험이 매우 높습니다.</p>

        {/* 매치 배너 */}
        {ownerMatch === true && (
          <div className={`${s.matchBanner} ${s.matchOk}`}>
            <span className={s.matchIco}>✓</span>
            <div>
              <div className={s.matchTitle}>소유자 일치 확인</div>
              <div className={s.matchDesc}>입력하신 소유자명이 등기부상 소유자({registryOwner})와 일치합니다.</div>
            </div>
          </div>
        )}
        {ownerMatch === false && (
          <div className={`${s.matchBanner} ${s.matchFail}`}>
            <span className={s.matchIco}><AlertTriangle size={30} /></span>
            <div>
              <div className={s.matchTitle}>소유자 불일치</div>
              <div className={s.matchDesc}>입력하신 소유자명이 등기부상 소유자({registryOwner})와 다릅니다. 임대인이 실소유자가 아닐 수 있습니다.</div>
            </div>
          </div>
        )}
        {ownerMatch === null && (
          <div className={s.noticeBox} style={{ marginBottom: "28px" }}>
            이 분석은 <b>주소 기반</b>으로 진행되어 매도인(계약 상대방) 대조는 수행되지 않았습니다.
            아래는 등기부에서 확인된 소유자 정보이며, 계약 시 신분증·등기부상 소유자명이 일치하는지 반드시 확인하세요.
          </div>
        )}

        {/* 소유자 / 부동산 정보 */}
        <div className={s.ovGrid}>
          <div className={s.ovCard}>
            <div className={s.ovCardHead}><User size={16} /> 등기부상 소유자</div>
            <div className={s.ovCardBody}>
              <div className={s.ovField}>
                <div className={s.ovLabel}>소유자</div>
                <div className={s.ovVal}>{registryOwner}</div>
              </div>
              <div className={s.ovField}>
                <div className={s.ovLabel}>취득일</div>
                <div className={s.ovVal}>{ownerEntry?.date || "확인 불가"}</div>
                {ownerEntry?.purpose && <div className={s.ovSub}>{ownerEntry.purpose}</div>}
              </div>
            </div>
          </div>
          <div className={s.ovCard}>
            <div className={s.ovCardHead}><House size={16} /> 부동산 정보</div>
            <div className={s.ovCardBody}>
              <div className={s.ovField}>
                <div className={s.ovLabel}>소재지</div>
                <div className={s.ovVal} style={{ fontSize: "14px" }}>{title?.address || result.propertyInfo?.address || "확인 불가"}</div>
                {(title?.buildingName || title?.buildingDetail) && (
                  <div className={s.ovSub}>{title?.buildingName || title?.buildingDetail}</div>
                )}
              </div>
              <div className={s.ovField}>
                <div className={s.ovLabel}>부동산 고유번호</div>
                <div className={s.ovVal} style={{ fontSize: "14px" }}>{title?.propUid || "미확인"}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 체크리스트 */}
        <div className={s.clWrap}>
          {checks.map((c, i) => (
            <div className={`${s.clItem} ${s[c.key]}`} key={i}>
              <div className={s.clIco}>{c.ico}</div>
              <div className={s.clBody}>
                <div className={s.clText}>{c.text}</div>
                <div className={s.clSub}>{c.sub}</div>
              </div>
              <span className={s.clBadge}>{c.badge}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
