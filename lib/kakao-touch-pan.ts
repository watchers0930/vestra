/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * 웨일 등 일부 터치 브라우저에서 카카오맵 SDK 내장 터치 팬/핀치가 동작하지 않는 문제 우회.
 *
 * 원인(진단페이지 /touch-test 로 확정):
 *  - 웨일 태블릿에서 카카오맵 SDK 내부 터치검출이 실패해 한 손가락 드래그·핀치 줌이 죽음.
 *  - 지도 컨테이너 touch-action:none 만으로는 SDK 내부 검출이 복구되지 않음.
 *  - 반면 컨테이너에서 pointer 이벤트를 직접 받아 map.panBy / setLevel 을 호출하는 방식은 정상 동작.
 *
 * 해결:
 *  - 컨테이너 pointer 이벤트로 팬(panBy)·핀치(setLevel, 중심 anchor 보정)를 직접 구현.
 *  - 터치 포인터(pointerType==='touch')만 처리 → 데스크탑 마우스는 카카오 기본 동작을 그대로 유지(회귀 없음).
 *  - 터치가 처음 감지되면 카카오 기본 draggable/zoomable 을 꺼서
 *    정상 터치기기(아이패드 등)의 이중 팬/줌을 방지.
 *
 * @param map 카카오 지도 인스턴스
 * @param el  지도 컨테이너 엘리먼트
 * @returns cleanup 함수 (리스너 해제)
 */
export function enableKakaoTouchPan(map: any, el: HTMLElement | null): () => void {
  if (!map || !el) return () => {};

  el.style.touchAction = "none";
  const pts = new Map<number, { x: number; y: number }>();
  let lastDist = 0;
  let nativeDisabled = false;

  const disableNative = () => {
    if (nativeDisabled) return;
    nativeDisabled = true;
    try {
      map.setDraggable(false);
      map.setZoomable(false);
    } catch {
      /* 일부 지도 옵션에서 미지원 시 무시 */
    }
  };

  const onDown = (e: PointerEvent) => {
    if (e.pointerType !== "touch") return;
    disableNative();
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* capture 미지원 무시 */
    }
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== "touch" || !pts.has(e.pointerId)) return;
    const prev = pts.get(e.pointerId)!;

    if (pts.size === 1) {
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      // panBy 는 애니메이션 이동이라 매 프레임 작은 델타로 연속 호출하면
      // 애니메이션이 서로 취소돼 느린 드래그가 죽음 → setCenter 로 즉시 이동.
      panByPixels(map, -dx, -dy);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      return;
    }

    // 두 손가락: 핀치 줌
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const arr = Array.from(pts.values()).slice(0, 2);
    const dist = Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y);
    const mid = { x: (arr[0].x + arr[1].x) / 2, y: (arr[0].y + arr[1].y) / 2 };
    if (lastDist) {
      if (dist - lastDist > 40) {
        setLevelAt(map, el, map.getLevel() - 1, mid);
        lastDist = dist;
      } else if (lastDist - dist > 40) {
        setLevelAt(map, el, map.getLevel() + 1, mid);
        lastDist = dist;
      }
    } else {
      lastDist = dist;
    }
  };

  const onUp = (e: PointerEvent) => {
    if (e.pointerType !== "touch") return;
    pts.delete(e.pointerId);
    if (pts.size < 2) lastDist = 0;
  };

  el.addEventListener("pointerdown", onDown);
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerup", onUp);
  el.addEventListener("pointercancel", onUp);

  return () => {
    el.removeEventListener("pointerdown", onDown);
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerup", onUp);
    el.removeEventListener("pointercancel", onUp);
  };
}

/** 지도 중심을 컨테이너 픽셀 기준 (dx,dy)만큼 즉시 이동. panBy 애니메이션 대신 setCenter 사용. */
function panByPixels(map: any, dx: number, dy: number) {
  try {
    const kakao = (window as any).kakao;
    const proj = map.getProjection?.();
    if (proj?.containerPointFromCoords && proj?.coordsFromContainerPoint && kakao?.maps?.Point) {
      const center = map.getCenter();
      const pt = proj.containerPointFromCoords(center);
      const next = new kakao.maps.Point(pt.x + dx, pt.y + dy);
      map.setCenter(proj.coordsFromContainerPoint(next));
      return;
    }
  } catch {
    /* projection 미준비 시 아래 폴백 */
  }
  try {
    map.panBy(dx, dy);
  } catch {
    /* 무시 */
  }
}

/** 핀치 중심점(컨테이너 좌표)을 지도 좌표로 환산해 그 지점을 기준으로 줌. 실패 시 중심 기준. */
function setLevelAt(map: any, el: HTMLElement, level: number, mid: { x: number; y: number }) {
  try {
    const kakao = (window as any).kakao;
    const proj = map.getProjection?.();
    if (proj?.coordsFromContainerPoint && kakao?.maps?.Point) {
      const rect = el.getBoundingClientRect();
      const pt = new kakao.maps.Point(mid.x - rect.left, mid.y - rect.top);
      const anchor = proj.coordsFromContainerPoint(pt);
      map.setLevel(level, { anchor });
      return;
    }
  } catch {
    /* anchor 계산 실패 시 아래 폴백 */
  }
  try {
    map.setLevel(level);
  } catch {
    /* 무시 */
  }
}
