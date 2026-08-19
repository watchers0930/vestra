/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * 선택한 좌표를 "보이는 영역의 중앙"으로 이동한다.
 * 좌측에 반투명 목록 패널이 겹쳐 있으므로, 지도 전체 중앙이 아니라
 * 패널에 가려지지 않은 영역의 중앙(= 전체 중앙에서 offsetX 만큼 우측)에 오도록
 * 지도 중심을 offsetX 픽셀만큼 서쪽으로 보정한 뒤 panTo 한다.
 *
 * @param offsetX 목록 패널 폭의 절반(px). 목록이 접혀 있으면 0.
 */
export function panToVisibleCenter(map: any, kakao: any, lat: number, lng: number, offsetX: number) {
  if (!map || !kakao?.maps) return;
  const target = new kakao.maps.LatLng(lat, lng);
  const proj = map.getProjection?.();
  if (!offsetX || !proj?.containerPointFromCoords || !proj?.coordsFromContainerPoint || !kakao.maps.Point) {
    map.panTo(target);
    return;
  }
  const pt = proj.containerPointFromCoords(target);
  const shifted = new kakao.maps.Point(pt.x - offsetX, pt.y);
  map.panTo(proj.coordsFromContainerPoint(shifted));
}
