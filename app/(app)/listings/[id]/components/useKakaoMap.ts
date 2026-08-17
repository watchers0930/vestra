"use client";

import { useEffect } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */

type MapInitResult = { map: any; cleanup?: () => void } | void;

/**
 * 카카오 지도 초기화를 타이밍에 견고하게 처리하는 공용 훅.
 *
 * 기존 waitKakao 패턴의 문제:
 *  - `kakao.maps.load(cb)`를 걸고 바로 return → 콜백이 생명주기/타이밍에 유실되면
 *    지도 생성이 조용히 건너뛰어지고 재시도가 없어 빈 컨테이너로 남음(간헐 버그).
 *
 * 이 훅의 보강:
 *  1) id(getElementById) 대신 ref 사용 → useId/DOM 레이스 제거
 *  2) SDK(autoload=false) 준비를 load 콜백 + 폴링 백업 이중으로 대기 → 콜백 유실돼도 복구
 *  3) 컨테이너가 실제 렌더(offsetWidth>0)된 뒤 생성
 *  4) 생성 후 relayout: setTimeout + ResizeObserver + IntersectionObserver
 *     → 뷰포트 밖에서 생성돼도 화면에 들어올 때 타일이 그려짐
 *
 * @param ref  지도를 그릴 컨테이너 ref
 * @param init (kakao, el) => { map, cleanup? } — 지도 생성 및 마커/검색 등 부가 로직
 * @param deps 재초기화 트리거 (예: [lat, lng])
 */
export function useKakaoMap(
  ref: React.RefObject<HTMLDivElement | null>,
  init: (kakao: any, el: HTMLElement) => MapInitResult,
  deps: React.DependencyList,
) {
  useEffect(() => {
    let dead = false;
    let map: any = null;
    let cleanupInit: (() => void) | undefined;
    let ro: ResizeObserver | undefined;
    let io: IntersectionObserver | undefined;
    let loadCalled = false;
    const t0 = Date.now();

    const schedule = () => {
      if (!dead && Date.now() - t0 < 15000) setTimeout(tryInit, 150);
    };

    function tryInit() {
      if (dead || map) return;
      const kakao = (window as any).kakao;
      const el = ref.current;

      // SDK 코어 준비 확인 (autoload=false → maps.load 필요)
      if (!kakao?.maps?.Map) {
        if (kakao?.maps?.load && !loadCalled) {
          loadCalled = true;
          kakao.maps.load(() => { if (!dead) tryInit(); });
        }
        schedule(); // load 콜백 유실 대비 폴링 백업
        return;
      }
      // 컨테이너가 실제 렌더된 뒤 생성
      if (!el || el.offsetWidth === 0) { schedule(); return; }

      const res = init(kakao, el);
      if (!res) return;
      map = res.map;
      cleanupInit = res.cleanup;
      if (!map) return;

      // relayout 보강 — 타이밍/뷰포트 밖 생성 대비
      setTimeout(() => { if (!dead) map.relayout(); }, 100);
      ro = new ResizeObserver(() => map.relayout());
      ro.observe(el);
      io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) map.relayout();
      });
      io.observe(el);
    }

    tryInit();

    return () => {
      dead = true;
      ro?.disconnect();
      io?.disconnect();
      cleanupInit?.();
      map = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
