import { normalizePropertyAddress, addressKey, propertyUnitKey } from "../registry/title-address-parser";

type Obj = Record<string, unknown>;
export const objectValue = (v: unknown): Obj => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Obj : {};
const numberValue = (v: unknown) => typeof v === "number" && Number.isFinite(v) ? v : null;
const stringValue = (v: unknown) => typeof v === "string" && v.trim() ? v : null;
const gradeValue = (v: unknown) => typeof v === "string" && /^[ABCDF]$/.test(v) ? v : null;
export interface AnalysisSnapshot {
  id: string; type: string; typeLabel: string; address: string; createdAt: Date;
  data: string; vScore?: unknown;
}
export function parseSnapshot(row: AnalysisSnapshot): Obj {
  try { return objectValue(JSON.parse(row.data)); } catch { return {}; }
}
export function snapshotIdentity(row: AnalysisSnapshot) {
  const data = parseSnapshot(row);
  const property = objectValue(data.propertyInfo);
  const title = objectValue(objectValue(data.parsed).title);
  const address = normalizePropertyAddress(row.address);
  const unitNumber = stringValue(property.unitNumber) ?? stringValue(title.unitNumber) ?? "";
  const canonicalAddress = addressKey(address);
  const unitKey = propertyUnitKey(`${address} ${unitNumber}`);
  return {
    propUid: stringValue(property.propUid) ?? stringValue(title.propUid),
    address, unitNumber, unitKey,
    // 주소 내 동호수와 별도 필드의 표기 차이·중복을 제거한다. 주소부 공백은 단일화해 토큰 경계를 보존한다(#4).
    key: unitKey ? canonicalAddress.replace(/\d+(?:동|층|호)/g, " ").replace(/\s+/g, " ").trim() + " " + unitKey : canonicalAddress,
  };
}
export function sameProperty(a: AnalysisSnapshot, b: AnalysisSnapshot) {
  return samePropertyIdentity(snapshotIdentity(a), snapshotIdentity(b));
}
export function samePropertyIdentity(x: ReturnType<typeof snapshotIdentity>, y: ReturnType<typeof snapshotIdentity>) {
  if (x.propUid && y.propUid) return x.propUid === y.propUid;
  return Boolean(x.address && y.address && x.unitKey && y.unitKey && x.unitKey === y.unitKey && x.key === y.key);
}
export function normalizeRecord(row: AnalysisSnapshot) {
  const data = parseSnapshot(row);
  const risk = objectValue(data.riskScore);
  const analysis = objectValue(data.riskAnalysis);
  const ratios = objectValue(risk.claimRatios);
  const property = objectValue(data.propertyInfo);
  const v = Object.keys(objectValue(data.vScore)).length ? objectValue(data.vScore) : objectValue(row.vScore);
  const identity = snapshotIdentity(row);
  const factors = Array.isArray(risk.factors) ? risk.factors.flatMap(value => {
    const f = objectValue(value);
    return typeof f.id === "string" && typeof f.description === "string" && ["critical", "high", "medium", "low"].includes(String(f.severity))
      ? [{ id: f.id, description: f.description, severity: String(f.severity) }] : [];
  }) : null;
  // 원문 없는 레거시는 미확인(null). 요약 문장에서 수치를 추측하지 않는다.
  const safetyScore = analysis.analyzable === false ? null : numberValue(risk.totalScore) ?? numberValue(analysis.safetyScore);
  return {
    id: row.id, type: row.type, typeLabel: row.typeLabel, address: row.address,
    unitNumber: identity.unitNumber, createdAt: row.createdAt.toISOString(),
    metrics: {
      safetyScore, grade: safetyScore === null ? null : gradeValue(risk.grade),
      ratioToMarket: numberValue(ratios.ratioToMarket), jeonseRatio: numberValue(ratios.jeonseRatio),
      marketValue: numberValue(ratios.marketValue) ?? numberValue(property.estimatedPrice),
      userDeposit: numberValue(ratios.userDeposit),
      depositSource: numberValue(ratios.userDeposit) === null ? null : "user",
      vScore: analysis.analyzable === false ? null : numberValue(v.score) ?? numberValue(v.finalScore),
      vScoreGrade: analysis.analyzable === false ? null : gradeValue(v.grade), riskFactors: factors,
    },
    scoreRuleVersion: stringValue(risk.scoreRuleVersion) ?? stringValue(data.scoreRuleVersion),
  };
}
export type NormalizedAnalysisRecord = ReturnType<typeof normalizeRecord>;
export function compareRecords(current: NormalizedAnalysisRecord, previous: NormalizedAnalysisRecord | null) {
  if (!previous) return null;
  const a = current.metrics, b = previous.metrics;
  const delta = a.safetyScore !== null && b.safetyScore !== null ? a.safetyScore - b.safetyScore : null;
  return {
    safetyScore: delta === null ? null : { delta, direction: delta > 0 ? "improved" : delta < 0 ? "worse" : "unchanged" },
    jeonseRatio: a.jeonseRatio === null || b.jeonseRatio === null ? null : { deltaPp: Math.round((a.jeonseRatio - b.jeonseRatio) * 1e10) / 1e10 },
    addedRiskFactors: a.riskFactors === null || b.riskFactors === null ? null : a.riskFactors.filter(f => !b.riskFactors!.some(p => p.id === f.id)).map(f => f.id),
    resolvedRiskFactors: a.riskFactors === null || b.riskFactors === null ? null : b.riskFactors.filter(f => !a.riskFactors!.some(p => p.id === f.id)).map(f => f.id),
    // 동일 id의 심각도 변화(악화/완화)도 포착한다 — ID 유무만 보면 "변화 없음"으로 누락된다(F1).
    changedRiskFactors: a.riskFactors === null || b.riskFactors === null ? null : a.riskFactors.flatMap(f => {
      const prev = b.riskFactors!.find(p => p.id === f.id);
      return prev && prev.severity !== f.severity ? [{ id: f.id, description: f.description, from: prev.severity, to: f.severity }] : [];
    }),
    ruleVersionChanged: current.scoreRuleVersion !== previous.scoreRuleVersion,
  };
}
