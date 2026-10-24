import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { recordRegistrySnapshot } from "@/lib/registry-snapshot-recorder";
import { fetchRegistryDocumentByAddress, isTilkoRegistryDocAvailable, extractCommUniqueNoFromText } from "@/lib/tilko-api";

/**
 * 감시 물건 최초 등록 시 Tilko 등기부 발급 → commUniqueNo 추출 + baseline 저장.
 * app/api/monitoring/route.ts의 Tilko 경로와 동일 로직(회원 단건 활성화에서 재사용).
 * best-effort: 발급 실패해도 등록은 유지되고 크론이 재시도한다.
 * 이미 commUniqueNo가 있는 물건은 호출하지 않는다(주소만으로 등록된 단건용).
 */
export async function applyRegistryBaseline(propertyId: string, address: string): Promise<void> {
  if (!isTilkoRegistryDocAvailable()) return;
  try {
    const registry = await fetchRegistryDocumentByAddress({ address: address.trim() });
    const extractedNo = registry.commUniqueNo ?? extractCommUniqueNoFromText(registry.text) ?? undefined;
    const baselineHash = createHash("sha256").update(registry.text).digest("hex");
    await prisma.monitoredProperty.update({
      where: { id: propertyId },
      data: {
        ...(extractedNo ? { commUniqueNo: extractedNo } : {}),
        baselineData: registry.text,
        lastHash: baselineHash,
      },
    });
    await recordRegistrySnapshot({ propertyId, fullText: registry.text });
    // 주소·고유번호는 민감정보 → 식별자만 로그
    console.log(`[MONITORING] 최초 등기부 발급 완료: propertyId=${propertyId}${extractedNo ? " / 고유번호 확보" : ""}`);
  } catch (e) {
    console.error(`[MONITORING] 최초 등기부 발급 실패 (등록은 완료): propertyId=${propertyId}`, e instanceof Error ? e.message : e);
  }
}
