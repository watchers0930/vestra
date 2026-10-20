"use client";

/**
 * 탭 포커스/가시성 복귀 시 콜백을 호출하는 훅(설계 renewal.design §5.1 F-3).
 *
 * 사업자 승인 대기 화면에서 사용자가 다른 탭(관리자 승인 확인 등)에 다녀온 뒤 돌아오면 서버 상태를 다시
 * 조회해 pending→verified 전환을 반영하기 위한 것이다.
 *
 * ⚠️ 중복 fetch·읽기 제한·백오프는 **요청을 소유한 온보딩 훅**(useOnboardingStatus.refresh)이 단일 기준으로
 * 담당한다. 이 훅은 이벤트만 감지해 콜백을 호출하며, 자체 throttle 상태를 따로 복제하지 않는다(§5.1 — 중복
 * 상태 금지). 포커스+가시성 이벤트가 동시에 와도 온보딩 훅의 in-flight 공유로 합쳐지고, 짧은 반복 복귀는
 * 공통 최소 간격으로 생략된다. 언마운트 시 리스너를 정리한다.
 */

import { useEffect, useRef } from "react";

interface Options {
  /** 활성화 여부. pending 상태에서만 켠다. */
  enabled: boolean;
  /** 재조회 콜백(보통 onboarding.refresh({ background: true })). 중복/간격 제한은 콜백 내부가 책임진다. */
  onVisible: () => void;
}

export function useVisibilityRefresh({ enabled, onVisible }: Options): void {
  // 콜백 참조를 ref로 들고 있어 effect를 재등록하지 않는다(리스너 안정성). ref 갱신은 effect에서만 수행한다.
  const onVisibleRef = useRef(onVisible);
  useEffect(() => {
    onVisibleRef.current = onVisible;
  }, [onVisible]);

  useEffect(() => {
    if (!enabled) return;

    const maybeRefresh = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      onVisibleRef.current();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") maybeRefresh();
    };

    window.addEventListener("focus", maybeRefresh);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", maybeRefresh);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled]);
}
