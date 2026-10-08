"use client";

import { useState } from "react";
import { WidgetShell } from "./WidgetShell";
import { PriceBody, priceMeta } from "./PriceWidget";
import { JeonseBody, jeonseMeta } from "./JeonseWidget";
import { TaxBody, taxMeta } from "./TaxWidget";
import { RightsBody, rightsMeta } from "./RightsWidget";

/** 묶음에 넣을 수 있는 위젯 종류와 짧은 탭 라벨 */
const BUNDLE_META: Record<string, { meta: { type: string; title: string; source: string }; tab: string }> = {
  price: { meta: priceMeta, tab: "시세" },
  "jeonse-safety": { meta: jeonseMeta, tab: "전세안전" },
  tax: { meta: taxMeta, tab: "취득세" },
  rights: { meta: rightsMeta, tab: "권리분석" },
};

const ORDER = ["price", "jeonse-safety", "tax", "rights"];

/** 선택 위젯별 본문 렌더(상태 유지를 위해 전부 마운트하고 비활성은 hidden) */
function bodyFor(key: string, address: string) {
  switch (key) {
    case "price":
      return <PriceBody address={address} />;
    case "jeonse-safety":
      return <JeonseBody address={address} />;
    case "tax":
      return <TaxBody />;
    case "rights":
      return <RightsBody />;
    default:
      return null;
  }
}

/** 여러 위젯을 상단 탭으로 묶은 임베드 위젯 */
export function BundleWidget({
  theme,
  accent,
  address,
  widgets,
}: {
  theme: "light" | "dark";
  accent: string;
  address: string;
  widgets: string[];
}) {
  // 유효 위젯만, 지정 순서대로 정규화(중복 제거)
  const list = ORDER.filter((k) => widgets.includes(k));
  const valid = list.length > 0 ? list : ["price"];
  const [active, setActive] = useState(valid[0]);
  const current = valid.includes(active) ? active : valid[0];
  const { meta } = BUNDLE_META[current];

  return (
    <WidgetShell
      type={meta.type}
      title={meta.title}
      theme={theme}
      accent={accent}
      source={meta.source}
      tabs={valid.map((k) => ({ key: k, label: BUNDLE_META[k].tab }))}
      activeTab={current}
      onTab={setActive}
    >
      {valid.map((k) => (
        <div key={k} hidden={k !== current}>
          {bodyFor(k, address)}
        </div>
      ))}
    </WidgetShell>
  );
}
