"use client";

import g from "../guest.module.css";
import { useGuestStatus } from "../../hooks/useGuestStatus";
import GuestStatusAuthForm from "../../components/guest/GuestStatusAuthForm";
import GuestPropertyPicker from "../../components/guest/GuestPropertyPicker";
import GuestCalendarPanel from "../../components/guest/GuestCalendarPanel";

/**
 * 비회원 현황 조회 오케스트레이션 (설계 §4.2 / step 6·8).
 * 세션 탐지(checking) → 미인증(본인인증 폼) → 인증(물건 선택 → 달력/연장).
 * 일시 오류(error)·세션 만료·로그아웃 실패를 각각 명시적 화면으로 처리한다(§4·§5·§6).
 */
export default function GuestStatusClient() {
  const {
    authState,
    properties,
    selectedId,
    selected,
    month,
    calendar,
    error,
    notice,
    busy,
    probeError,
    logoutFailed,
    startAuth,
    selectProperty,
    changeMonth,
    startRenew,
    logout,
    backToList,
    retryProbe,
  } = useGuestStatus();

  // 로그아웃(조회 종료) 서버 폐기 실패 — 민감 화면은 가리고 재시도 안내(§6).
  if (logoutFailed) {
    return (
      <div className={`${g.wrap} ${g.narrow}`}>
        <div className={g.card}>
          <div className={g.centerBox} style={{ color: "#b91c1c" }}>
            조회 종료 요청이 완료되지 않았습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.
          </div>
          <div className={g.btnRow}>
            <button className={g.btnPrimary} style={{ maxWidth: 220 }} onClick={logout} disabled={busy}>
              {busy ? "종료 중..." : "다시 조회 종료"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (authState === "checking") {
    return (
      <div className={`${g.wrap} ${g.narrow}`}>
        <div className={g.card}>
          <div className={g.centerBox}>
            <div className={g.spinner} />
            조회 세션을 확인하고 있습니다...
          </div>
        </div>
      </div>
    );
  }

  // 일시 오류(네트워크/서버) — 재시도 제공(§4).
  if (authState === "error") {
    return (
      <div className={`${g.wrap} ${g.narrow}`}>
        <div className={g.card}>
          <div className={g.centerBox} style={{ color: "#b91c1c" }} role="alert">
            {probeError || "조회 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."}
          </div>
          <div className={g.btnRow}>
            <button className={g.btnPrimary} style={{ maxWidth: 200 }} onClick={retryProbe}>
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (authState === "unauthenticated") {
    return <GuestStatusAuthForm busy={busy} error={error} onStart={startAuth} />;
  }

  // authenticated
  return (
    <div className={`${g.wrap} ${g.narrow}`}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <button className={g.linkBtn} onClick={logout} disabled={busy}>
          조회 종료(로그아웃)
        </button>
      </div>

      {notice && (
        <div className={g.notice} style={{ marginBottom: 16 }}>
          <p style={{ margin: 0, fontSize: 13, color: "#42465c" }}>{notice}</p>
        </div>
      )}

      {selectedId && (selected || calendar) ? (
        <GuestCalendarPanel
          property={calendar?.property ?? (selected as NonNullable<typeof selected>)}
          logs={calendar?.logs ?? []}
          month={month}
          busy={busy}
          error={error}
          showBack={properties.length > 1}
          onMonthChange={changeMonth}
          onRenew={startRenew}
          onBack={backToList}
        />
      ) : (
        <div className={g.card}>
          <p className={g.cardTitle}>감시 중인 물건</p>
          <p className={g.cardSub}>확인할 물건을 선택하세요.</p>
          {error && (
            <p className={g.errorText} role="alert" style={{ marginBottom: 10 }}>
              {error}
            </p>
          )}
          <GuestPropertyPicker
            properties={properties}
            selectedId={selectedId}
            onSelect={selectProperty}
          />
        </div>
      )}
    </div>
  );
}
