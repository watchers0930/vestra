import { notFound } from "next/navigation";
import { safeAccent } from "./lib/format";
import { PriceWidget } from "./components/PriceWidget";
import { JeonseWidget } from "./components/JeonseWidget";
import { TaxWidget } from "./components/TaxWidget";
import { RightsWidget } from "./components/RightsWidget";
import { BundleWidget } from "./components/BundleWidget";

const TYPES = ["price", "jeonse-safety", "tax", "rights", "bundle"] as const;
type WType = (typeof TYPES)[number];

function first(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

export default async function EmbedWidgetPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { type } = await params;
  if (!TYPES.includes(type as WType)) notFound();

  const sp = await searchParams;
  const theme = first(sp.theme) === "dark" ? "dark" : "light";
  const accent = safeAccent(first(sp.accent));
  const address = first(sp.address);

  switch (type as WType) {
    case "price":
      return <PriceWidget theme={theme} accent={accent} address={address} />;
    case "jeonse-safety":
      return <JeonseWidget theme={theme} accent={accent} address={address} />;
    case "tax":
      return <TaxWidget theme={theme} accent={accent} />;
    case "rights":
      return <RightsWidget theme={theme} accent={accent} />;
    case "bundle": {
      const widgets = first(sp.widgets)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      return <BundleWidget theme={theme} accent={accent} address={address} widgets={widgets} />;
    }
  }
}
