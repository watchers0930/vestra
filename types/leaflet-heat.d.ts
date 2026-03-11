declare module "leaflet.heat" {
  // leaflet.heat 플러그인: L.heatLayer를 글로벌에 추가
  import * as L from "leaflet";

  function heatLayer(
    latlngs: Array<[number, number, number?]>,
    options?: {
      minOpacity?: number;
      maxZoom?: number;
      max?: number;
      radius?: number;
      blur?: number;
      gradient?: Record<number, string>;
    }
  ): L.Layer;
}
