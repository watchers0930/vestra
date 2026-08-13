import s from "../rights-renewal.module.css";

type TabId = "analysis" | "owner" | "history" | "guide";

/** 보조 탭(소유자 확인 / 등기이력 / 이용안내) 패널. */
export default function RightsSecondaryTabs({ activeTab }: { activeTab: TabId }) {
  return (
    <>
      {/* PANEL: 소유자·매도인 확인 */}
      <div className={`${s.tab} ${activeTab === "owner" ? s.on : ""}`}>
        <div className={s.panelWrap} style={{ maxWidth: "860px" }}>
          <p className={s.secEyebrow}>Owner Verification</p>
          <h2 className={s.secTitle}>소유자 · 매도인 확인</h2>
          <p className={s.secDesc}>
            등기부등본상 소유자와 계약 상대방이 동일인인지 확인합니다.<br />
            불일치 시 사기 거래의 위험이 매우 높습니다.
          </p>
        </div>
      </div>

      {/* PANEL: 등기이력 조회 */}
      <div className={`${s.tab} ${activeTab === "history" ? s.on : ""}`}>
        <div className={s.panelWrap} style={{ maxWidth: "860px" }}>
          <p className={s.secEyebrow}>Registry History</p>
          <h2 className={s.secTitle}>등기이력 조회</h2>
          <p className={s.secDesc}>소유권 변동 이력, 담보권 설정·말소 이력을 시계열로 확인합니다.</p>
        </div>
      </div>

      {/* PANEL: 이용 안내 */}
      <div className={`${s.tab} ${activeTab === "guide" ? s.on : ""}`}>
        <div className={s.panelWrap} style={{ maxWidth: "860px" }}>
          <p className={s.secEyebrow}>User Guide</p>
          <h2 className={s.secTitle}>이용 안내</h2>
          <p className={s.secDesc}>권리분석 서비스 이용 방법과 주의사항을 안내합니다.</p>
        </div>
      </div>
    </>
  );
}
