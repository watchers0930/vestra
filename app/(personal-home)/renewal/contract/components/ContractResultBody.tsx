"use client";

import { useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Siren, Lightbulb, Pin, ShieldCheck, Search, RadioTower } from "lucide-react";
import type { AnalysisResult } from "@/app/(app)/contract/types";
import { formatAmount, severityMeta, clauseRiskMeta, termPriorityMeta, type Styles } from "./resultHelpers";

interface Props {
  s: Styles;
  result: AnalysisResult;
  openClauses: Record<number, boolean>;
  toggleClause: (i: number) => void;
  openTerms: Record<number, boolean>;
  toggleTerm: (i: number) => void;
}

interface Tab {
  key: string;
  tab: string;      // 탭 라벨(간결)
  title: string;    // 섹션 제목(전체)
  eyebrow: string;
  sub?: string;
  dot: string;
  badge?: ReactNode;
  body: ReactNode;
}

export default function ContractResultBody({
  s, result, openClauses, toggleClause, openTerms, toggleTerm,
}: Props) {
  const info = result.extractedInfo;
  const issues = result.reviewIssues ?? [];
  const clauses = result.clauses ?? [];
  const missing = result.missingClauses ?? [];
  const terms = result.recommendedTerms?.terms ?? [];

  const dangerCount = clauses.filter((c) => c.riskLevel === "high").length;
  const critN = issues.filter((i) => i.severity === "critical").length;
  const highN = issues.filter((i) => i.severity === "high").length;
  const warnN = issues.filter((i) => i.severity === "warning" || i.severity === "info").length;

  const [active, setActive] = useState(0);

  const tabs: Tab[] = [];

  // 핵심 계약 정보
  if (info) {
    tabs.push({
      key: "info", tab: "핵심 정보", title: "핵심 계약 정보", eyebrow: "Key Information", dot: "rsdGray",
      body: (
        <>
        {info.propertyDetails && info.propertyDetails.length > 0 && (
          <div className={s.propSection}>
            <div className={s.propTitle}>부동산의 표시</div>
            <div className={s.propTable}>
              {info.propertyDetails.map((d, i) => (
                <div className={s.propRow} key={i}>
                  <div className={s.propRowLabel}>{d.label}</div>
                  <div className={s.propRowVal}>{d.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className={s.kinfoGrid}>
          {info.landlordName && (
            <div className={s.kinfoTile}>
              <div className={s.kinfoLabel}>임대인 / 매도인</div>
              <div className={s.kinfoVal}>{info.landlordName}</div>
            </div>
          )}
          {info.tenantName && (
            <div className={s.kinfoTile}>
              <div className={s.kinfoLabel}>임차인 / 매수인</div>
              <div className={s.kinfoVal}>{info.tenantName}</div>
            </div>
          )}
          {formatAmount(info.depositAmount) && (
            <div className={s.kinfoTile}>
              <div className={s.kinfoLabel}>보증금</div>
              <div className={s.kinfoVal}>{formatAmount(info.depositAmount)}</div>
            </div>
          )}
          {formatAmount(info.monthlyRentAmount) && (
            <div className={s.kinfoTile}>
              <div className={s.kinfoLabel}>월 차임</div>
              <div className={s.kinfoVal}>{formatAmount(info.monthlyRentAmount)}</div>
            </div>
          )}
          {info.contractStartDate && (
            <div className={s.kinfoTile}>
              <div className={s.kinfoLabel}>계약 기간</div>
              <div className={s.kinfoVal}>{info.contractStartDate}</div>
              <div className={s.kinfoSub}>
                {info.contractEndDate ? `~ ${info.contractEndDate}` : ""}
                {info.durationMonths ? ` (${info.durationMonths}개월)` : ""}
              </div>
            </div>
          )}
          {info.paymentSchedule && info.paymentSchedule.length > 0 && (
            <div className={s.kinfoTile}>
              <div className={s.kinfoLabel}>지급 일정</div>
              <div className={s.kinfoVal}>{info.paymentSchedule.length}건</div>
              <div className={s.kinfoSub}>{info.paymentSchedule.map((p) => p.label).join(" · ")}</div>
            </div>
          )}
        </div>
        </>
      ),
    });
  }

  // 우선 검토 이슈
  if (issues.length > 0) {
    tabs.push({
      key: "issues", tab: "우선 이슈", title: "우선 검토 이슈", eyebrow: "Priority Issues",
      sub: "즉시 확인이 필요한 위험 요소입니다", dot: "rsdCritical",
      badge: critN > 0 ? <>긴급 {critN}</> : undefined,
      body: (
        <>
          <div className={`${s.issueCountBadge} ${s.icbRed}`}>
            <Siren size={12} /> 긴급 {critN}건 · 중요 {highN}건 · 확인 {warnN}건
          </div>
          {issues.map((issue) => {
            const sev = severityMeta[issue.severity] ?? severityMeta.warning;
            return (
              <div className={s.issueItem} key={issue.id}>
                <div className={s.issueSevCol}>
                  <div className={`${s.issueSevDot} ${s[sev.dotKey]}`}></div>
                  <span className={`${s.issueSevLabel} ${s[sev.labelKey]}`}>{sev.label}</span>
                </div>
                <div className={s.issueInfo}>
                  <div className={s.issueTitle}>{issue.title}</div>
                  <div className={s.issueDesc}>{issue.description}</div>
                  {issue.recommendation && (
                    <div className={s.issueRecommend}><Lightbulb size={12} /> {issue.recommendation}</div>
                  )}
                </div>
              </div>
            );
          })}
        </>
      ),
    });
  }

  // 조항별 분석
  if (clauses.length > 0) {
    tabs.push({
      key: "clauses", tab: "조항 분석", title: "조항별 분석", eyebrow: "Clause Analysis",
      sub: "계약서의 각 조항을 읽고 위험도를 판단했습니다", dot: "rsdHigh",
      badge: dangerCount > 0 ? <>위험 {dangerCount}</> : undefined,
      body: (
        <>
          {clauses.map((clause, i) => {
            const rm = clauseRiskMeta[clause.riskLevel] ?? clauseRiskMeta.warning;
            return (
              <div className={s.clauseItem} key={i}>
                <div className={s.clauseHead} onClick={() => toggleClause(i)}>
                  <div className={`${s.clauseLeftBar} ${s[rm.barKey]}`}></div>
                  <div className={s.clauseTitleBlock}>
                    <div className={s.clauseName}>{clause.title}</div>
                    <div className={s.clauseExcerpt}>{clause.content}</div>
                  </div>
                  <div className={s.clauseBadges}>
                    <span className={`${s.clauseRiskB} ${s[rm.badgeKey]}`}>{rm.label}</span>
                    <span className={openClauses[i] ? `${s.clauseArrow} ${s.clauseArrowOpen}` : s.clauseArrow}>›</span>
                  </div>
                </div>
                {openClauses[i] && (
                  <div className={s.clauseBody}>
                    <div className={s.clauseOriginalLabel}>원문</div>
                    <div className={s.clauseOriginal}>{clause.content}</div>
                    <div className={s.clauseAnalysisLabel} style={{ marginTop: "12px" }}>AI 분석</div>
                    <div className={s.clauseAnalysis}>{clause.analysis}</div>
                    {clause.relatedLaw && (
                      <>
                        <div className={s.clauseAnalysisLabel} style={{ marginTop: "12px" }}>관련 법규</div>
                        <div className={s.clauseAnalysis}>{clause.relatedLaw}</div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </>
      ),
    });
  }

  // 누락 조항
  if (missing.length > 0) {
    tabs.push({
      key: "missing", tab: "누락 조항", title: "누락 조항", eyebrow: "Missing Clauses",
      sub: "계약서에 포함되어야 할 중요 조항이 없습니다", dot: "rsdBlue",
      badge: <>{missing.length}건</>,
      body: (
        <>
          {missing.map((mc, i) => (
            <div className={s.missingItem} key={i}>
              <span className={`${s.missingPriority} ${mc.importance === "high" ? s.mpHigh : s.mpMedium}`}>
                {mc.importance === "high" ? "필수" : "권장"}
              </span>
              <div className={s.missingInfo}>
                <div className={s.missingTitle}>{mc.title}</div>
                <div className={s.missingDesc}>{mc.description}</div>
              </div>
            </div>
          ))}
        </>
      ),
    });
  }

  // 맞춤 특약 추천
  if (terms.length > 0) {
    tabs.push({
      key: "terms", tab: "특약 추천", title: "맞춤 특약 추천", eyebrow: "Recommended Special Terms",
      sub: "이 계약서에 추가하면 좋을 특약 조항입니다. 클릭하여 내용을 확인하세요.", dot: "rsdGreen",
      body: (
        <>
          {terms.map((term, i) => {
            const pm = termPriorityMeta[term.template.priority] ?? termPriorityMeta.medium;
            return (
              <div className={s.termItem} key={term.template.id ?? i}>
                <div className={s.termHead} onClick={() => toggleTerm(i)}>
                  <span className={`${s.termPriority} ${s[pm.classKey]}`}>{pm.label}</span>
                  <span className={s.termTitle}>{term.template.title}</span>
                  <span className={openTerms[i] ? `${s.termArrow} ${s.termArrowOpen}` : s.termArrow}>›</span>
                </div>
                {openTerms[i] && (
                  <div className={s.termBody}>
                    <div className={s.termText}>{term.template.template}</div>
                    {(term.rationale || term.template.rationale) && (
                      <div className={s.termReason}><Pin size={12} /> 이유: {term.rationale || term.template.rationale}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </>
      ),
    });
  }

  // 안전 체크리스트 (정적)
  tabs.push({
    key: "checklist", tab: "체크리스트", title: "안전 체크리스트", eyebrow: "Safety Checklist",
    sub: "계약 전 반드시 확인해야 할 사항입니다", dot: "rsdGray",
    body: (
      <div className={s.checklist}>
        <div className={s.checkItem}>
          <div className={`${s.checkIco} ${s.checkIcoDone}`}><CheckCircle2 size={13} /></div>
          <div className={s.checkInfo}>
            <div className={s.checkTitle}>등기부 말소 이력 확인</div>
            <div className={s.checkDesc}>계약 당일 등기부등본을 직접 발급하여 최신 근저당·압류 현황을 확인하세요.</div>
          </div>
          <span className={`${s.checkStatus} ${s.csManual}`}>직접 확인</span>
        </div>
        <div className={s.checkItem}>
          <div className={`${s.checkIco} ${s.checkIcoWarn}`}><AlertTriangle size={13} /></div>
          <div className={s.checkInfo}>
            <div className={s.checkTitle}>전세보증보험 가입 가능 여부</div>
            <div className={s.checkDesc}>근저당 + 전세보증금 합산이 KB시세의 80%를 초과할 경우 HUG 보험 가입이 불가합니다. 사전 확인 필수.</div>
          </div>
          <span className={`${s.checkStatus} ${s.csWarn}`}>확인 필요</span>
        </div>
        <div className={s.checkItem}>
          <div className={`${s.checkIco} ${s.checkIcoDone}`}><CheckCircle2 size={13} /></div>
          <div className={s.checkInfo}>
            <div className={s.checkTitle}>세금 체납 확인</div>
            <div className={s.checkDesc}>국세·지방세 완납증명서를 임대인에게 요청하세요. 세금 체납이 있으면 경매 시 국세가 보증금보다 우선합니다.</div>
          </div>
          <span className={`${s.checkStatus} ${s.csManual}`}>직접 확인</span>
        </div>
        <div className={s.checkItem}>
          <div className={`${s.checkIco} ${s.checkIcoDone}`}><CheckCircle2 size={13} /></div>
          <div className={s.checkInfo}>
            <div className={s.checkTitle}>전입신고 및 확정일자 수령</div>
            <div className={s.checkDesc}>잔금 지급 당일 즉시 전입신고하고 주민센터에서 확정일자를 받으세요. 대항력 취득에 필수입니다.</div>
          </div>
          <span className={`${s.checkStatus} ${s.csDone}`}>완료</span>
        </div>
        <div className={s.checkItem}>
          <div className={`${s.checkIco} ${s.checkIcoWarn}`}><AlertTriangle size={13} /></div>
          <div className={s.checkInfo}>
            <div className={s.checkTitle}>권원보험 가입 검토</div>
            <div className={s.checkDesc}>등기부에 나타나지 않는 위험(이중 계약, 사기 임대 등)으로부터 보증금을 보호합니다. 고액 전세의 경우 추가 보호 수단으로 고려하세요.</div>
          </div>
          <span className={`${s.checkStatus} ${s.csWarn}`}>검토 권장</span>
        </div>
      </div>
    ),
  });

  // 분석 정보
  tabs.push({
    key: "report", tab: "분석 정보", title: "분석 정보", eyebrow: "Report Info", dot: "rsdGray",
    body: (
      <>
        <div className={s.integrityBadge}>
          <span className={s.ibIco}><ShieldCheck size={20} /></span>
          <div>
            <div className={s.ibT}>분석 결과 암호화 보호 중</div>
            <div className={s.ibS}>SHA-256 해시로 리포트 무결성 검증 완료</div>
          </div>
        </div>
        <div className={s.disclaimer}>
          <div className={s.disclaimerT}><AlertTriangle size={12} /> 주의사항</div>
          <div className={s.disclaimerD}>본 분석 결과는 AI가 계약서 텍스트를 기반으로 생성한 참고 자료이며, 법률 자문이 아닙니다. 중요한 계약 체결 전에는 반드시 자격을 갖춘 법률 전문가(변호사, 법무사)의 검토를 받으시기 바랍니다.</div>
        </div>
        <div style={{ marginTop: "20px", fontSize: "13.5px", fontWeight: 700, color: "#1a1d2e", marginBottom: "12px" }}>연관 분석 서비스</div>
        <div className={s.relatedCta}>
          <div className={s.rctaCard}>
            <div className={s.rctaIco}><Search size={22} /></div>
            <div className={s.rctaT}>권리관계 분석</div>
            <div className={s.rctaS}>등기부등본 기반 근저당·압류·가처분 등 권리 현황을 상세히 분석합니다.</div>
            <div className={s.rctaArrow}>분석하기 →</div>
          </div>
          <div className={s.rctaCard}>
            <div className={s.rctaIco}><RadioTower size={22} /></div>
            <div className={s.rctaT}>등기감시 시작</div>
            <div className={s.rctaS}>계약 체결 후 등기 변동을 실시간으로 감시하고 이상 징후를 즉시 알립니다.</div>
            <div className={s.rctaArrow}>감시 시작 →</div>
          </div>
        </div>
      </>
    ),
  });

  const activeIdx = Math.min(active, tabs.length - 1);
  const current = tabs[activeIdx];

  return (
    <div className={s.resultLayout}>
      {/* 가로 탭바 */}
      <div className={s.resultTabs}>
        {tabs.map((t, i) => (
          <button
            key={t.key}
            className={`${s.rtItem} ${i === activeIdx ? s.rtItemOn : ""}`}
            onClick={() => setActive(i)}
          >
            <span className={`${s.rtDot} ${s[t.dot]}`}></span>
            {t.tab}
            {t.badge && <span className={s.rtBadge}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* 활성 섹션 */}
      <div className={s.sec}>
        <div className={s.secHead}>
          <div className={s.secEyebrow}>{current.eyebrow}</div>
          <div className={s.secTitle}>{current.title}</div>
          {current.sub && <div className={s.secSub}>{current.sub}</div>}
        </div>
        <div className={s.secBody}>{current.body}</div>
      </div>
    </div>
  );
}
