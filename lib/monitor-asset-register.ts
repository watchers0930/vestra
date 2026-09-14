/**
 * 등기감시 등록 시 "내 자산으로 등록" 처리.
 * - 등기부 원문(PDF)이 있으면 권리분석까지 완전 실행(가치·안전도·위험도).
 * - 주소만이면 시세만 채우고 안전도/위험도는 미분석(0)으로 저장.
 * addOrUpdateAsset이 localStorage + 서버(sync-data) 동기화까지 수행한다.
 */
import { addOrUpdateAsset } from "@/lib/store";

interface Params {
  address: string;
  registryText?: string; // 등기부 PDF 원문 (있으면 완전 분석)
}

interface Result {
  ok: boolean;
  analyzed: boolean; // true=권리분석까지 완료, false=시세만(미분석)
}

export async function analyzeAndSaveMonitoredAsset({ address, registryText }: Params): Promise<Result> {
  try {
    // 등기부 원문 보유 → 권리분석 완전 실행
    if (registryText && registryText.trim().length >= 20) {
      const res = await fetch("/api/analyze-unified", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: registryText, source: "manual" }),
      });
      if (!res.ok) throw new Error("analyze failed");
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      addOrUpdateAsset({
        address: data.propertyInfo?.address || address,
        type: data.propertyInfo?.type || "부동산",
        estimatedPrice: data.propertyInfo?.estimatedPrice || 0,
        jeonsePrice: data.propertyInfo?.jeonsePrice || 0,
        safetyScore: data.riskAnalysis?.safetyScore || 0,
        riskScore: data.riskAnalysis?.riskScore || 0,
      });
      return { ok: true, analyzed: true };
    }

    // 주소만 → 시세만 조회, 안전도/위험도는 미분석(0)
    let estimatedPrice = 0;
    let jeonsePrice = 0;
    let type = "부동산";
    const res = await fetch(`/api/analyze-unified?address=${encodeURIComponent(address)}`);
    if (res.ok) {
      const geo = await res.json().catch(() => null);
      const p = geo?.price;
      if (p?.sale?.avgPrice) estimatedPrice = p.sale.avgPrice;
      else if (p?.rent?.avgDeposit) estimatedPrice = p.rent.avgDeposit;
      if (p?.rent?.avgDeposit) jeonsePrice = p.rent.avgDeposit;
      if (geo?.building?.mainPurpose) type = geo.building.mainPurpose;
    }
    addOrUpdateAsset({
      address,
      type,
      estimatedPrice,
      jeonsePrice,
      safetyScore: 0, // 미분석
      riskScore: 0, // 미분석
    });
    return { ok: true, analyzed: false };
  } catch {
    return { ok: false, analyzed: false };
  }
}
