(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/lib/store.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// localStorage 기반 분석 결과 저장소
// 사용자가 각 모듈에서 분석한 결과를 저장하고, 대시보드에서 불러옴
// XSS 방어를 위해 Base64 인코딩 적용
__turbopack_context__.s([
    "addAnalysis",
    ()=>addAnalysis,
    "addOrUpdateAsset",
    ()=>addOrUpdateAsset,
    "clearAll",
    ()=>clearAll,
    "getAnalyses",
    ()=>getAnalyses,
    "getAssets",
    ()=>getAssets,
    "removeAnalysis",
    ()=>removeAnalysis,
    "removeAsset",
    ()=>removeAsset
]);
const ANALYSIS_KEY = "vestra_analyses";
const ASSETS_KEY = "vestra_assets";
// ─── 인코딩/디코딩 (XSS 시 평문 노출 방지) ───
function encode(data) {
    return btoa(encodeURIComponent(JSON.stringify(data)));
}
function decode(raw) {
    try {
        return JSON.parse(decodeURIComponent(atob(raw)));
    } catch  {
        // 레거시 평문 데이터 호환
        try {
            return JSON.parse(raw);
        } catch  {
            return null;
        }
    }
}
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function getAnalyses() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    try {
        const raw = localStorage.getItem(ANALYSIS_KEY);
        if (!raw) return [];
        return decode(raw) ?? [];
    } catch  {
        return [];
    }
}
function addAnalysis(record) {
    const analyses = getAnalyses();
    const newRecord = {
        ...record,
        id: generateId(),
        date: new Date().toISOString()
    };
    analyses.unshift(newRecord);
    // 최대 50건
    if (analyses.length > 50) analyses.splice(50);
    localStorage.setItem(ANALYSIS_KEY, encode(analyses));
    return newRecord;
}
function getAssets() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    try {
        const raw = localStorage.getItem(ASSETS_KEY);
        if (!raw) return [];
        return decode(raw) ?? [];
    } catch  {
        return [];
    }
}
function addOrUpdateAsset(asset) {
    const assets = getAssets();
    const existing = assets.find((a)=>a.address === asset.address);
    if (existing) {
        Object.assign(existing, asset, {
            lastAnalyzedDate: new Date().toISOString()
        });
        localStorage.setItem(ASSETS_KEY, encode(assets));
        return existing;
    }
    const newAsset = {
        ...asset,
        id: generateId(),
        lastAnalyzedDate: new Date().toISOString()
    };
    assets.unshift(newAsset);
    localStorage.setItem(ASSETS_KEY, encode(assets));
    return newAsset;
}
function removeAnalysis(id) {
    const analyses = getAnalyses().filter((a)=>a.id !== id);
    localStorage.setItem(ANALYSIS_KEY, encode(analyses));
}
function removeAsset(id) {
    const assets = getAssets().filter((a)=>a.id !== id);
    localStorage.setItem(ASSETS_KEY, encode(assets));
}
function clearAll() {
    localStorage.removeItem(ANALYSIS_KEY);
    localStorage.removeItem(ASSETS_KEY);
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/registry-parser.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * VESTRA 등기부등본 자동 파싱 엔진
 * ─────────────────────────────────
 * 순수 TypeScript 구현. AI/LLM 호출 없음.
 * 정규식 패턴 매칭 + 키워드 분류로 등기부등본 원문을 구조화된 데이터로 변환.
 *
 * 지원 형식: 인터넷등기소 텍스트, 법원등기 텍스트, OCR 추출 텍스트
 */ // ─── 타입 정의 ───
__turbopack_context__.s([
    "SAMPLE_REGISTRY_TEXT",
    ()=>SAMPLE_REGISTRY_TEXT,
    "extractAmount",
    ()=>extractAmount,
    "parseRegistry",
    ()=>parseRegistry
]);
// ─── 상수 ───
/** 갑구 권리 유형 → 위험도 매핑 */ const GAPGU_RISK_MAP = {
    소유권이전: "safe",
    소유권보존: "safe",
    가압류: "danger",
    압류: "danger",
    가처분: "danger",
    경매개시결정: "danger",
    임의경매개시결정: "danger",
    강제경매개시결정: "danger",
    신탁: "warning",
    신탁등기: "warning",
    가등기: "warning",
    소유권이전청구권가등기: "warning",
    환매등기: "warning",
    예고등기: "warning"
};
/** 을구 권리 유형 → 위험도 매핑 */ const EULGU_RISK_MAP = {
    근저당권설정: "warning",
    저당권설정: "warning",
    전세권설정: "info",
    지상권설정: "info",
    지역권설정: "info",
    임차권등기: "info",
    임차권설정: "info",
    가압류: "danger",
    압류: "danger",
    가등기: "warning",
    전세권이전: "info",
    근저당권이전: "warning",
    근저당권변경: "warning"
};
// ─── 유틸리티 함수 ───
/** 다양한 한국 날짜 형식을 통일 포맷으로 변환 */ function extractDate(text) {
    // "2023년 5월 15일", "2023년05월15일"
    const m1 = text.match(/(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
    if (m1) return `${m1[1]}.${m1[2].padStart(2, "0")}.${m1[3].padStart(2, "0")}`;
    // "2023.05.15", "2023-05-15"
    const m2 = text.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
    if (m2) return `${m2[1]}.${m2[2].padStart(2, "0")}.${m2[3].padStart(2, "0")}`;
    return "";
}
function extractAmount(text) {
    // "금 420,000,000원" → 420000000
    const m1 = text.match(/금\s*([\d,]+)\s*원/);
    if (m1) return parseInt(m1[1].replace(/,/g, ""), 10);
    // "금XXX,XXX,XXX원" (공백 없는 경우)
    const m1b = text.match(/([\d,]{4,})\s*원/);
    if (m1b) return parseInt(m1b[1].replace(/,/g, ""), 10);
    // "채권최고액 금3억5,000만원" → 350000000
    const m2 = text.match(/금\s*(\d+)\s*억\s*([\d,]*)\s*만/);
    if (m2) {
        const eok = parseInt(m2[1], 10) * 100000000;
        const man = m2[2] ? parseInt(m2[2].replace(/,/g, ""), 10) * 10000 : 0;
        return eok + man;
    }
    // "금3억원"
    const m3 = text.match(/금\s*(\d+)\s*억\s*원/);
    if (m3) return parseInt(m3[1], 10) * 100000000;
    // "금5,000만원"
    const m4 = text.match(/금\s*([\d,]+)\s*만\s*원/);
    if (m4) return parseInt(m4[1].replace(/,/g, ""), 10) * 10000;
    // 숫자만 있는 경우 (최소 6자리 이상)
    const m5 = text.match(/([\d,]{7,})/);
    if (m5) return parseInt(m5[1].replace(/,/g, ""), 10);
    return 0;
}
/** 텍스트에서 권리 유형 키워드 매칭 */ function classifyRightType(text, riskMap) {
    // 길이가 긴 키워드부터 매칭 (더 구체적인 것 우선)
    const sortedKeys = Object.keys(riskMap).sort((a, b)=>b.length - a.length);
    for (const key of sortedKeys){
        if (text.includes(key)) {
            return {
                type: key,
                risk: riskMap[key]
            };
        }
    }
    return {
        type: "기타",
        risk: "info"
    };
}
/** 말소 여부 판별 */ function isCancelled(text) {
    return /말소|말소기준등기|말소회복/.test(text);
}
/** 면적 추출 */ function extractArea(text) {
    const m = text.match(/([\d.]+)\s*㎡/);
    return m ? `${m[1]}㎡` : "";
}
/** 권리자/소유자 이름 추출 */ function extractHolder(text) {
    // 법인/기관명 (개인보다 먼저 체크 — 법인명이 더 긴 패턴)
    const corpPatterns = [
        /((?:주식회사|㈜)\s*[가-힣A-Za-z0-9\s]{1,30})/,
        /([가-힣]+(?:은행|보험|저축은행|캐피탈|신용협동조합|신탁|증권|자산관리|공사|조합|재단|학교법인|종교법인|사단법인|재단법인|유한회사|합자회사|합명회사)[가-힣\s]*)/,
        /((?:사\)|사\(|법인)[가-힣\s]{2,20})/
    ];
    for (const pattern of corpPatterns){
        const m = text.match(pattern);
        if (m) return m[1].trim();
    }
    // 한글 이름 패턴 (2~5글자 — 복성/긴 이름 지원)
    const m = text.match(/([가-힣]{2,5})\s*(?:\d{6}|[（(]|$)/);
    if (m) return m[1];
    return "";
}
function splitSections(text) {
    const normalized = text.replace(/\r\n/g, "\n").replace(/\t/g, " ");
    // 섹션 헤더 패턴 (다양한 포맷 대응)
    const titlePattern = /【\s*표\s*제\s*부\s*】/;
    const gapguPattern = /【\s*갑\s*구\s*】/;
    const eulguPattern = /【\s*을\s*구\s*】/;
    // 대체 패턴 (괄호 형식)
    const titlePatternAlt = /\[\s*표\s*제\s*부\s*\]/;
    const gapguPatternAlt = /\[\s*갑\s*구\s*\]/;
    const eulguPatternAlt = /\[\s*을\s*구\s*\]/;
    // 일반 텍스트 패턴
    const titlePatternText = /표\s*제\s*부/;
    const gapguPatternText = /갑\s*구/;
    const eulguPatternText = /을\s*구/;
    function findIndex(patterns) {
        for (const p of patterns){
            const m = normalized.search(p);
            if (m !== -1) return m;
        }
        return -1;
    }
    const titleIdx = findIndex([
        titlePattern,
        titlePatternAlt,
        titlePatternText
    ]);
    const gapguIdx = findIndex([
        gapguPattern,
        gapguPatternAlt,
        gapguPatternText
    ]);
    const eulguIdx = findIndex([
        eulguPattern,
        eulguPatternAlt,
        eulguPatternText
    ]);
    const titleRaw = titleIdx !== -1 && gapguIdx !== -1 ? normalized.slice(titleIdx, gapguIdx) : titleIdx !== -1 ? normalized.slice(titleIdx, gapguIdx !== -1 ? gapguIdx : eulguIdx !== -1 ? eulguIdx : undefined) : "";
    const gapguRaw = gapguIdx !== -1 ? normalized.slice(gapguIdx, eulguIdx !== -1 ? eulguIdx : undefined) : "";
    const eulguRaw = eulguIdx !== -1 ? normalized.slice(eulguIdx) : "";
    return {
        titleRaw,
        gapguRaw,
        eulguRaw
    };
}
// ─── 표제부 파싱 ───
function parseTitle(raw) {
    const result = {
        address: "",
        buildingDetail: "",
        area: "",
        structure: "",
        purpose: "",
        landRightRatio: ""
    };
    if (!raw) return result;
    const lines = raw.split("\n").map((l)=>l.trim()).filter(Boolean);
    for (const line of lines){
        // 소재지
        if (/소재지|소재지번/.test(line) || /[가-힣]+[시도]\s*[가-힣]+[시군구]/.test(line)) {
            const addrMatch = line.match(/([가-힣]+(?:시|도)\s+[가-힣]+(?:시|군|구)[\s가-힣\d\-호동층]*)/);
            if (addrMatch) result.address = addrMatch[1].trim();
        }
        // 면적
        const area = extractArea(line);
        if (area && !result.area) result.area = area;
        // 구조
        if (/철근콘크리트|철골|벽돌|목조|경량철골|조적/.test(line)) {
            const structMatch = line.match(/((?:철근콘크리트|철골철근콘크리트|철골|벽돌|목조|경량철골|조적)[가-힣\s]*조)/);
            if (structMatch) result.structure = structMatch[1];
        }
        // 용도
        if (/아파트|다세대|다가구|단독주택|오피스텔|근린생활|업무시설|주거용/.test(line)) {
            const purposeMatch = line.match(/(아파트|다세대주택|다가구주택|단독주택|오피스텔|제[12]종근린생활시설|업무시설|공동주택)/);
            if (purposeMatch) result.purpose = purposeMatch[1];
        }
        // 대지권 비율
        if (/대지권\s*비율|대지권비율/.test(line)) {
            const ratioMatch = line.match(/([\d.]+분의\s*[\d.]+|[\d.]+\/[\d.]+)/);
            if (ratioMatch) result.landRightRatio = ratioMatch[1];
        }
        // 건물 내역 (면적 + 구조 + 용도가 함께 있는 줄)
        if (/㎡/.test(line) && !result.buildingDetail) {
            result.buildingDetail = line.replace(/^[\d\s|]+/, "").trim();
        }
    }
    return result;
}
// ─── 갑구 파싱 ───
function parseGapgu(raw) {
    if (!raw) return [];
    const entries = [];
    const lines = raw.split("\n").map((l)=>l.trim()).filter(Boolean);
    // 헤더 라인 스킵
    let startIdx = 0;
    for(let i = 0; i < lines.length; i++){
        if (/순위번호|등기목적|접수/.test(lines[i])) {
            startIdx = i + 1;
            break;
        }
    }
    let currentEntry = null;
    let orderCounter = 0;
    for(let i = startIdx; i < lines.length; i++){
        const line = lines[i];
        // 새 항목 시작 감지: 순위번호(숫자)로 시작하거나, 등기 키워드가 있는 줄
        const orderMatch = line.match(/^(\d+)\s/);
        const hasRightKeyword = Object.keys(GAPGU_RISK_MAP).some((k)=>line.includes(k));
        const hasDate = extractDate(line) !== "";
        if (orderMatch || hasRightKeyword && hasDate) {
            // 이전 엔트리 저장
            if (currentEntry && currentEntry.purpose) {
                entries.push(currentEntry);
            }
            orderCounter++;
            const date = extractDate(line);
            const { type, risk } = classifyRightType(line, GAPGU_RISK_MAP);
            const cancelled = isCancelled(line);
            const holder = extractHolder(line);
            currentEntry = {
                order: orderMatch ? parseInt(orderMatch[1], 10) : orderCounter,
                date,
                purpose: type,
                detail: line,
                holder,
                isCancelled: cancelled,
                riskType: cancelled ? "info" : risk
            };
        } else if (currentEntry) {
            // 현재 엔트리에 추가 정보 누적
            currentEntry.detail += " " + line;
            // 추가 줄에서 정보 보완
            if (!currentEntry.date) {
                const d = extractDate(line);
                if (d) currentEntry.date = d;
            }
            if (!currentEntry.holder) {
                const h = extractHolder(line);
                if (h) currentEntry.holder = h;
            }
            if (currentEntry.purpose === "기타") {
                const { type, risk } = classifyRightType(line, GAPGU_RISK_MAP);
                if (type !== "기타") {
                    currentEntry.purpose = type;
                    currentEntry.riskType = currentEntry.isCancelled ? "info" : risk;
                }
            }
            if (isCancelled(line)) {
                currentEntry.isCancelled = true;
                currentEntry.riskType = "info";
            }
        }
    }
    // 마지막 엔트리 저장
    if (currentEntry && currentEntry.purpose) {
        entries.push(currentEntry);
    }
    return entries;
}
// ─── 을구 파싱 ───
function parseEulgu(raw) {
    if (!raw) return [];
    const entries = [];
    const lines = raw.split("\n").map((l)=>l.trim()).filter(Boolean);
    let startIdx = 0;
    for(let i = 0; i < lines.length; i++){
        if (/순위번호|등기목적|접수/.test(lines[i])) {
            startIdx = i + 1;
            break;
        }
    }
    let currentEntry = null;
    let orderCounter = 0;
    for(let i = startIdx; i < lines.length; i++){
        const line = lines[i];
        const orderMatch = line.match(/^(\d+)\s/);
        const hasRightKeyword = Object.keys(EULGU_RISK_MAP).some((k)=>line.includes(k));
        const hasDate = extractDate(line) !== "";
        if (orderMatch || hasRightKeyword && hasDate) {
            if (currentEntry && currentEntry.purpose) {
                entries.push(currentEntry);
            }
            orderCounter++;
            const date = extractDate(line);
            const { type, risk } = classifyRightType(line, EULGU_RISK_MAP);
            const cancelled = isCancelled(line);
            const amount = extractAmount(line);
            const holder = extractHolder(line);
            currentEntry = {
                order: orderMatch ? parseInt(orderMatch[1], 10) : orderCounter,
                date,
                purpose: type,
                detail: line,
                amount,
                holder,
                isCancelled: cancelled,
                riskType: cancelled ? "info" : risk
            };
        } else if (currentEntry) {
            currentEntry.detail += " " + line;
            // 금액이 다음 줄에 있는 경우
            if (!currentEntry.amount || currentEntry.amount === 0) {
                const amt = extractAmount(line);
                if (amt > 0) currentEntry.amount = amt;
            }
            if (!currentEntry.date) {
                const d = extractDate(line);
                if (d) currentEntry.date = d;
            }
            if (!currentEntry.holder) {
                const h = extractHolder(line);
                if (h) currentEntry.holder = h;
            }
            if (currentEntry.purpose === "기타") {
                const { type, risk } = classifyRightType(line, EULGU_RISK_MAP);
                if (type !== "기타") {
                    currentEntry.purpose = type;
                    currentEntry.riskType = currentEntry.isCancelled ? "info" : risk;
                }
            }
            if (isCancelled(line)) {
                currentEntry.isCancelled = true;
                currentEntry.riskType = "info";
            }
        }
    }
    if (currentEntry && currentEntry.purpose) {
        entries.push(currentEntry);
    }
    return entries;
}
// ─── 요약 생성 ───
function buildSummary(gapgu, eulgu) {
    const activeGapgu = gapgu.filter((e)=>!e.isCancelled);
    const activeEulgu = eulgu.filter((e)=>!e.isCancelled);
    const totalMortgageAmount = activeEulgu.filter((e)=>/근저당|저당/.test(e.purpose)).reduce((sum, e)=>sum + e.amount, 0);
    const totalJeonseAmount = activeEulgu.filter((e)=>/전세권/.test(e.purpose)).reduce((sum, e)=>sum + e.amount, 0);
    return {
        totalGapguEntries: gapgu.length,
        totalEulguEntries: eulgu.length,
        activeGapguEntries: activeGapgu.length,
        activeEulguEntries: activeEulgu.length,
        cancelledEntries: gapgu.filter((e)=>e.isCancelled).length + eulgu.filter((e)=>e.isCancelled).length,
        totalMortgageAmount,
        totalJeonseAmount,
        hasSeizure: activeGapgu.some((e)=>e.purpose === "압류"),
        hasProvisionalSeizure: activeGapgu.some((e)=>e.purpose === "가압류"),
        hasProvisionalDisposition: activeGapgu.some((e)=>e.purpose === "가처분"),
        hasAuctionOrder: activeGapgu.some((e)=>/경매개시결정/.test(e.purpose)),
        hasTrust: activeGapgu.some((e)=>/신탁/.test(e.purpose)),
        hasProvisionalRegistration: [
            ...activeGapgu,
            ...activeEulgu
        ].some((e)=>e.purpose === "가등기"),
        hasLeaseRegistration: activeEulgu.some((e)=>/임차권등기|임차권설정/.test(e.purpose)),
        hasWarningRegistration: activeGapgu.some((e)=>e.purpose === "예고등기"),
        hasRedemptionRegistration: activeGapgu.some((e)=>/환매/.test(e.purpose)),
        ownershipTransferCount: gapgu.filter((e)=>e.purpose === "소유권이전" && !e.isCancelled).length,
        totalClaimsAmount: totalMortgageAmount + totalJeonseAmount
    };
}
function parseRegistry(rawText) {
    const { titleRaw, gapguRaw, eulguRaw } = splitSections(rawText);
    const title = parseTitle(titleRaw);
    const gapgu = parseGapgu(gapguRaw);
    const eulgu = parseEulgu(eulguRaw);
    const summary = buildSummary(gapgu, eulgu);
    return {
        title,
        gapgu,
        eulgu,
        summary,
        rawText
    };
}
const SAMPLE_REGISTRY_TEXT = `
──────────────────────────────────────────────────────
                    등 기 부 등 본 (건물)
                    고유번호: 1101-2024-012345
──────────────────────────────────────────────────────

【 표 제 부 】 (건물의 표시)

 표시번호 |  접  수  |     소재지번 및 건물번호     |        건물내역        | 등기원인 및 기타사항
─────────────────────────────────────────────────────────────────────────────
    1     2019년3월15일  서울특별시 강남구 역삼동      철근콘크리트조           [대지권의 목적인 토지의 표시]
                        123-45 래미안레벤투스         지붕슬래브방수           서울특별시 강남구 역삼동
                        제101동 제15층 제1502호       아파트                   123-45
                                                     84.97㎡                  대지권비율 52718.4분의 84.97

【 갑 구 】 (소유권에 관한 사항)

 순위번호 |  등기목적  |     접  수     |      등기원인       |       권리자 및 기타사항
─────────────────────────────────────────────────────────────────────────────
    1     소유권보존   2019년3월20일    2019년3월15일        소유자 대한건설주식회사
                      제12345호        보존등기              110111-0012345

    2     소유권이전   2019년8월10일    2019년8월5일         소유자 김영수
                      제23456호        매매                  850101-1234567
                                                            서울특별시 강남구 역삼로 123

    3     소유권이전   2022년5월20일    2022년5월15일        소유자 박지민
                      제34567호        매매                  900215-2345678
                                                            서울특별시 서초구 서초대로 456

    4     가압류      2024년8월15일    2024년8월14일         채권자 이상호
                      제45678호        서울중앙지방법원       청구금액 금 150,000,000원
                                      2024카단12345

    5     소유권이전   2025년1월10일    2025년1월8일         소유자 최현우
                      제56789호        매매                  880320-1456789
                                                            서울특별시 강남구 테헤란로 789
          가압류말소   2025년1월10일    해제
                      제56790호

【 을 구 】 (소유권 이외의 권리에 관한 사항)

 순위번호 |  등기목적  |     접  수     |      등기원인       |       권리자 및 기타사항
─────────────────────────────────────────────────────────────────────────────
    1     근저당권설정  2019년8월12일   2019년8월10일         채권최고액 금 480,000,000원
                      제23460호        설정계약              근저당권자 국민은행
                                                            채무자 김영수

    2     근저당권설정  2022년5월25일   2022년5월20일         채권최고액 금 360,000,000원
                      제34570호        설정계약              근저당권자 신한은행
                                                            채무자 박지민
          1번근저당권말소 2022년5월25일  해제
                      제34571호

    3     전세권설정   2023년3월10일    2023년3월8일          전세금 금 550,000,000원
                      제40001호        설정계약              전세권자 정민수
                                                            범위: 건물전부
                                                            존속기간: 2023년3월10일부터 2025년3월9일까지

    4     근저당권설정  2025년1월15일   2025년1월10일         채권최고액 금 540,000,000원
                      제56800호        설정계약              근저당권자 하나은행
                                                            채무자 최현우
          2번근저당권말소 2025년1월15일  해제
                      제56801호
`.trim();
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/common/Card.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Card",
    ()=>Card,
    "CardContent",
    ()=>CardContent,
    "CardHeader",
    ()=>CardHeader
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
;
;
function Card({ children, className, hover = false }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("rounded-2xl bg-[#f5f5f7] border border-[#d2d2d7]/50", hover && "transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)]", className),
        children: children
    }, void 0, false, {
        fileName: "[project]/components/common/Card.tsx",
        lineNumber: 11,
        columnNumber: 5
    }, this);
}
_c = Card;
function CardHeader({ title, description, children, className }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex items-center justify-between mb-5", className),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: "text-lg font-semibold text-[#1d1d1f]",
                        children: title
                    }, void 0, false, {
                        fileName: "[project]/components/common/Card.tsx",
                        lineNumber: 34,
                        columnNumber: 9
                    }, this),
                    description && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "mt-0.5 text-sm text-[#86868b]",
                        children: description
                    }, void 0, false, {
                        fileName: "[project]/components/common/Card.tsx",
                        lineNumber: 36,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/common/Card.tsx",
                lineNumber: 33,
                columnNumber: 7
            }, this),
            children
        ]
    }, void 0, true, {
        fileName: "[project]/components/common/Card.tsx",
        lineNumber: 32,
        columnNumber: 5
    }, this);
}
_c1 = CardHeader;
function CardContent({ children, className }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("p-6", className),
        children: children
    }, void 0, false, {
        fileName: "[project]/components/common/Card.tsx",
        lineNumber: 50,
        columnNumber: 10
    }, this);
}
_c2 = CardContent;
var _c, _c1, _c2;
__turbopack_context__.k.register(_c, "Card");
__turbopack_context__.k.register(_c1, "CardHeader");
__turbopack_context__.k.register(_c2, "CardContent");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/common/PageHeader.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PageHeader",
    ()=>PageHeader
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
;
function PageHeader({ icon: Icon, title, description }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "mb-8",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                className: "text-2xl font-bold flex items-center gap-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                        className: "text-primary",
                        size: 28
                    }, void 0, false, {
                        fileName: "[project]/components/common/PageHeader.tsx",
                        lineNumber: 13,
                        columnNumber: 9
                    }, this),
                    title
                ]
            }, void 0, true, {
                fileName: "[project]/components/common/PageHeader.tsx",
                lineNumber: 12,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-secondary mt-1",
                children: description
            }, void 0, false, {
                fileName: "[project]/components/common/PageHeader.tsx",
                lineNumber: 16,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/common/PageHeader.tsx",
        lineNumber: 11,
        columnNumber: 5
    }, this);
}
_c = PageHeader;
var _c;
__turbopack_context__.k.register(_c, "PageHeader");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/common/Button.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Button",
    ()=>Button
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-client] (ecmascript) <export default as Loader2>");
;
;
;
const variantStyles = {
    primary: "bg-primary text-white hover:bg-primary/90 border-transparent",
    secondary: "bg-white text-[#1d1d1f] border-[#d2d2d7] hover:bg-[#f5f5f7]",
    danger: "bg-red-500 text-white hover:bg-red-600 border-transparent",
    ghost: "bg-transparent text-[#424245] hover:bg-[#f5f5f7] border-transparent",
    amber: "bg-amber-500 text-white hover:bg-amber-600 border-transparent"
};
const sizeStyles = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-sm"
};
function Button({ variant = "primary", icon: Icon, loading = false, fullWidth = false, size = "md", children, className, disabled, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("rounded-xl font-medium border transition-colors flex items-center justify-center gap-2", "disabled:opacity-50 disabled:cursor-not-allowed", variantStyles[variant], sizeStyles[size], fullWidth && "w-full", className),
        disabled: disabled || loading,
        ...props,
        children: [
            loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                size: size === "sm" ? 14 : 18,
                className: "animate-spin"
            }, void 0, false, {
                fileName: "[project]/components/common/Button.tsx",
                lineNumber: 59,
                columnNumber: 9
            }, this) : Icon ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                size: size === "sm" ? 14 : 18,
                strokeWidth: 1.5
            }, void 0, false, {
                fileName: "[project]/components/common/Button.tsx",
                lineNumber: 61,
                columnNumber: 9
            }, this) : null,
            children
        ]
    }, void 0, true, {
        fileName: "[project]/components/common/Button.tsx",
        lineNumber: 46,
        columnNumber: 5
    }, this);
}
_c = Button;
var _c;
__turbopack_context__.k.register(_c, "Button");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/common/Badge.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Badge",
    ()=>Badge,
    "RiskBadge",
    ()=>RiskBadge
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
;
;
const variantStyles = {
    danger: "bg-red-50 text-red-700 border-red-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    info: "bg-blue-50 text-blue-600 border-blue-200",
    neutral: "bg-gray-50 text-gray-600 border-gray-200",
    primary: "bg-primary text-white border-primary"
};
function Badge({ variant = "neutral", icon: Icon, children, className, size = "sm" }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("inline-flex items-center gap-1 rounded-full border font-medium", size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-xs", variantStyles[variant], className),
        children: [
            Icon && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                size: size === "sm" ? 10 : 12
            }, void 0, false, {
                fileName: "[project]/components/common/Badge.tsx",
                lineNumber: 39,
                columnNumber: 16
            }, this),
            children
        ]
    }, void 0, true, {
        fileName: "[project]/components/common/Badge.tsx",
        lineNumber: 31,
        columnNumber: 5
    }, this);
}
_c = Badge;
const riskVariant = {
    high: "danger",
    medium: "warning",
    low: "success"
};
const riskLabel = {
    high: "고위험",
    medium: "중간",
    low: "저위험"
};
function RiskBadge({ level, className }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Badge, {
        variant: riskVariant[level],
        size: "md",
        className: className,
        children: riskLabel[level]
    }, void 0, false, {
        fileName: "[project]/components/common/Badge.tsx",
        lineNumber: 67,
        columnNumber: 5
    }, this);
}
_c1 = RiskBadge;
var _c, _c1;
__turbopack_context__.k.register(_c, "Badge");
__turbopack_context__.k.register(_c1, "RiskBadge");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/common/Alert.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Alert",
    ()=>Alert
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/triangle-alert.js [app-client] (ecmascript) <export default as AlertTriangle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$info$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Info$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/info.js [app-client] (ecmascript) <export default as Info>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__XCircle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-x.js [app-client] (ecmascript) <export default as XCircle>");
;
;
;
const alertStyles = {
    error: {
        bg: "bg-red-50",
        border: "border-red-200",
        text: "text-red-700",
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__XCircle$3e$__["XCircle"]
    },
    warning: {
        bg: "bg-amber-50",
        border: "border-amber-200",
        text: "text-amber-700",
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__["AlertTriangle"]
    },
    info: {
        bg: "bg-blue-50",
        border: "border-blue-200",
        text: "text-blue-700",
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$info$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Info$3e$__["Info"]
    }
};
function Alert({ variant = "info", children, className }) {
    const style = alertStyles[variant];
    const Icon = style.icon;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("rounded-xl border p-4 flex items-start gap-3", style.bg, style.border, className),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                size: 18,
                strokeWidth: 1.5,
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(style.text, "flex-shrink-0 mt-0.5")
            }, void 0, false, {
                fileName: "[project]/components/common/Alert.tsx",
                lineNumber: 46,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-sm", style.text),
                children: children
            }, void 0, false, {
                fileName: "[project]/components/common/Alert.tsx",
                lineNumber: 47,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/common/Alert.tsx",
        lineNumber: 38,
        columnNumber: 5
    }, this);
}
_c = Alert;
var _c;
__turbopack_context__.k.register(_c, "Alert");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/common/EmptyState.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EmptyState",
    ()=>EmptyState
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
;
;
function EmptyState({ icon: Icon, title, description, actions, className }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("rounded-xl border border-border bg-card p-12 text-center shadow-sm", className),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f5f5f7]",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                    className: "h-8 w-8 text-[#1d1d1f]",
                    strokeWidth: 1.5
                }, void 0, false, {
                    fileName: "[project]/components/common/EmptyState.tsx",
                    lineNumber: 34,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/common/EmptyState.tsx",
                lineNumber: 33,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                className: "text-lg font-semibold text-foreground",
                children: title
            }, void 0, false, {
                fileName: "[project]/components/common/EmptyState.tsx",
                lineNumber: 36,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-2 text-sm text-muted max-w-md mx-auto",
                children: description
            }, void 0, false, {
                fileName: "[project]/components/common/EmptyState.tsx",
                lineNumber: 37,
                columnNumber: 7
            }, this),
            actions && actions.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-6 flex flex-wrap justify-center gap-3",
                children: actions.map((action)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                        href: action.href,
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors", action.variant === "secondary" ? "border border-border text-secondary hover:bg-gray-50" : "bg-primary text-white hover:bg-primary-dark"),
                        children: [
                            action.icon && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(action.icon, {
                                size: 16
                            }, void 0, false, {
                                fileName: "[project]/components/common/EmptyState.tsx",
                                lineNumber: 51,
                                columnNumber: 31
                            }, this),
                            action.label
                        ]
                    }, action.href, true, {
                        fileName: "[project]/components/common/EmptyState.tsx",
                        lineNumber: 41,
                        columnNumber: 13
                    }, this))
            }, void 0, false, {
                fileName: "[project]/components/common/EmptyState.tsx",
                lineNumber: 39,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/common/EmptyState.tsx",
        lineNumber: 27,
        columnNumber: 5
    }, this);
}
_c = EmptyState;
var _c;
__turbopack_context__.k.register(_c, "EmptyState");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/common/ai-disclaimer.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>AiDisclaimer
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/triangle-alert.js [app-client] (ecmascript) <export default as AlertTriangle>");
"use client";
;
;
function AiDisclaimer({ className = "", compact = false }) {
    if (compact) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            className: `text-[10px] text-gray-400 flex items-center gap-1 ${className}`,
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__["AlertTriangle"], {
                    size: 10,
                    strokeWidth: 1.5,
                    className: "flex-shrink-0"
                }, void 0, false, {
                    fileName: "[project]/components/common/ai-disclaimer.tsx",
                    lineNumber: 14,
                    columnNumber: 9
                }, this),
                "AI 생성 참고 자료이며, 전문가 자문을 대체하지 않습니다."
            ]
        }, void 0, true, {
            fileName: "[project]/components/common/ai-disclaimer.tsx",
            lineNumber: 13,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: `rounded-lg border border-amber-200 bg-amber-50/50 p-3 ${className}`,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-start gap-2",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__["AlertTriangle"], {
                    size: 14,
                    strokeWidth: 1.5,
                    className: "text-amber-500 flex-shrink-0 mt-0.5"
                }, void 0, false, {
                    fileName: "[project]/components/common/ai-disclaimer.tsx",
                    lineNumber: 23,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "text-xs text-amber-800 leading-relaxed",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "font-medium",
                            children: "AI 분석 면책조항"
                        }, void 0, false, {
                            fileName: "[project]/components/common/ai-disclaimer.tsx",
                            lineNumber: 25,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "mt-1 text-amber-700",
                            children: "본 분석 결과는 AI가 생성한 참고 자료이며, 법률·세무·투자 자문을 대체하지 않습니다. 중요한 의사결정 시 반드시 전문가와 상담하시기 바랍니다."
                        }, void 0, false, {
                            fileName: "[project]/components/common/ai-disclaimer.tsx",
                            lineNumber: 26,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/common/ai-disclaimer.tsx",
                    lineNumber: 24,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/components/common/ai-disclaimer.tsx",
            lineNumber: 22,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/common/ai-disclaimer.tsx",
        lineNumber: 21,
        columnNumber: 5
    }, this);
}
_c = AiDisclaimer;
var _c;
__turbopack_context__.k.register(_c, "AiDisclaimer");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/common/pdf-download-button.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>PdfDownloadButton
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$download$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Download$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/download.js [app-client] (ecmascript) <export default as Download>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-client] (ecmascript) <export default as Loader2>");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
function PdfDownloadButton({ targetRef, filename = "vestra-report.pdf", title = "VESTRA 분석 리포트", className = "" }) {
    _s();
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const handleDownload = async ()=>{
        if (!targetRef.current || loading) return;
        setLoading(true);
        try {
            const { exportToPdf } = await __turbopack_context__.A("[project]/lib/pdf-export.ts [app-client] (ecmascript, async loader)");
            await exportToPdf({
                element: targetRef.current,
                filename,
                title
            });
        } catch (err) {
            console.error("PDF export failed:", err);
        } finally{
            setLoading(false);
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        onClick: handleDownload,
        disabled: loading,
        className: `inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 ${className}`,
        children: [
            loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                size: 16,
                className: "animate-spin"
            }, void 0, false, {
                fileName: "[project]/components/common/pdf-download-button.tsx",
                lineNumber: 41,
                columnNumber: 9
            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$download$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Download$3e$__["Download"], {
                size: 16
            }, void 0, false, {
                fileName: "[project]/components/common/pdf-download-button.tsx",
                lineNumber: 43,
                columnNumber: 9
            }, this),
            loading ? "생성 중..." : "PDF 다운로드"
        ]
    }, void 0, true, {
        fileName: "[project]/components/common/pdf-download-button.tsx",
        lineNumber: 35,
        columnNumber: 5
    }, this);
}
_s(PdfDownloadButton, "/Rjh5rPqCCqf0XYnTUk9ZNavw3Q=");
_c = PdfDownloadButton;
var _c;
__turbopack_context__.k.register(_c, "PdfDownloadButton");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/common/index.ts [app-client] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/common/Card.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$PageHeader$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/common/PageHeader.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$Button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/common/Button.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$Badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/common/Badge.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$Alert$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/common/Alert.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$EmptyState$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/common/EmptyState.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$ai$2d$disclaimer$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/common/ai-disclaimer.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$pdf$2d$download$2d$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/common/pdf-download-button.tsx [app-client] (ecmascript)");
;
;
;
;
;
;
;
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/common/IntegrityBadge.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "IntegrityBadge",
    ()=>IntegrityBadge
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShieldCheck$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/shield-check.js [app-client] (ecmascript) <export default as ShieldCheck>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-down.js [app-client] (ecmascript) <export default as ChevronDown>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$up$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronUp$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-up.js [app-client] (ecmascript) <export default as ChevronUp>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$hash$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Hash$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/hash.js [app-client] (ecmascript) <export default as Hash>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
// 간단한 해시 생성 (클라이언트 사이드 시뮬레이션)
function generateMockHash() {
    const chars = "0123456789abcdef";
    let hash = "";
    const seed = Date.now();
    for(let i = 0; i < 64; i++){
        hash += chars[(seed * (i + 7) + i * 31) % 16];
    }
    return hash;
}
function IntegrityBadge({ steps = 5, compact = false, className }) {
    _s();
    const [expanded, setExpanded] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const merkleRoot = generateMockHash();
    if (compact) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex items-center gap-1.5", className),
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShieldCheck$3e$__["ShieldCheck"], {
                    size: 12,
                    className: "text-emerald-600"
                }, void 0, false, {
                    fileName: "[project]/components/common/IntegrityBadge.tsx",
                    lineNumber: 38,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "text-[10px] text-emerald-700 font-medium",
                    children: "무결성 검증됨"
                }, void 0, false, {
                    fileName: "[project]/components/common/IntegrityBadge.tsx",
                    lineNumber: 39,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/components/common/IntegrityBadge.tsx",
            lineNumber: 37,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("rounded-lg border border-emerald-200 bg-emerald-50/50 overflow-hidden", className),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                onClick: ()=>setExpanded(!expanded),
                className: "w-full flex items-center justify-between px-3 py-2 hover:bg-emerald-50 transition-colors",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShieldCheck$3e$__["ShieldCheck"], {
                                size: 14,
                                className: "text-emerald-600"
                            }, void 0, false, {
                                fileName: "[project]/components/common/IntegrityBadge.tsx",
                                lineNumber: 51,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-xs font-medium text-emerald-800",
                                children: "분석 무결성 검증됨"
                            }, void 0, false, {
                                fileName: "[project]/components/common/IntegrityBadge.tsx",
                                lineNumber: 52,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "px-1.5 py-0.5 text-[9px] bg-emerald-100 text-emerald-700 rounded",
                                children: [
                                    steps,
                                    "단계 해시체인"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/common/IntegrityBadge.tsx",
                                lineNumber: 53,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/common/IntegrityBadge.tsx",
                        lineNumber: 50,
                        columnNumber: 9
                    }, this),
                    expanded ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$up$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronUp$3e$__["ChevronUp"], {
                        size: 12,
                        className: "text-emerald-600"
                    }, void 0, false, {
                        fileName: "[project]/components/common/IntegrityBadge.tsx",
                        lineNumber: 57,
                        columnNumber: 21
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__["ChevronDown"], {
                        size: 12,
                        className: "text-emerald-600"
                    }, void 0, false, {
                        fileName: "[project]/components/common/IntegrityBadge.tsx",
                        lineNumber: 57,
                        columnNumber: 76
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/common/IntegrityBadge.tsx",
                lineNumber: 46,
                columnNumber: 7
            }, this),
            expanded && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "px-3 pb-3 space-y-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "p-2 bg-white rounded border border-emerald-100",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-1.5 mb-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$hash$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Hash$3e$__["Hash"], {
                                        size: 10,
                                        className: "text-emerald-600"
                                    }, void 0, false, {
                                        fileName: "[project]/components/common/IntegrityBadge.tsx",
                                        lineNumber: 64,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-[10px] font-medium text-emerald-700",
                                        children: "Merkle Root"
                                    }, void 0, false, {
                                        fileName: "[project]/components/common/IntegrityBadge.tsx",
                                        lineNumber: 65,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/common/IntegrityBadge.tsx",
                                lineNumber: 63,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "font-mono text-[9px] text-gray-500 break-all leading-relaxed",
                                children: merkleRoot
                            }, void 0, false, {
                                fileName: "[project]/components/common/IntegrityBadge.tsx",
                                lineNumber: 67,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/common/IntegrityBadge.tsx",
                        lineNumber: 62,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid grid-cols-5 gap-1",
                        children: Array.from({
                            length: steps
                        }).map((_, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex flex-col items-center gap-0.5",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "w-full h-1.5 bg-emerald-300 rounded-full"
                                    }, void 0, false, {
                                        fileName: "[project]/components/common/IntegrityBadge.tsx",
                                        lineNumber: 75,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-[8px] text-emerald-600",
                                        children: [
                                            "단계",
                                            i + 1
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/common/IntegrityBadge.tsx",
                                        lineNumber: 76,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, i, true, {
                                fileName: "[project]/components/common/IntegrityBadge.tsx",
                                lineNumber: 74,
                                columnNumber: 15
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/components/common/IntegrityBadge.tsx",
                        lineNumber: 72,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-[10px] text-emerald-600 leading-relaxed",
                        children: "각 분석 단계의 입출력이 SHA-256 해시로 연결되어 있으며, Merkle Tree로 전체 무결성이 검증되었습니다. 이 해시값으로 분석 결과의 변조 여부를 독립적으로 확인할 수 있습니다."
                    }, void 0, false, {
                        fileName: "[project]/components/common/IntegrityBadge.tsx",
                        lineNumber: 81,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/common/IntegrityBadge.tsx",
                lineNumber: 61,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/common/IntegrityBadge.tsx",
        lineNumber: 45,
        columnNumber: 5
    }, this);
}
_s(IntegrityBadge, "DuL5jiiQQFgbn7gBKAyxwS/H4Ek=");
_c = IntegrityBadge;
var _c;
__turbopack_context__.k.register(_c, "IntegrityBadge");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/common/NerHighlight.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "NerHighlight",
    ()=>NerHighlight
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/sparkles.js [app-client] (ecmascript) <export default as Sparkles>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Eye$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/eye.js [app-client] (ecmascript) <export default as Eye>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2d$off$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__EyeOff$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/eye-off.js [app-client] (ecmascript) <export default as EyeOff>");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
const ENTITY_COLORS = {
    PERSON: {
        bg: "bg-blue-100",
        text: "text-blue-800",
        label: "인명"
    },
    ADDRESS: {
        bg: "bg-emerald-100",
        text: "text-emerald-800",
        label: "주소"
    },
    MONEY: {
        bg: "bg-red-100",
        text: "text-red-800",
        label: "금액"
    },
    AREA: {
        bg: "bg-amber-100",
        text: "text-amber-800",
        label: "면적"
    },
    DATE: {
        bg: "bg-purple-100",
        text: "text-purple-800",
        label: "날짜"
    },
    RATE: {
        bg: "bg-cyan-100",
        text: "text-cyan-800",
        label: "비율"
    },
    ORGANIZATION: {
        bg: "bg-indigo-100",
        text: "text-indigo-800",
        label: "기관"
    },
    PROPERTY_TYPE: {
        bg: "bg-teal-100",
        text: "text-teal-800",
        label: "유형"
    },
    RIGHT_TYPE: {
        bg: "bg-rose-100",
        text: "text-rose-800",
        label: "권리"
    },
    LEGAL_REF: {
        bg: "bg-orange-100",
        text: "text-orange-800",
        label: "법률"
    },
    DURATION: {
        bg: "bg-lime-100",
        text: "text-lime-800",
        label: "기간"
    }
};
// 클라이언트 사이드 NER 패턴 (간소화)
const CLIENT_PATTERNS = [
    {
        type: "MONEY",
        regex: /(?:금\s*)?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:원|만원|억원|만\s*원|억\s*원)/g
    },
    {
        type: "MONEY",
        regex: /(?:보증금|전세금|월세|임대료|매매가|감정가|채권최고액)\s*[:：]?\s*(?:금\s*)?(\d{1,3}(?:,\d{3})*)\s*원?/g
    },
    {
        type: "AREA",
        regex: /(\d+(?:\.\d+)?)\s*(?:㎡|m²|평)/g
    },
    {
        type: "DATE",
        regex: /(\d{4})\s*[년./-]\s*(\d{1,2})\s*[월./-]\s*(\d{1,2})\s*일?/g
    },
    {
        type: "RATE",
        regex: /(?:연\s*)?(\d+(?:\.\d+)?)\s*%/g
    },
    {
        type: "RIGHT_TYPE",
        regex: /(?:소유권|근저당권?|전세권|지상권|저당권|임차권|가압류|가처분|압류|경매개시결정|신탁|가등기)/g
    },
    {
        type: "PROPERTY_TYPE",
        regex: /(?:아파트|빌라|오피스텔|단독주택|다세대|다가구|연립|상가|토지)/g
    },
    {
        type: "LEGAL_REF",
        regex: /(?:민법|상법|주택임대차보호법|부동산등기법|건축법)\s*제?\s*\d+조/g
    },
    {
        type: "DURATION",
        regex: /(\d+)\s*(?:년|개월|일)(?:\s*간)?/g
    },
    {
        type: "PERSON",
        regex: /(?:임대인|임차인|매도인|매수인|채권자|채무자|소유자)\s*[:：]?\s*([가-힣]{2,4})/g
    },
    {
        type: "ORGANIZATION",
        regex: /[가-힣]+(?:은행|저축은행|새마을금고|보험|캐피탈|법무법인|법원|등기소)/g
    }
];
function extractEntities(text) {
    const entities = [];
    const usedRanges = [];
    for (const pattern of CLIENT_PATTERNS){
        const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
        let match;
        while((match = regex.exec(text)) !== null){
            const start = match.index;
            const end = start + match[0].length;
            const overlaps = usedRanges.some(([s, e])=>start >= s && start < e || end > s && end <= e);
            if (overlaps) continue;
            entities.push({
                type: pattern.type,
                text: match[0],
                start,
                end
            });
            usedRanges.push([
                start,
                end
            ]);
        }
    }
    return entities.sort((a, b)=>a.start - b.start);
}
function NerHighlight({ text, className }) {
    _s();
    const [enabled, setEnabled] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const entities = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "NerHighlight.useMemo[entities]": ()=>extractEntities(text)
    }["NerHighlight.useMemo[entities]"], [
        text
    ]);
    const segments = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "NerHighlight.useMemo[segments]": ()=>{
            if (!enabled || entities.length === 0) return [
                {
                    text,
                    isEntity: false
                }
            ];
            const result = [];
            let lastEnd = 0;
            for (const entity of entities){
                if (entity.start > lastEnd) {
                    result.push({
                        text: text.slice(lastEnd, entity.start),
                        isEntity: false
                    });
                }
                result.push({
                    text: entity.text,
                    isEntity: true,
                    entity
                });
                lastEnd = entity.end;
            }
            if (lastEnd < text.length) {
                result.push({
                    text: text.slice(lastEnd),
                    isEntity: false
                });
            }
            return result;
        }
    }["NerHighlight.useMemo[segments]"], [
        text,
        entities,
        enabled
    ]);
    const typeCounts = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "NerHighlight.useMemo[typeCounts]": ()=>{
            const counts = {};
            for (const e of entities)counts[e.type] = (counts[e.type] || 0) + 1;
            return counts;
        }
    }["NerHighlight.useMemo[typeCounts]"], [
        entities
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: className,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center justify-between mb-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__["Sparkles"], {
                                size: 14,
                                className: "text-primary"
                            }, void 0, false, {
                                fileName: "[project]/components/common/NerHighlight.tsx",
                                lineNumber: 112,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-xs font-medium text-gray-600",
                                children: "NER 개체명 인식"
                            }, void 0, false, {
                                fileName: "[project]/components/common/NerHighlight.tsx",
                                lineNumber: 113,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-[10px] text-gray-400",
                                children: [
                                    entities.length,
                                    "개 감지"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/common/NerHighlight.tsx",
                                lineNumber: 114,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/common/NerHighlight.tsx",
                        lineNumber: 111,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setEnabled(!enabled),
                        className: "flex items-center gap-1 px-2 py-1 text-[10px] rounded-md border border-gray-200 hover:bg-gray-50 transition-colors",
                        children: [
                            enabled ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Eye$3e$__["Eye"], {
                                size: 10
                            }, void 0, false, {
                                fileName: "[project]/components/common/NerHighlight.tsx",
                                lineNumber: 120,
                                columnNumber: 22
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2d$off$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__EyeOff$3e$__["EyeOff"], {
                                size: 10
                            }, void 0, false, {
                                fileName: "[project]/components/common/NerHighlight.tsx",
                                lineNumber: 120,
                                columnNumber: 42
                            }, this),
                            enabled ? "하이라이트 ON" : "하이라이트 OFF"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/common/NerHighlight.tsx",
                        lineNumber: 116,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/common/NerHighlight.tsx",
                lineNumber: 110,
                columnNumber: 7
            }, this),
            enabled && entities.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-wrap gap-1 mb-2",
                children: Object.entries(typeCounts).map(([type, count])=>{
                    const color = ENTITY_COLORS[type];
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("px-1.5 py-0.5 text-[9px] rounded", color?.bg, color?.text),
                        children: [
                            color?.label,
                            " ",
                            count
                        ]
                    }, type, true, {
                        fileName: "[project]/components/common/NerHighlight.tsx",
                        lineNumber: 131,
                        columnNumber: 15
                    }, this);
                })
            }, void 0, false, {
                fileName: "[project]/components/common/NerHighlight.tsx",
                lineNumber: 127,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "text-xs font-mono leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg p-3 border border-gray-200 max-h-[400px] overflow-y-auto",
                children: segments.map((seg, i)=>{
                    if (!seg.isEntity) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: seg.text
                    }, i, false, {
                        fileName: "[project]/components/common/NerHighlight.tsx",
                        lineNumber: 142,
                        columnNumber: 37
                    }, this);
                    const colors = ENTITY_COLORS[seg.entity.type];
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("px-0.5 rounded cursor-help", colors?.bg, colors?.text),
                        title: `${colors?.label}: ${seg.text}`,
                        children: seg.text
                    }, i, false, {
                        fileName: "[project]/components/common/NerHighlight.tsx",
                        lineNumber: 145,
                        columnNumber: 13
                    }, this);
                })
            }, void 0, false, {
                fileName: "[project]/components/common/NerHighlight.tsx",
                lineNumber: 140,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/common/NerHighlight.tsx",
        lineNumber: 108,
        columnNumber: 5
    }, this);
}
_s(NerHighlight, "t59oMJsUfi2tNWozd37TbBw9pTc=");
_c = NerHighlight;
var _c;
__turbopack_context__.k.register(_c, "NerHighlight");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/results/ScoreGauge.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ScoreGauge",
    ()=>ScoreGauge
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
;
;
const sizeConfig = {
    sm: {
        svgSize: 132,
        radius: 54,
        stroke: 8,
        fontSize: "text-2xl",
        gradeSize: "text-xs"
    },
    md: {
        svgSize: 136,
        radius: 54,
        stroke: 8,
        fontSize: "text-2xl",
        gradeSize: "text-xs"
    },
    lg: {
        svgSize: 180,
        radius: 70,
        stroke: 10,
        fontSize: "text-3xl",
        gradeSize: "text-sm"
    }
};
function getColor(score) {
    if (score >= 80) return "#10b981";
    if (score >= 60) return "#3b82f6";
    if (score >= 40) return "#f59e0b";
    return "#ef4444";
}
function getGrade(score) {
    if (score >= 90) return "A+";
    if (score >= 80) return "A";
    if (score >= 70) return "B+";
    if (score >= 60) return "B";
    if (score >= 50) return "C+";
    if (score >= 40) return "C";
    return "D";
}
function ScoreGauge({ score, size = "md", label = "안전 점수", grade, showLabel = true }) {
    const config = sizeConfig[size];
    const circumference = 2 * Math.PI * config.radius;
    const progress = score / 100 * circumference;
    const color = getColor(score);
    const displayGrade = grade || getGrade(score);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex flex-col items-center",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                width: config.svgSize,
                height: config.svgSize,
                viewBox: `0 0 ${config.svgSize} ${config.svgSize}`,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                        cx: config.svgSize / 2,
                        cy: config.svgSize / 2,
                        r: config.radius,
                        fill: "none",
                        stroke: "#f1f5f9",
                        strokeWidth: config.stroke
                    }, void 0, false, {
                        fileName: "[project]/components/results/ScoreGauge.tsx",
                        lineNumber: 55,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                        cx: config.svgSize / 2,
                        cy: config.svgSize / 2,
                        r: config.radius,
                        fill: "none",
                        stroke: color,
                        strokeWidth: config.stroke,
                        strokeLinecap: "round",
                        strokeDasharray: circumference,
                        strokeDashoffset: circumference - progress,
                        transform: `rotate(-90 ${config.svgSize / 2} ${config.svgSize / 2})`,
                        className: "transition-all duration-1000 ease-out"
                    }, void 0, false, {
                        fileName: "[project]/components/results/ScoreGauge.tsx",
                        lineNumber: 64,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("text", {
                        x: config.svgSize / 2,
                        y: config.svgSize / 2 - 8,
                        textAnchor: "middle",
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(config.fontSize, "font-bold"),
                        fill: color,
                        fontSize: size === "lg" ? 36 : 28,
                        fontWeight: "bold",
                        children: score
                    }, void 0, false, {
                        fileName: "[project]/components/results/ScoreGauge.tsx",
                        lineNumber: 78,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("text", {
                        x: config.svgSize / 2,
                        y: config.svgSize / 2 + 16,
                        textAnchor: "middle",
                        fill: "#64748b",
                        fontSize: size === "lg" ? 14 : 12,
                        children: displayGrade
                    }, void 0, false, {
                        fileName: "[project]/components/results/ScoreGauge.tsx",
                        lineNumber: 90,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/results/ScoreGauge.tsx",
                lineNumber: 49,
                columnNumber: 7
            }, this),
            showLabel && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-xs text-muted mt-1",
                children: label
            }, void 0, false, {
                fileName: "[project]/components/results/ScoreGauge.tsx",
                lineNumber: 101,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/results/ScoreGauge.tsx",
        lineNumber: 48,
        columnNumber: 5
    }, this);
}
_c = ScoreGauge;
var _c;
__turbopack_context__.k.register(_c, "ScoreGauge");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/results/KpiCard.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "KpiCard",
    ()=>KpiCard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
;
;
function KpiCard({ label, value, description, icon: Icon, iconBg = "bg-[#f5f5f7]", iconColor = "text-[#1d1d1f]" }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "rounded-2xl bg-[#f5f5f7] p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)]",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-start justify-between",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-sm font-medium text-[#86868b]",
                            children: label
                        }, void 0, false, {
                            fileName: "[project]/components/results/KpiCard.tsx",
                            lineNumber: 25,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "mt-2 text-2xl font-bold text-[#1d1d1f]",
                            children: value
                        }, void 0, false, {
                            fileName: "[project]/components/results/KpiCard.tsx",
                            lineNumber: 26,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "mt-1 text-xs text-[#86868b]",
                            children: description
                        }, void 0, false, {
                            fileName: "[project]/components/results/KpiCard.tsx",
                            lineNumber: 27,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/results/KpiCard.tsx",
                    lineNumber: 24,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex h-11 w-11 items-center justify-center rounded-xl", iconBg),
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("h-5 w-5", iconColor),
                        strokeWidth: 1.5
                    }, void 0, false, {
                        fileName: "[project]/components/results/KpiCard.tsx",
                        lineNumber: 30,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/components/results/KpiCard.tsx",
                    lineNumber: 29,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/components/results/KpiCard.tsx",
            lineNumber: 23,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/results/KpiCard.tsx",
        lineNumber: 22,
        columnNumber: 5
    }, this);
}
_c = KpiCard;
var _c;
__turbopack_context__.k.register(_c, "KpiCard");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/results/InfoRow.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "InfoRow",
    ()=>InfoRow
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
;
;
function InfoRow({ label, value, className, valueClassName }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex justify-between text-sm py-2", className),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "text-secondary",
                children: label
            }, void 0, false, {
                fileName: "[project]/components/results/InfoRow.tsx",
                lineNumber: 13,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("font-semibold", valueClassName),
                children: value
            }, void 0, false, {
                fileName: "[project]/components/results/InfoRow.tsx",
                lineNumber: 14,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/results/InfoRow.tsx",
        lineNumber: 12,
        columnNumber: 5
    }, this);
}
_c = InfoRow;
var _c;
__turbopack_context__.k.register(_c, "InfoRow");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/results/ScholarPapers.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ScholarPapers",
    ()=>ScholarPapers
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/components/common/index.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/common/Card.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$Badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/common/Badge.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$book$2d$open$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__BookOpen$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/book-open.js [app-client] (ecmascript) <export default as BookOpen>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-down.js [app-client] (ecmascript) <export default as ChevronDown>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$up$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronUp$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-up.js [app-client] (ecmascript) <export default as ChevronUp>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$external$2d$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ExternalLink$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/external-link.js [app-client] (ecmascript) <export default as ExternalLink>");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
function ScholarPapers({ keywords }) {
    _s();
    const [papers, setPapers] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [sources, setSources] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [expandedIdx, setExpandedIdx] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ScholarPapers.useEffect": ()=>{
            if (!keywords.length) return;
            let cancelled = false;
            setLoading(true);
            fetch("/api/scholar/search", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    keywords
                })
            }).then({
                "ScholarPapers.useEffect": (res)=>res.json()
            }["ScholarPapers.useEffect"]).then({
                "ScholarPapers.useEffect": (data)=>{
                    if (cancelled) return;
                    setPapers(data.papers || []);
                    setSources(data.sources || []);
                }
            }["ScholarPapers.useEffect"]).catch({
                "ScholarPapers.useEffect": ()=>{
                    if (!cancelled) setPapers([]);
                }
            }["ScholarPapers.useEffect"]).finally({
                "ScholarPapers.useEffect": ()=>{
                    if (!cancelled) setLoading(false);
                }
            }["ScholarPapers.useEffect"]);
            return ({
                "ScholarPapers.useEffect": ()=>{
                    cancelled = true;
                }
            })["ScholarPapers.useEffect"];
        }
    }["ScholarPapers.useEffect"], [
        keywords
    ]);
    // 로딩 중이면 스켈레톤
    if (loading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
            className: "p-6",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center gap-2 mb-4",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$book$2d$open$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__BookOpen$3e$__["BookOpen"], {
                            className: "w-5 h-5 text-primary",
                            strokeWidth: 1.5
                        }, void 0, false, {
                            fileName: "[project]/components/results/ScholarPapers.tsx",
                            lineNumber: 52,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                            className: "text-base font-semibold text-gray-800",
                            children: "관련 학술논문"
                        }, void 0, false, {
                            fileName: "[project]/components/results/ScholarPapers.tsx",
                            lineNumber: 53,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/results/ScholarPapers.tsx",
                    lineNumber: 51,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "space-y-3",
                    children: [
                        1,
                        2,
                        3
                    ].map((i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "animate-pulse",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "h-4 bg-gray-200 rounded w-3/4 mb-2"
                                }, void 0, false, {
                                    fileName: "[project]/components/results/ScholarPapers.tsx",
                                    lineNumber: 58,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "h-3 bg-gray-100 rounded w-1/2"
                                }, void 0, false, {
                                    fileName: "[project]/components/results/ScholarPapers.tsx",
                                    lineNumber: 59,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, i, true, {
                            fileName: "[project]/components/results/ScholarPapers.tsx",
                            lineNumber: 57,
                            columnNumber: 13
                        }, this))
                }, void 0, false, {
                    fileName: "[project]/components/results/ScholarPapers.tsx",
                    lineNumber: 55,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/components/results/ScholarPapers.tsx",
            lineNumber: 50,
            columnNumber: 7
        }, this);
    }
    // 결과 없으면 미표시
    if (!papers.length) return null;
    const sourceLabel = (s)=>{
        switch(s){
            case "semantic_scholar":
                return "Semantic Scholar";
            case "riss":
                return "RISS";
            case "kci":
                return "KCI";
        }
    };
    const sourceBadgeColor = (s)=>{
        switch(s){
            case "semantic_scholar":
                return "bg-[#f5f5f7] text-[#1d1d1f]";
            case "riss":
                return "bg-[#f5f5f7] text-[#1d1d1f]";
            case "kci":
                return "bg-[#f5f5f7] text-[#1d1d1f]";
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
        className: "p-6",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center justify-between mb-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$book$2d$open$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__BookOpen$3e$__["BookOpen"], {
                                className: "w-5 h-5 text-primary",
                                strokeWidth: 1.5
                            }, void 0, false, {
                                fileName: "[project]/components/results/ScholarPapers.tsx",
                                lineNumber: 96,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                className: "text-base font-semibold text-gray-800",
                                children: "관련 학술논문"
                            }, void 0, false, {
                                fileName: "[project]/components/results/ScholarPapers.tsx",
                                lineNumber: 97,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$Badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Badge"], {
                                variant: "neutral",
                                children: [
                                    papers.length,
                                    "건"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/results/ScholarPapers.tsx",
                                lineNumber: 98,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/results/ScholarPapers.tsx",
                        lineNumber: 95,
                        columnNumber: 9
                    }, this),
                    sources.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-xs text-gray-400",
                        children: [
                            "출처: ",
                            sources.join(", ")
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/results/ScholarPapers.tsx",
                        lineNumber: 101,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/results/ScholarPapers.tsx",
                lineNumber: 94,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-3",
                children: papers.map((paper, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "border border-gray-100 rounded-lg p-4 hover:bg-gray-50/50 transition-colors",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-start justify-between gap-2",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex-1 min-w-0",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-2 mb-1",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: `inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded ${sourceBadgeColor(paper.source)}`,
                                                    children: sourceLabel(paper.source)
                                                }, void 0, false, {
                                                    fileName: "[project]/components/results/ScholarPapers.tsx",
                                                    lineNumber: 116,
                                                    columnNumber: 19
                                                }, this),
                                                paper.year && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-xs text-gray-400",
                                                    children: paper.year
                                                }, void 0, false, {
                                                    fileName: "[project]/components/results/ScholarPapers.tsx",
                                                    lineNumber: 120,
                                                    columnNumber: 21
                                                }, this),
                                                paper.citationCount != null && paper.citationCount > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-xs text-gray-400",
                                                    children: [
                                                        "인용 ",
                                                        paper.citationCount.toLocaleString(),
                                                        "회"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/results/ScholarPapers.tsx",
                                                    lineNumber: 123,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/results/ScholarPapers.tsx",
                                            lineNumber: 115,
                                            columnNumber: 17
                                        }, this),
                                        paper.url ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                            href: paper.url,
                                            target: "_blank",
                                            rel: "noopener noreferrer",
                                            className: "text-sm font-medium text-gray-800 hover:text-primary hover:underline inline-flex items-center gap-1",
                                            children: [
                                                paper.title,
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$external$2d$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ExternalLink$3e$__["ExternalLink"], {
                                                    className: "w-3 h-3 flex-shrink-0",
                                                    strokeWidth: 1.5
                                                }, void 0, false, {
                                                    fileName: "[project]/components/results/ScholarPapers.tsx",
                                                    lineNumber: 137,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/results/ScholarPapers.tsx",
                                            lineNumber: 130,
                                            columnNumber: 19
                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-sm font-medium text-gray-800",
                                            children: paper.title
                                        }, void 0, false, {
                                            fileName: "[project]/components/results/ScholarPapers.tsx",
                                            lineNumber: 140,
                                            columnNumber: 19
                                        }, this),
                                        paper.authors.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-xs text-gray-500 mt-1",
                                            children: [
                                                paper.authors.slice(0, 3).join(", "),
                                                paper.authors.length > 3 && ` 외 ${paper.authors.length - 3}명`
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/results/ScholarPapers.tsx",
                                            lineNumber: 144,
                                            columnNumber: 19
                                        }, this),
                                        paper.journal && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-xs text-gray-400 mt-0.5 italic",
                                            children: paper.journal
                                        }, void 0, false, {
                                            fileName: "[project]/components/results/ScholarPapers.tsx",
                                            lineNumber: 151,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/results/ScholarPapers.tsx",
                                    lineNumber: 114,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/components/results/ScholarPapers.tsx",
                                lineNumber: 113,
                                columnNumber: 13
                            }, this),
                            paper.abstract && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mt-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>setExpandedIdx(expandedIdx === idx ? null : idx),
                                        className: "text-xs text-primary hover:underline flex items-center gap-1",
                                        children: expandedIdx === idx ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                            children: [
                                                "초록 접기 ",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$up$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronUp$3e$__["ChevronUp"], {
                                                    className: "w-3 h-3",
                                                    strokeWidth: 1.5
                                                }, void 0, false, {
                                                    fileName: "[project]/components/results/ScholarPapers.tsx",
                                                    lineNumber: 164,
                                                    columnNumber: 29
                                                }, this)
                                            ]
                                        }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                            children: [
                                                "초록 보기 ",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__["ChevronDown"], {
                                                    className: "w-3 h-3",
                                                    strokeWidth: 1.5
                                                }, void 0, false, {
                                                    fileName: "[project]/components/results/ScholarPapers.tsx",
                                                    lineNumber: 166,
                                                    columnNumber: 29
                                                }, this)
                                            ]
                                        }, void 0, true)
                                    }, void 0, false, {
                                        fileName: "[project]/components/results/ScholarPapers.tsx",
                                        lineNumber: 159,
                                        columnNumber: 17
                                    }, this),
                                    expandedIdx === idx && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-xs text-gray-600 mt-2 leading-relaxed bg-gray-50 p-3 rounded",
                                        children: paper.abstract.length > 500 ? paper.abstract.slice(0, 500) + "..." : paper.abstract
                                    }, void 0, false, {
                                        fileName: "[project]/components/results/ScholarPapers.tsx",
                                        lineNumber: 170,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/results/ScholarPapers.tsx",
                                lineNumber: 158,
                                columnNumber: 15
                            }, this)
                        ]
                    }, `${paper.source}-${idx}`, true, {
                        fileName: "[project]/components/results/ScholarPapers.tsx",
                        lineNumber: 109,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/components/results/ScholarPapers.tsx",
                lineNumber: 107,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-[11px] text-gray-400 mt-4 border-t border-gray-100 pt-3",
                children: "위 논문은 자동 검색된 결과이며, 분석 내용과 직접적 관련이 없을 수 있습니다. 학술 자료의 정확성은 원문을 직접 확인하시기 바랍니다."
            }, void 0, false, {
                fileName: "[project]/components/results/ScholarPapers.tsx",
                lineNumber: 182,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/results/ScholarPapers.tsx",
        lineNumber: 93,
        columnNumber: 5
    }, this);
}
_s(ScholarPapers, "+ce8+jTxeNhBkqkQATlkvTuGmnQ=");
_c = ScholarPapers;
var _c;
__turbopack_context__.k.register(_c, "ScholarPapers");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/results/index.ts [app-client] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$results$2f$ScoreGauge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/results/ScoreGauge.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$results$2f$KpiCard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/results/KpiCard.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$results$2f$InfoRow$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/results/InfoRow.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$results$2f$ScholarPapers$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/results/ScholarPapers.tsx [app-client] (ecmascript)");
;
;
;
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/forms/FormInput.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "FormInput",
    ()=>FormInput,
    "TextAreaInput",
    ()=>TextAreaInput
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
;
;
function FormInput({ label, className, wrapperClassName, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: wrapperClassName,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                className: "block text-sm font-medium mb-1.5",
                children: label
            }, void 0, false, {
                fileName: "[project]/components/forms/FormInput.tsx",
                lineNumber: 17,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-full px-3 py-2 rounded-lg border border-border text-sm", "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary", className),
                ...props
            }, void 0, false, {
                fileName: "[project]/components/forms/FormInput.tsx",
                lineNumber: 18,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/forms/FormInput.tsx",
        lineNumber: 16,
        columnNumber: 5
    }, this);
}
_c = FormInput;
function TextAreaInput({ label, className, wrapperClassName, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: wrapperClassName,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                className: "block text-sm font-medium mb-1.5",
                children: label
            }, void 0, false, {
                fileName: "[project]/components/forms/FormInput.tsx",
                lineNumber: 44,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-full px-3 py-2 rounded-lg border border-border text-sm", "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary", "resize-none", className),
                ...props
            }, void 0, false, {
                fileName: "[project]/components/forms/FormInput.tsx",
                lineNumber: 45,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/forms/FormInput.tsx",
        lineNumber: 43,
        columnNumber: 5
    }, this);
}
_c1 = TextAreaInput;
var _c, _c1;
__turbopack_context__.k.register(_c, "FormInput");
__turbopack_context__.k.register(_c1, "TextAreaInput");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/forms/SliderInput.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SliderInput",
    ()=>SliderInput
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
;
;
function SliderInput({ label, value, onChange, min, max, step, formatValue = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatKRW"] }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                className: "block text-sm font-medium mb-1.5",
                children: label
            }, void 0, false, {
                fileName: "[project]/components/forms/SliderInput.tsx",
                lineNumber: 24,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                type: "range",
                min: min,
                max: max,
                step: step,
                value: value,
                onChange: (e)=>onChange(Number(e.target.value)),
                className: "w-full accent-primary"
            }, void 0, false, {
                fileName: "[project]/components/forms/SliderInput.tsx",
                lineNumber: 25,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "text-right text-sm font-semibold text-primary mt-1",
                children: formatValue(value)
            }, void 0, false, {
                fileName: "[project]/components/forms/SliderInput.tsx",
                lineNumber: 34,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/forms/SliderInput.tsx",
        lineNumber: 23,
        columnNumber: 5
    }, this);
}
_c = SliderInput;
var _c;
__turbopack_context__.k.register(_c, "SliderInput");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/forms/TabButtons.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TabButtons",
    ()=>TabButtons
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
;
;
function TabButtons({ options, value, onChange, className }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("grid gap-2", className),
        style: {
            gridTemplateColumns: `repeat(${options.length}, 1fr)`
        },
        children: options.map((option)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                onClick: ()=>onChange(option.value),
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("py-2 rounded-lg text-xs font-medium border transition-all", value === option.value ? "bg-primary text-white border-primary" : "bg-white text-secondary border-border hover:bg-gray-50"),
                children: option.label
            }, option.value, false, {
                fileName: "[project]/components/forms/TabButtons.tsx",
                lineNumber: 24,
                columnNumber: 9
            }, this))
    }, void 0, false, {
        fileName: "[project]/components/forms/TabButtons.tsx",
        lineNumber: 22,
        columnNumber: 5
    }, this);
}
_c = TabButtons;
var _c;
__turbopack_context__.k.register(_c, "TabButtons");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/forms/index.ts [app-client] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$forms$2f$FormInput$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/forms/FormInput.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$forms$2f$SliderInput$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/forms/SliderInput.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$forms$2f$TabButtons$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/forms/TabButtons.tsx [app-client] (ecmascript)");
;
;
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/rights/RightsGraphView.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "RightsGraphView",
    ()=>RightsGraphView
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/triangle-alert.js [app-client] (ecmascript) <export default as AlertTriangle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2d$big$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-check-big.js [app-client] (ecmascript) <export default as CheckCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__XCircle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-x.js [app-client] (ecmascript) <export default as XCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$git$2d$branch$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__GitBranch$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/git-branch.js [app-client] (ecmascript) <export default as GitBranch>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/shield.js [app-client] (ecmascript) <export default as Shield>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/components/common/index.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/common/Card.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
// 노드 색상
const NODE_COLORS = {
    property: {
        bg: "bg-blue-100",
        border: "border-blue-400",
        text: "text-blue-800"
    },
    ownership: {
        bg: "bg-emerald-100",
        border: "border-emerald-400",
        text: "text-emerald-800"
    },
    mortgage: {
        bg: "bg-red-100",
        border: "border-red-400",
        text: "text-red-800"
    },
    lease: {
        bg: "bg-amber-100",
        border: "border-amber-400",
        text: "text-amber-800"
    },
    seizure: {
        bg: "bg-purple-100",
        border: "border-purple-400",
        text: "text-purple-800"
    },
    trust: {
        bg: "bg-indigo-100",
        border: "border-indigo-400",
        text: "text-indigo-800"
    },
    other: {
        bg: "bg-gray-100",
        border: "border-gray-400",
        text: "text-gray-800"
    }
};
function getNodeType(purpose) {
    if (/소유권/.test(purpose)) return "ownership";
    if (/근저당|저당/.test(purpose)) return "mortgage";
    if (/전세|임차/.test(purpose)) return "lease";
    if (/가압류|압류|가처분|경매/.test(purpose)) return "seizure";
    if (/신탁/.test(purpose)) return "trust";
    return "other";
}
function getRiskWeight(type) {
    const weights = {
        seizure: 0.95,
        mortgage: 0.7,
        trust: 0.6,
        lease: 0.4,
        ownership: 0.1,
        property: 0,
        other: 0.3
    };
    return weights[type] ?? 0.3;
}
function RightsGraphView({ parsed }) {
    _s();
    const { nodes, edges, chains } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "RightsGraphView.useMemo": ()=>{
            const nodes = [];
            const edges = [];
            // 부동산 루트 노드
            const propertyLabel = parsed.title?.address || "대상 부동산";
            nodes.push({
                id: "property",
                label: propertyLabel.length > 20 ? propertyLabel.slice(0, 20) + "…" : propertyLabel,
                type: "property",
                amount: 0,
                riskWeight: 0
            });
            // 갑구 노드
            parsed.gapgu?.forEach({
                "RightsGraphView.useMemo": (entry, i)=>{
                    const type = getNodeType(entry.purpose);
                    nodes.push({
                        id: `gapgu_${i}`,
                        label: `${entry.purpose}\n${entry.holder}`,
                        type,
                        amount: 0,
                        riskWeight: getRiskWeight(type),
                        isCancelled: entry.isCancelled
                    });
                    edges.push({
                        source: "property",
                        target: `gapgu_${i}`,
                        label: "갑구",
                        weight: getRiskWeight(type)
                    });
                }
            }["RightsGraphView.useMemo"]);
            // 을구 노드
            parsed.eulgu?.forEach({
                "RightsGraphView.useMemo": (entry, i)=>{
                    const type = getNodeType(entry.purpose);
                    nodes.push({
                        id: `eulgu_${i}`,
                        label: `${entry.purpose}\n${entry.holder}`,
                        type,
                        amount: entry.amount || 0,
                        riskWeight: getRiskWeight(type),
                        isCancelled: entry.isCancelled
                    });
                    edges.push({
                        source: "property",
                        target: `eulgu_${i}`,
                        label: "을구",
                        weight: getRiskWeight(type)
                    });
                }
            }["RightsGraphView.useMemo"]);
            // 위험 체인 분석 (간단한 휴리스틱)
            const chains = [];
            const activeNodes = nodes.filter({
                "RightsGraphView.useMemo.activeNodes": (n)=>!n.isCancelled && n.id !== "property"
            }["RightsGraphView.useMemo.activeNodes"]);
            const highRiskNodes = activeNodes.filter({
                "RightsGraphView.useMemo.highRiskNodes": (n)=>n.riskWeight >= 0.7
            }["RightsGraphView.useMemo.highRiskNodes"]);
            if (highRiskNodes.length >= 2) {
                chains.push({
                    path: [
                        "property",
                        ...highRiskNodes.map({
                            "RightsGraphView.useMemo": (n)=>n.id
                        }["RightsGraphView.useMemo"])
                    ],
                    totalRisk: highRiskNodes.reduce({
                        "RightsGraphView.useMemo": (s, n)=>s + n.riskWeight
                    }["RightsGraphView.useMemo"], 0) / highRiskNodes.length,
                    level: "critical"
                });
            } else if (highRiskNodes.length === 1) {
                chains.push({
                    path: [
                        "property",
                        highRiskNodes[0].id
                    ],
                    totalRisk: highRiskNodes[0].riskWeight,
                    level: "high"
                });
            }
            return {
                nodes,
                edges,
                chains
            };
        }
    }["RightsGraphView.useMemo"], [
        parsed
    ]);
    const activeNodes = nodes.filter((n)=>!n.isCancelled);
    const cancelledNodes = nodes.filter((n)=>n.isCancelled);
    const riskScore = activeNodes.reduce((s, n)=>s + n.riskWeight, 0) / Math.max(activeNodes.length, 1);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid grid-cols-2 md:grid-cols-4 gap-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "p-3 bg-blue-50 rounded-lg text-center",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xs text-blue-600",
                                children: "전체 노드"
                            }, void 0, false, {
                                fileName: "[project]/components/rights/RightsGraphView.tsx",
                                lineNumber: 152,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xl font-bold text-blue-800",
                                children: nodes.length
                            }, void 0, false, {
                                fileName: "[project]/components/rights/RightsGraphView.tsx",
                                lineNumber: 153,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/rights/RightsGraphView.tsx",
                        lineNumber: 151,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "p-3 bg-emerald-50 rounded-lg text-center",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xs text-emerald-600",
                                children: "유효 권리"
                            }, void 0, false, {
                                fileName: "[project]/components/rights/RightsGraphView.tsx",
                                lineNumber: 156,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xl font-bold text-emerald-800",
                                children: activeNodes.length - 1
                            }, void 0, false, {
                                fileName: "[project]/components/rights/RightsGraphView.tsx",
                                lineNumber: 157,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/rights/RightsGraphView.tsx",
                        lineNumber: 155,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "p-3 bg-gray-50 rounded-lg text-center",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xs text-gray-600",
                                children: "말소"
                            }, void 0, false, {
                                fileName: "[project]/components/rights/RightsGraphView.tsx",
                                lineNumber: 160,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xl font-bold text-gray-800",
                                children: cancelledNodes.length
                            }, void 0, false, {
                                fileName: "[project]/components/rights/RightsGraphView.tsx",
                                lineNumber: 161,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/rights/RightsGraphView.tsx",
                        lineNumber: 159,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "p-3 rounded-lg text-center",
                        style: {
                            backgroundColor: riskScore > 0.5 ? "#fef2f2" : riskScore > 0.3 ? "#fffbeb" : "#f0fdf4"
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xs",
                                style: {
                                    color: riskScore > 0.5 ? "#dc2626" : riskScore > 0.3 ? "#d97706" : "#16a34a"
                                },
                                children: "위험도"
                            }, void 0, false, {
                                fileName: "[project]/components/rights/RightsGraphView.tsx",
                                lineNumber: 164,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xl font-bold",
                                style: {
                                    color: riskScore > 0.5 ? "#dc2626" : riskScore > 0.3 ? "#d97706" : "#16a34a"
                                },
                                children: [
                                    (riskScore * 100).toFixed(0),
                                    "%"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/rights/RightsGraphView.tsx",
                                lineNumber: 165,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/rights/RightsGraphView.tsx",
                        lineNumber: 163,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/rights/RightsGraphView.tsx",
                lineNumber: 150,
                columnNumber: 7
            }, this),
            chains.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
                className: "p-4 border-red-200 bg-red-50/50",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                        className: "text-sm font-semibold text-red-800 flex items-center gap-2 mb-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__["AlertTriangle"], {
                                size: 14
                            }, void 0, false, {
                                fileName: "[project]/components/rights/RightsGraphView.tsx",
                                lineNumber: 173,
                                columnNumber: 13
                            }, this),
                            "위험 전파 경로 감지"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/rights/RightsGraphView.tsx",
                        lineNumber: 172,
                        columnNumber: 11
                    }, this),
                    chains.map((chain, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center gap-1.5 text-xs text-red-700 flex-wrap",
                            children: [
                                chain.path.map((nodeId, j)=>{
                                    const node = nodes.find((n)=>n.id === nodeId);
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "flex items-center gap-1",
                                        children: [
                                            j > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-red-400",
                                                children: "→"
                                            }, void 0, false, {
                                                fileName: "[project]/components/rights/RightsGraphView.tsx",
                                                lineNumber: 182,
                                                columnNumber: 31
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "px-2 py-0.5 bg-red-100 rounded font-medium",
                                                children: node?.label.split("\n")[0] || nodeId
                                            }, void 0, false, {
                                                fileName: "[project]/components/rights/RightsGraphView.tsx",
                                                lineNumber: 183,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, nodeId, true, {
                                        fileName: "[project]/components/rights/RightsGraphView.tsx",
                                        lineNumber: 181,
                                        columnNumber: 19
                                    }, this);
                                }),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "ml-2 px-2 py-0.5 bg-red-200 rounded-full text-[10px] font-semibold",
                                    children: [
                                        "위험도 ",
                                        (chain.totalRisk * 100).toFixed(0),
                                        "%"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/rights/RightsGraphView.tsx",
                                    lineNumber: 189,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, i, true, {
                            fileName: "[project]/components/rights/RightsGraphView.tsx",
                            lineNumber: 177,
                            columnNumber: 13
                        }, this))
                ]
            }, void 0, true, {
                fileName: "[project]/components/rights/RightsGraphView.tsx",
                lineNumber: 171,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
                className: "p-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                        className: "text-sm font-semibold text-gray-800 flex items-center gap-2 mb-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$git$2d$branch$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__GitBranch$3e$__["GitBranch"], {
                                size: 14
                            }, void 0, false, {
                                fileName: "[project]/components/rights/RightsGraphView.tsx",
                                lineNumber: 200,
                                columnNumber: 11
                            }, this),
                            "권리관계 그래프"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/rights/RightsGraphView.tsx",
                        lineNumber: 199,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex justify-center mb-4",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "px-4 py-2 bg-blue-100 border-2 border-blue-400 rounded-lg text-center",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-xs font-bold text-blue-800",
                                    children: nodes[0]?.label
                                }, void 0, false, {
                                    fileName: "[project]/components/rights/RightsGraphView.tsx",
                                    lineNumber: 207,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-[10px] text-blue-600",
                                    children: "대상 부동산"
                                }, void 0, false, {
                                    fileName: "[project]/components/rights/RightsGraphView.tsx",
                                    lineNumber: 208,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/rights/RightsGraphView.tsx",
                            lineNumber: 206,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/rights/RightsGraphView.tsx",
                        lineNumber: 205,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex justify-center mb-2",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "w-0.5 h-6 bg-gray-300"
                        }, void 0, false, {
                            fileName: "[project]/components/rights/RightsGraphView.tsx",
                            lineNumber: 214,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/rights/RightsGraphView.tsx",
                        lineNumber: 213,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2",
                        children: nodes.slice(1).map((node)=>{
                            const colors = NODE_COLORS[node.type] || NODE_COLORS.other;
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("p-3 rounded-lg border-2 transition-all", node.isCancelled ? "opacity-40 border-gray-300 bg-gray-50" : `${colors.bg} ${colors.border}`),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center justify-between mb-1",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-xs font-semibold", node.isCancelled ? "text-gray-500 line-through" : colors.text),
                                                children: node.label.split("\n")[0]
                                            }, void 0, false, {
                                                fileName: "[project]/components/rights/RightsGraphView.tsx",
                                                lineNumber: 230,
                                                columnNumber: 19
                                            }, this),
                                            node.isCancelled ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-[9px] px-1.5 py-0.5 bg-gray-200 text-gray-500 rounded",
                                                children: "말소"
                                            }, void 0, false, {
                                                fileName: "[project]/components/rights/RightsGraphView.tsx",
                                                lineNumber: 234,
                                                columnNumber: 21
                                            }, this) : node.riskWeight >= 0.7 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__XCircle$3e$__["XCircle"], {
                                                size: 12,
                                                className: "text-red-500"
                                            }, void 0, false, {
                                                fileName: "[project]/components/rights/RightsGraphView.tsx",
                                                lineNumber: 236,
                                                columnNumber: 21
                                            }, this) : node.riskWeight >= 0.4 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__["AlertTriangle"], {
                                                size: 12,
                                                className: "text-amber-500"
                                            }, void 0, false, {
                                                fileName: "[project]/components/rights/RightsGraphView.tsx",
                                                lineNumber: 238,
                                                columnNumber: 21
                                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2d$big$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle$3e$__["CheckCircle"], {
                                                size: 12,
                                                className: "text-emerald-500"
                                            }, void 0, false, {
                                                fileName: "[project]/components/rights/RightsGraphView.tsx",
                                                lineNumber: 240,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/rights/RightsGraphView.tsx",
                                        lineNumber: 229,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[10px] text-gray-600",
                                        children: node.label.split("\n")[1] || ""
                                    }, void 0, false, {
                                        fileName: "[project]/components/rights/RightsGraphView.tsx",
                                        lineNumber: 243,
                                        columnNumber: 17
                                    }, this),
                                    node.amount > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[10px] font-medium text-gray-700 mt-1",
                                        children: [
                                            (node.amount / 100000000).toFixed(1),
                                            "억원"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/rights/RightsGraphView.tsx",
                                        lineNumber: 245,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, node.id, true, {
                                fileName: "[project]/components/rights/RightsGraphView.tsx",
                                lineNumber: 222,
                                columnNumber: 15
                            }, this);
                        })
                    }, void 0, false, {
                        fileName: "[project]/components/rights/RightsGraphView.tsx",
                        lineNumber: 218,
                        columnNumber: 9
                    }, this),
                    nodes.length <= 1 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center justify-center py-8 text-sm text-gray-400",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__["Shield"], {
                                size: 16,
                                className: "mr-2"
                            }, void 0, false, {
                                fileName: "[project]/components/rights/RightsGraphView.tsx",
                                lineNumber: 256,
                                columnNumber: 13
                            }, this),
                            "등기부 데이터에서 권리관계를 추출할 수 없습니다"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/rights/RightsGraphView.tsx",
                        lineNumber: 255,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/rights/RightsGraphView.tsx",
                lineNumber: 198,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-wrap gap-2 px-1",
                children: Object.entries(NODE_COLORS).map(([type, colors])=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-1",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-3 h-3 rounded border", colors.bg, colors.border)
                            }, void 0, false, {
                                fileName: "[project]/components/rights/RightsGraphView.tsx",
                                lineNumber: 266,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-[10px] text-gray-500",
                                children: {
                                    property: "부동산",
                                    ownership: "소유권",
                                    mortgage: "근저당",
                                    lease: "전세/임차",
                                    seizure: "압류/가처분",
                                    trust: "신탁",
                                    other: "기타"
                                }[type]
                            }, void 0, false, {
                                fileName: "[project]/components/rights/RightsGraphView.tsx",
                                lineNumber: 267,
                                columnNumber: 13
                            }, this)
                        ]
                    }, type, true, {
                        fileName: "[project]/components/rights/RightsGraphView.tsx",
                        lineNumber: 265,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/components/rights/RightsGraphView.tsx",
                lineNumber: 263,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/rights/RightsGraphView.tsx",
        lineNumber: 148,
        columnNumber: 5
    }, this);
}
_s(RightsGraphView, "EQDTg8UIxOat5oqQWo/zpIQsYtk=");
_c = RightsGraphView;
var _c;
__turbopack_context__.k.register(_c, "RightsGraphView");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/(app)/rights/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>RightsAnalysisPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/shield.js [app-client] (ecmascript) <export default as Shield>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/triangle-alert.js [app-client] (ecmascript) <export default as AlertTriangle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2d$big$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-check-big.js [app-client] (ecmascript) <export default as CheckCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__XCircle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-x.js [app-client] (ecmascript) <export default as XCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$map$2d$pin$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MapPin$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/map-pin.js [app-client] (ecmascript) <export default as MapPin>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$upload$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Upload$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/upload.js [app-client] (ecmascript) <export default as Upload>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/file-text.js [app-client] (ecmascript) <export default as FileText>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clipboard$2d$paste$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ClipboardPaste$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/clipboard-paste.js [app-client] (ecmascript) <export default as ClipboardPaste>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ImageIcon$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/image.js [app-client] (ecmascript) <export default as ImageIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-client] (ecmascript) <export default as Loader2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-down.js [app-client] (ecmascript) <export default as ChevronDown>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$up$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronUp$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-up.js [app-client] (ecmascript) <export default as ChevronUp>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$zap$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Zap$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/zap.js [app-client] (ecmascript) <export default as Zap>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$brain$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Brain$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/brain.js [app-client] (ecmascript) <export default as Brain>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShieldCheck$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/shield-check.js [app-client] (ecmascript) <export default as ShieldCheck>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$database$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Database$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/database.js [app-client] (ecmascript) <export default as Database>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$info$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Info$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/info.js [app-client] (ecmascript) <export default as Info>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShieldAlert$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/shield-alert.js [app-client] (ecmascript) <export default as ShieldAlert>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileCheck$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/file-check.js [app-client] (ecmascript) <export default as FileCheck>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$landmark$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Landmark$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/landmark.js [app-client] (ecmascript) <export default as Landmark>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/store.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$registry$2d$parser$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/registry-parser.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/components/common/index.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$PageHeader$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/common/PageHeader.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/common/Card.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$Alert$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/common/Alert.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$ai$2d$disclaimer$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/common/ai-disclaimer.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$pdf$2d$download$2d$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/common/pdf-download-button.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$IntegrityBadge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/common/IntegrityBadge.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$NerHighlight$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/common/NerHighlight.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$results$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/components/results/index.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$results$2f$ScoreGauge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/results/ScoreGauge.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$results$2f$ScholarPapers$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/results/ScholarPapers.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$forms$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/components/forms/index.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$forms$2f$SliderInput$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/forms/SliderInput.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$rights$2f$RightsGraphView$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/rights/RightsGraphView.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
;
;
;
;
;
;
;
// ─── 스타일 상수 ───
const SEVERITY_STYLES = {
    critical: {
        bg: "bg-red-50 border-red-200",
        text: "text-red-700",
        label: "치명"
    },
    high: {
        bg: "bg-orange-50 border-orange-200",
        text: "text-orange-700",
        label: "고위험"
    },
    medium: {
        bg: "bg-amber-50 border-amber-200",
        text: "text-amber-700",
        label: "주의"
    },
    low: {
        bg: "bg-blue-50 border-blue-200",
        text: "text-blue-700",
        label: "참고"
    }
};
const RISK_CONFIG = {
    danger: {
        bg: "bg-red-50 border-red-200",
        text: "text-red-700",
        descText: "text-red-600",
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__XCircle$3e$__["XCircle"],
        iconColor: "text-red-500"
    },
    warning: {
        bg: "bg-amber-50 border-amber-200",
        text: "text-amber-700",
        descText: "text-amber-600",
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__["AlertTriangle"],
        iconColor: "text-amber-500"
    },
    safe: {
        bg: "bg-emerald-50 border-emerald-200",
        text: "text-emerald-700",
        descText: "text-emerald-600",
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2d$big$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle$3e$__["CheckCircle"],
        iconColor: "text-emerald-500"
    }
};
// ─── 스텝 인디케이터 ───
function AnalysisStepIndicator({ step, showExtract, fileType }) {
    const baseSteps = [
        {
            key: "parsing",
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$database$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Database$3e$__["Database"],
            label: "파싱 엔진"
        },
        {
            key: "validating",
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShieldCheck$3e$__["ShieldCheck"],
            label: "검증 엔진"
        },
        {
            key: "scoring",
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$zap$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Zap$3e$__["Zap"],
            label: "스코어링"
        },
        {
            key: "molit",
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$database$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Database$3e$__["Database"],
            label: "실거래 조회"
        },
        {
            key: "ai",
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$brain$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Brain$3e$__["Brain"],
            label: "AI 종합"
        }
    ];
    const extractStep = fileType === "image" ? {
        key: "extracting",
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ImageIcon$3e$__["ImageIcon"],
        label: "이미지 OCR"
    } : {
        key: "extracting",
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__["FileText"],
        label: "PDF 추출"
    };
    const steps = showExtract ? [
        extractStep,
        ...baseSteps
    ] : baseSteps;
    const currentIdx = steps.findIndex((s)=>s.key === step);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex items-center justify-center gap-2 sm:gap-3 py-4",
        children: steps.map((s, i)=>{
            const isActive = s.key === step;
            const isDone = step === "done" || currentIdx > i;
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-2 sm:gap-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-col items-center gap-1",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-9 h-9 rounded-full flex items-center justify-center transition-all", isDone ? "bg-primary text-white" : isActive ? "bg-primary/20 text-primary animate-pulse" : "bg-gray-100 text-gray-400"),
                                children: isDone ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2d$big$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle$3e$__["CheckCircle"], {
                                    size: 18
                                }, void 0, false, {
                                    fileName: "[project]/app/(app)/rights/page.tsx",
                                    lineNumber: 140,
                                    columnNumber: 27
                                }, this) : isActive ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                    size: 18,
                                    className: "animate-spin"
                                }, void 0, false, {
                                    fileName: "[project]/app/(app)/rights/page.tsx",
                                    lineNumber: 140,
                                    columnNumber: 66
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(s.icon, {
                                    size: 18
                                }, void 0, false, {
                                    fileName: "[project]/app/(app)/rights/page.tsx",
                                    lineNumber: 140,
                                    columnNumber: 115
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/app/(app)/rights/page.tsx",
                                lineNumber: 136,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-[10px] font-medium", isActive || isDone ? "text-primary" : "text-gray-400"),
                                children: s.label
                            }, void 0, false, {
                                fileName: "[project]/app/(app)/rights/page.tsx",
                                lineNumber: 142,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(app)/rights/page.tsx",
                        lineNumber: 135,
                        columnNumber: 13
                    }, this),
                    i < steps.length - 1 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-6 sm:w-10 h-0.5 mb-5", isDone ? "bg-primary" : "bg-gray-200")
                    }, void 0, false, {
                        fileName: "[project]/app/(app)/rights/page.tsx",
                        lineNumber: 144,
                        columnNumber: 38
                    }, this)
                ]
            }, s.key, true, {
                fileName: "[project]/app/(app)/rights/page.tsx",
                lineNumber: 134,
                columnNumber: 11
            }, this);
        })
    }, void 0, false, {
        fileName: "[project]/app/(app)/rights/page.tsx",
        lineNumber: 129,
        columnNumber: 5
    }, this);
}
_c = AnalysisStepIndicator;
function getScoreLabel(score) {
    if (score >= 70) return "안전";
    if (score >= 40) return "주의";
    return "위험";
}
function RightsAnalysisPage() {
    _s();
    const [inputMode, setInputMode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("file");
    const [rawText, setRawText] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [estimatedPrice, setEstimatedPrice] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(850000000);
    const [step, setStep] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("idle");
    const [result, setResult] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [fileName, setFileName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [fileType, setFileType] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isDragging, setIsDragging] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isExtracting, setIsExtracting] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const fileInputRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const resultRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    // 주소 탭 메뉴
    const [addressTab, setAddressTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("admin");
    const [addressInfo, setAddressInfo] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    // 접기 상태
    const [showGapgu, setShowGapgu] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [showEulgu, setShowEulgu] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [showValidation, setShowValidation] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const loadSample = ()=>{
        setRawText(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$registry$2d$parser$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SAMPLE_REGISTRY_TEXT"]);
        setFileName(null);
        setFileType(null);
        setInputMode("text");
    };
    // 결과에서 주소가 나오면 카카오 Geocoder로 주소 형식 변환
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "RightsAnalysisPage.useEffect": ()=>{
            if (!result?.propertyInfo?.address) {
                setAddressInfo(null);
                return;
            }
            const address = result.propertyInfo.address;
            const geocode = {
                "RightsAnalysisPage.useEffect.geocode": ()=>{
                    if (!window.kakao?.maps) return;
                    window.kakao.maps.load({
                        "RightsAnalysisPage.useEffect.geocode": ()=>{
                            const geocoder = new window.kakao.maps.services.Geocoder();
                            geocoder.addressSearch(address, {
                                "RightsAnalysisPage.useEffect.geocode": (results, status)=>{
                                    if (status === window.kakao.maps.services.Status.OK && results[0]) {
                                        const r = results[0];
                                        setAddressInfo({
                                            admin: r.address ? `${r.address.region_1depth_name} ${r.address.region_2depth_name} ${r.address.region_3depth_h_name}` : address,
                                            jibun: r.address?.address_name || address,
                                            road: r.road_address?.address_name || "-",
                                            zipCode: r.road_address?.zone_no || "-"
                                        });
                                    } else {
                                        // Geocoder 실패 시 파싱된 주소로 폴백
                                        setAddressInfo({
                                            admin: address,
                                            jibun: address,
                                            road: "-",
                                            zipCode: "-"
                                        });
                                    }
                                }
                            }["RightsAnalysisPage.useEffect.geocode"]);
                        }
                    }["RightsAnalysisPage.useEffect.geocode"]);
                }
            }["RightsAnalysisPage.useEffect.geocode"];
            if (window.kakao?.maps) {
                geocode();
            } else {
                const interval = setInterval({
                    "RightsAnalysisPage.useEffect.interval": ()=>{
                        if (window.kakao?.maps) {
                            clearInterval(interval);
                            geocode();
                        }
                    }
                }["RightsAnalysisPage.useEffect.interval"], 200);
                const timeout = setTimeout({
                    "RightsAnalysisPage.useEffect.timeout": ()=>{
                        clearInterval(interval);
                        // SDK 로드 실패 시 폴백
                        setAddressInfo({
                            admin: address,
                            jibun: address,
                            road: "-",
                            zipCode: "-"
                        });
                    }
                }["RightsAnalysisPage.useEffect.timeout"], 5000);
                return ({
                    "RightsAnalysisPage.useEffect": ()=>{
                        clearInterval(interval);
                        clearTimeout(timeout);
                    }
                })["RightsAnalysisPage.useEffect"];
            }
        }
    }["RightsAnalysisPage.useEffect"], [
        result
    ]);
    const handleFileUpload = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "RightsAnalysisPage.useCallback[handleFileUpload]": async (files)=>{
            if (!files.length) return;
            const firstFile = files[0];
            const ext = firstFile.name.split(".").pop()?.toLowerCase();
            const isPdf = ext === "pdf" || firstFile.type === "application/pdf";
            const isImage = [
                "jpg",
                "jpeg",
                "png"
            ].includes(ext || "") || firstFile.type.startsWith("image/");
            if (!isPdf && !isImage) {
                setError("PDF, JPG, PNG 파일만 업로드할 수 있습니다.");
                return;
            }
            const uploadFiles = isPdf ? [
                firstFile
            ] : files.slice(0, 5);
            for (const file of uploadFiles){
                if (file.size > 10 * 1024 * 1024) {
                    setError(`파일 크기가 10MB를 초과합니다: ${file.name}`);
                    return;
                }
            }
            setError(null);
            setFileType(isPdf ? "pdf" : "image");
            setFileName(isPdf ? firstFile.name : `${uploadFiles.length}개 이미지`);
            setIsExtracting(true);
            try {
                const formData = new FormData();
                for (const file of uploadFiles)formData.append("file", file);
                const res = await fetch("/api/extract-pdf", {
                    method: "POST",
                    body: formData
                });
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                setRawText(data.text);
            } catch (e) {
                setError(e instanceof Error ? e.message : "텍스트 추출에 실패했습니다.");
                setFileName(null);
                setFileType(null);
            } finally{
                setIsExtracting(false);
            }
        }
    }["RightsAnalysisPage.useCallback[handleFileUpload]"], []);
    const handleDrop = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "RightsAnalysisPage.useCallback[handleDrop]": (e)=>{
            e.preventDefault();
            setIsDragging(false);
            const files = Array.from(e.dataTransfer.files);
            if (files.length) handleFileUpload(files);
        }
    }["RightsAnalysisPage.useCallback[handleDrop]"], [
        handleFileUpload
    ]);
    const handleDragOver = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "RightsAnalysisPage.useCallback[handleDragOver]": (e)=>{
            e.preventDefault();
            setIsDragging(true);
        }
    }["RightsAnalysisPage.useCallback[handleDragOver]"], []);
    const handleDragLeave = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "RightsAnalysisPage.useCallback[handleDragLeave]": ()=>setIsDragging(false)
    }["RightsAnalysisPage.useCallback[handleDragLeave]"], []);
    const handleFileChange = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "RightsAnalysisPage.useCallback[handleFileChange]": (e)=>{
            const files = Array.from(e.target.files || []);
            if (files.length) handleFileUpload(files);
            if (e.target) e.target.value = "";
        }
    }["RightsAnalysisPage.useCallback[handleFileChange]"], [
        handleFileUpload
    ]);
    const usedFile = inputMode === "file" && fileName;
    const handleAnalyze = async ()=>{
        if (!rawText.trim()) return;
        setResult(null);
        setError(null);
        setAddressInfo(null);
        setAddressTab("admin");
        if (usedFile) {
            setStep("extracting");
            await new Promise((r)=>setTimeout(r, 400));
        }
        setStep("parsing");
        await new Promise((r)=>setTimeout(r, 600));
        setStep("validating");
        await new Promise((r)=>setTimeout(r, 400));
        setStep("scoring");
        await new Promise((r)=>setTimeout(r, 400));
        setStep("molit");
        await new Promise((r)=>setTimeout(r, 300));
        setStep("ai");
        try {
            const res = await fetch("/api/analyze-unified", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    rawText,
                    estimatedPrice
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setResult(data);
            setStep("done");
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addAnalysis"])({
                type: "rights",
                typeLabel: "권리분석",
                address: data.parsed?.title?.address || fileName || "직접 입력",
                summary: `${data.riskScore?.grade || "?"}등급 (${data.riskScore?.gradeLabel || ""}, ${data.riskScore?.totalScore || 0}점) | 근저당비율 ${data.riskScore?.mortgageRatio?.toFixed(1) || 0}%`,
                data: data
            });
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addOrUpdateAsset"])({
                address: data.propertyInfo?.address || "직접 입력",
                type: data.propertyInfo?.type || "부동산",
                estimatedPrice: data.propertyInfo?.estimatedPrice || 0,
                jeonsePrice: data.propertyInfo?.jeonsePrice || 0,
                safetyScore: data.riskAnalysis?.safetyScore || 0,
                riskScore: data.riskAnalysis?.riskScore || 0
            });
        } catch (e) {
            setError(e instanceof Error ? e.message : "분석 중 오류가 발생했습니다.");
            setStep("idle");
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "max-w-6xl mx-auto",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$PageHeader$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PageHeader"], {
                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__["Shield"],
                title: "권리분석",
                description: "등기부등본 업로드 → 실제 데이터 기반 종합 권리분석"
            }, void 0, false, {
                fileName: "[project]/app/(app)/rights/page.tsx",
                lineNumber: 362,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
                className: "p-6 mb-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex gap-2 mb-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setInputMode("file"),
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all", inputMode === "file" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-secondary border-border hover:bg-gray-50"),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$upload$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Upload$3e$__["Upload"], {
                                        size: 14
                                    }, void 0, false, {
                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                        lineNumber: 369,
                                        columnNumber: 13
                                    }, this),
                                    " 파일 업로드"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(app)/rights/page.tsx",
                                lineNumber: 368,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setInputMode("text"),
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all", inputMode === "text" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-secondary border-border hover:bg-gray-50"),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clipboard$2d$paste$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ClipboardPaste$3e$__["ClipboardPaste"], {
                                        size: 14
                                    }, void 0, false, {
                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                        lineNumber: 372,
                                        columnNumber: 13
                                    }, this),
                                    " 텍스트 입력"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(app)/rights/page.tsx",
                                lineNumber: 371,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: loadSample,
                                className: "px-3 py-1.5 text-xs rounded-lg border border-border text-secondary hover:bg-gray-50 transition-all",
                                children: "샘플 데이터"
                            }, void 0, false, {
                                fileName: "[project]/app/(app)/rights/page.tsx",
                                lineNumber: 374,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(app)/rights/page.tsx",
                        lineNumber: 367,
                        columnNumber: 9
                    }, this),
                    inputMode === "file" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        onDrop: handleDrop,
                        onDragOver: handleDragOver,
                        onDragLeave: handleDragLeave,
                        onClick: ()=>fileInputRef.current?.click(),
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all", isDragging ? "border-primary bg-primary/5" : fileName ? "border-emerald-300 bg-emerald-50" : "border-border hover:border-primary/50 hover:bg-gray-50"),
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                ref: fileInputRef,
                                type: "file",
                                accept: ".pdf,.jpg,.jpeg,.png",
                                multiple: true,
                                onChange: handleFileChange,
                                className: "hidden"
                            }, void 0, false, {
                                fileName: "[project]/app/(app)/rights/page.tsx",
                                lineNumber: 391,
                                columnNumber: 13
                            }, this),
                            isExtracting ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex flex-col items-center gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                        size: 32,
                                        className: "animate-spin text-primary"
                                    }, void 0, false, {
                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                        lineNumber: 394,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm text-primary font-medium",
                                        children: "텍스트 추출 중..."
                                    }, void 0, false, {
                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                        lineNumber: 395,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(app)/rights/page.tsx",
                                lineNumber: 393,
                                columnNumber: 15
                            }, this) : fileName ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex flex-col items-center gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2d$big$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle$3e$__["CheckCircle"], {
                                        size: 32,
                                        className: "text-emerald-500"
                                    }, void 0, false, {
                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                        lineNumber: 399,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm font-medium text-emerald-700",
                                        children: fileName
                                    }, void 0, false, {
                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                        lineNumber: 400,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-xs text-emerald-600",
                                        children: [
                                            "텍스트 추출 완료 (",
                                            rawText.length.toLocaleString(),
                                            "자) — 클릭하여 변경"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                        lineNumber: 401,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(app)/rights/page.tsx",
                                lineNumber: 398,
                                columnNumber: 15
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex flex-col items-center gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$upload$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Upload$3e$__["Upload"], {
                                        size: 32,
                                        className: "text-gray-400"
                                    }, void 0, false, {
                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                        lineNumber: 405,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm text-gray-600",
                                        children: "등기부등본 PDF 또는 이미지를 드래그하세요"
                                    }, void 0, false, {
                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                        lineNumber: 406,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-xs text-gray-400",
                                        children: "PDF, JPG, PNG (최대 10MB)"
                                    }, void 0, false, {
                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                        lineNumber: 407,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(app)/rights/page.tsx",
                                lineNumber: 404,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(app)/rights/page.tsx",
                        lineNumber: 381,
                        columnNumber: 11
                    }, this),
                    inputMode === "text" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                        value: rawText,
                        onChange: (e)=>setRawText(e.target.value),
                        placeholder: "등기부등본 텍스트를 붙여넣으세요...",
                        className: "w-full h-48 px-4 py-3 rounded-lg border border-border text-xs font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary/30"
                    }, void 0, false, {
                        fileName: "[project]/app/(app)/rights/page.tsx",
                        lineNumber: 415,
                        columnNumber: 11
                    }, this),
                    rawText && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-4 p-3 bg-gray-50 rounded-lg",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$forms$2f$SliderInput$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SliderInput"], {
                                label: "추정 시세 (선택사항)",
                                value: estimatedPrice,
                                onChange: setEstimatedPrice,
                                min: 50000000,
                                max: 5000000000,
                                step: 10000000,
                                formatValue: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatKRW"]
                            }, void 0, false, {
                                fileName: "[project]/app/(app)/rights/page.tsx",
                                lineNumber: 426,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[10px] text-gray-400 mt-1",
                                children: "MOLIT 실거래 데이터가 있으면 자동으로 시세를 반영합니다"
                            }, void 0, false, {
                                fileName: "[project]/app/(app)/rights/page.tsx",
                                lineNumber: 435,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(app)/rights/page.tsx",
                        lineNumber: 425,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: handleAnalyze,
                        disabled: !rawText.trim() || step !== "idle" && step !== "done",
                        className: "mt-4 w-full py-3 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__["Shield"], {
                                size: 16
                            }, void 0, false, {
                                fileName: "[project]/app/(app)/rights/page.tsx",
                                lineNumber: 445,
                                columnNumber: 11
                            }, this),
                            "종합 권리분석 시작"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(app)/rights/page.tsx",
                        lineNumber: 440,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/(app)/rights/page.tsx",
                lineNumber: 365,
                columnNumber: 7
            }, this),
            error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mb-6",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$Alert$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Alert"], {
                    variant: "error",
                    children: error
                }, void 0, false, {
                    fileName: "[project]/app/(app)/rights/page.tsx",
                    lineNumber: 451,
                    columnNumber: 39
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/(app)/rights/page.tsx",
                lineNumber: 451,
                columnNumber: 17
            }, this),
            step !== "idle" && step !== "done" && !error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
                className: "p-6 mb-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm font-medium text-gray-700 text-center mb-2",
                        children: "등기부등본 종합 분석 중..."
                    }, void 0, false, {
                        fileName: "[project]/app/(app)/rights/page.tsx",
                        lineNumber: 456,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(AnalysisStepIndicator, {
                        step: step,
                        showExtract: !!usedFile,
                        fileType: fileType
                    }, void 0, false, {
                        fileName: "[project]/app/(app)/rights/page.tsx",
                        lineNumber: 457,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/(app)/rights/page.tsx",
                lineNumber: 455,
                columnNumber: 9
            }, this),
            result && step === "done" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                ref: resultRef,
                className: "space-y-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center justify-between",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$ai$2d$disclaimer$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                compact: true
                            }, void 0, false, {
                                fileName: "[project]/app/(app)/rights/page.tsx",
                                lineNumber: 466,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$pdf$2d$download$2d$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                targetRef: resultRef,
                                filename: "vestra-rights-analysis.pdf",
                                title: "VESTRA 권리분석 리포트"
                            }, void 0, false, {
                                fileName: "[project]/app/(app)/rights/page.tsx",
                                lineNumber: 467,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(app)/rights/page.tsx",
                        lineNumber: 465,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid grid-cols-1 lg:grid-cols-3 gap-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
                                className: "p-6 flex flex-col items-center justify-center",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        className: "text-sm font-medium text-gray-500 mb-4",
                                        children: "안전도 점수"
                                    }, void 0, false, {
                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                        lineNumber: 472,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$results$2f$ScoreGauge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ScoreGauge"], {
                                        score: result.riskAnalysis.safetyScore,
                                        size: "lg",
                                        grade: getScoreLabel(result.riskAnalysis.safetyScore),
                                        showLabel: false
                                    }, void 0, false, {
                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                        lineNumber: 473,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mt-4 grid grid-cols-2 gap-4 w-full text-center",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-xs text-gray-400",
                                                        children: "근저당비율"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                                        lineNumber: 481,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-lg font-bold text-gray-900",
                                                        children: [
                                                            result.riskAnalysis.mortgageRatio.toFixed(1),
                                                            "%"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                                        lineNumber: 482,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/(app)/rights/page.tsx",
                                                lineNumber: 480,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-xs text-gray-400",
                                                        children: "전세가율"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                                        lineNumber: 485,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-lg font-bold text-gray-900",
                                                        children: [
                                                            result.riskAnalysis.jeonseRatio,
                                                            "%"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                                        lineNumber: 486,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/(app)/rights/page.tsx",
                                                lineNumber: 484,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                        lineNumber: 479,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mt-3 flex gap-1.5",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "px-2 py-0.5 text-[9px] rounded-full bg-emerald-100 text-emerald-700",
                                                children: "등기부등본 실제 데이터"
                                            }, void 0, false, {
                                                fileName: "[project]/app/(app)/rights/page.tsx",
                                                lineNumber: 491,
                                                columnNumber: 17
                                            }, this),
                                            result.dataSource?.molitAvailable && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "px-2 py-0.5 text-[9px] rounded-full bg-blue-100 text-blue-700",
                                                children: "MOLIT 실거래"
                                            }, void 0, false, {
                                                fileName: "[project]/app/(app)/rights/page.tsx",
                                                lineNumber: 493,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                        lineNumber: 490,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(app)/rights/page.tsx",
                                lineNumber: 471,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
                                className: "lg:col-span-2 p-6",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        className: "text-sm font-medium text-gray-500 mb-4",
                                        children: [
                                            "위험 분석 항목 (",
                                            result.riskAnalysis.risks.length,
                                            "건)"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                        lineNumber: 500,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "space-y-2 max-h-[400px] overflow-y-auto",
                                        children: result.riskAnalysis.risks.length > 0 ? result.riskAnalysis.risks.map((risk, i)=>{
                                            const c = RISK_CONFIG[risk.level];
                                            const Icon = c.icon;
                                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex items-start gap-3 rounded-lg border p-3", c.bg),
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                                                        size: 16,
                                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("mt-0.5 flex-shrink-0", c.iconColor)
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                                        lineNumber: 507,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-sm font-medium", c.text),
                                                                children: risk.title
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(app)/rights/page.tsx",
                                                                lineNumber: 509,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-xs mt-0.5", c.descText),
                                                                children: risk.description
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(app)/rights/page.tsx",
                                                                lineNumber: 510,
                                                                columnNumber: 25
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                                        lineNumber: 508,
                                                        columnNumber: 23
                                                    }, this)
                                                ]
                                            }, i, true, {
                                                fileName: "[project]/app/(app)/rights/page.tsx",
                                                lineNumber: 506,
                                                columnNumber: 21
                                            }, this);
                                        }) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-lg",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2d$big$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle$3e$__["CheckCircle"], {
                                                    size: 16,
                                                    className: "text-emerald-500"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(app)/rights/page.tsx",
                                                    lineNumber: 516,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-sm text-emerald-700",
                                                    children: "특별한 위험 요소가 발견되지 않았습니다"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(app)/rights/page.tsx",
                                                    lineNumber: 517,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/(app)/rights/page.tsx",
                                            lineNumber: 515,
                                            columnNumber: 19
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                        lineNumber: 501,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(app)/rights/page.tsx",
                                lineNumber: 499,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(app)/rights/page.tsx",
                        lineNumber: 470,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
                        className: "p-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-base font-semibold text-gray-900 mb-4 flex items-center gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$map$2d$pin$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MapPin$3e$__["MapPin"], {
                                        size: 18,
                                        strokeWidth: 1.5,
                                        className: "text-[#1d1d1f]"
                                    }, void 0, false, {
                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                        lineNumber: 527,
                                        columnNumber: 15
                                    }, this),
                                    "부동산 기본정보"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(app)/rights/page.tsx",
                                lineNumber: 526,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "space-y-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "p-3 bg-gray-50 rounded-lg",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center gap-2 mb-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-xs text-gray-400",
                                                        children: "주소"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                                        lineNumber: 534,
                                                        columnNumber: 19
                                                    }, this),
                                                    addressInfo && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex gap-1",
                                                        children: [
                                                            {
                                                                key: "admin",
                                                                label: "행정동"
                                                            },
                                                            {
                                                                key: "jibun",
                                                                label: "지번"
                                                            },
                                                            {
                                                                key: "road",
                                                                label: "도로명"
                                                            }
                                                        ].map((tab)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                onClick: ()=>setAddressTab(tab.key),
                                                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("px-2 py-0.5 text-[10px] rounded-md border transition-all", addressTab === tab.key ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"),
                                                                children: tab.label
                                                            }, tab.key, false, {
                                                                fileName: "[project]/app/(app)/rights/page.tsx",
                                                                lineNumber: 542,
                                                                columnNumber: 25
                                                            }, this))
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                                        lineNumber: 536,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/(app)/rights/page.tsx",
                                                lineNumber: 533,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-sm font-medium text-gray-900",
                                                children: addressInfo ? addressInfo[addressTab] : result.propertyInfo.address || "-"
                                            }, void 0, false, {
                                                fileName: "[project]/app/(app)/rights/page.tsx",
                                                lineNumber: 558,
                                                columnNumber: 17
                                            }, this),
                                            addressInfo?.zipCode && addressInfo.zipCode !== "-" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-[11px] text-gray-400 mt-1",
                                                children: [
                                                    "우편번호: ",
                                                    addressInfo.zipCode
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/(app)/rights/page.tsx",
                                                lineNumber: 562,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                        lineNumber: 532,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "grid grid-cols-2 md:grid-cols-4 gap-4",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-xs text-gray-400 mb-1",
                                                        children: "건물유형"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                                        lineNumber: 568,
                                                        columnNumber: 22
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-sm font-medium text-gray-900",
                                                        children: result.propertyInfo.type || "-"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                                        lineNumber: 568,
                                                        columnNumber: 72
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/(app)/rights/page.tsx",
                                                lineNumber: 568,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-xs text-gray-400 mb-1",
                                                        children: "전용면적"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                                        lineNumber: 569,
                                                        columnNumber: 22
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-sm font-medium text-gray-900",
                                                        children: result.propertyInfo.area || "-"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                                        lineNumber: 569,
                                                        columnNumber: 72
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/(app)/rights/page.tsx",
                                                lineNumber: 569,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-xs text-gray-400 mb-1",
                                                        children: "추정 시세"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                                        lineNumber: 570,
                                                        columnNumber: 22
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-sm font-bold text-blue-600",
                                                        children: result.propertyInfo.estimatedPrice ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatKRW"])(result.propertyInfo.estimatedPrice) : "-"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                                        lineNumber: 570,
                                                        columnNumber: 73
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/(app)/rights/page.tsx",
                                                lineNumber: 570,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-xs text-gray-400 mb-1",
                                                        children: "전세 시세"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                                        lineNumber: 571,
                                                        columnNumber: 22
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-sm font-bold text-emerald-600",
                                                        children: result.propertyInfo.jeonsePrice ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatKRW"])(result.propertyInfo.jeonsePrice) : "-"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                                        lineNumber: 571,
                                                        columnNumber: 73
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/(app)/rights/page.tsx",
                                                lineNumber: 571,
                                                columnNumber: 17
                                            }, this),
                                            result.propertyInfo.recentTransaction && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-xs text-gray-400 mb-1",
                                                        children: "최근 거래"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                                        lineNumber: 573,
                                                        columnNumber: 24
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-sm font-medium text-gray-900",
                                                        children: result.propertyInfo.recentTransaction
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                                        lineNumber: 573,
                                                        columnNumber: 75
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/(app)/rights/page.tsx",
                                                lineNumber: 573,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                        lineNumber: 567,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(app)/rights/page.tsx",
                                lineNumber: 530,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(app)/rights/page.tsx",
                        lineNumber: 525,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$IntegrityBadge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["IntegrityBadge"], {
                        steps: 5
                    }, void 0, false, {
                        fileName: "[project]/app/(app)/rights/page.tsx",
                        lineNumber: 580,
                        columnNumber: 11
                    }, this),
                    result.parsed && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
                        className: "p-6",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$rights$2f$RightsGraphView$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RightsGraphView"], {
                            parsed: result.parsed
                        }, void 0, false, {
                            fileName: "[project]/app/(app)/rights/page.tsx",
                            lineNumber: 585,
                            columnNumber: 15
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/app/(app)/rights/page.tsx",
                        lineNumber: 584,
                        columnNumber: 13
                    }, this),
                    rawText && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
                        className: "p-6",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$NerHighlight$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["NerHighlight"], {
                            text: rawText
                        }, void 0, false, {
                            fileName: "[project]/app/(app)/rights/page.tsx",
                            lineNumber: 592,
                            columnNumber: 15
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/app/(app)/rights/page.tsx",
                        lineNumber: 591,
                        columnNumber: 13
                    }, this),
                    result.parsed?.gapgu?.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
                        className: "p-0 overflow-hidden",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setShowGapgu(!showGapgu),
                                className: "w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        className: "text-sm font-semibold flex items-center gap-2",
                                        children: [
                                            "갑구 (소유권) ",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-xs font-normal text-gray-400",
                                                children: [
                                                    result.parsed.gapgu.length,
                                                    "건"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/(app)/rights/page.tsx",
                                                lineNumber: 601,
                                                columnNumber: 28
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                        lineNumber: 600,
                                        columnNumber: 17
                                    }, this),
                                    showGapgu ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$up$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronUp$3e$__["ChevronUp"], {
                                        size: 16
                                    }, void 0, false, {
                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                        lineNumber: 603,
                                        columnNumber: 30
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__["ChevronDown"], {
                                        size: 16
                                    }, void 0, false, {
                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                        lineNumber: 603,
                                        columnNumber: 56
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(app)/rights/page.tsx",
                                lineNumber: 599,
                                columnNumber: 15
                            }, this),
                            showGapgu && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "px-4 pb-4 space-y-2",
                                children: result.parsed.gapgu.map((entry, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("p-3 rounded-lg border text-xs", entry.isCancelled ? "opacity-50 bg-gray-50 border-gray-200 line-through" : "bg-white border-border"),
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center gap-2 mb-1",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "font-mono text-gray-400",
                                                        children: [
                                                            "#",
                                                            entry.order
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                                        lineNumber: 610,
                                                        columnNumber: 25
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "font-medium",
                                                        children: entry.purpose
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                                        lineNumber: 611,
                                                        columnNumber: 25
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-gray-400",
                                                        children: entry.date
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                                        lineNumber: 612,
                                                        columnNumber: 25
                                                    }, this),
                                                    entry.isCancelled && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-[9px] px-1.5 py-0.5 bg-gray-200 text-gray-500 rounded",
                                                        children: "말소"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                                        lineNumber: 613,
                                                        columnNumber: 47
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/(app)/rights/page.tsx",
                                                lineNumber: 609,
                                                columnNumber: 23
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-gray-600",
                                                children: entry.holder
                                            }, void 0, false, {
                                                fileName: "[project]/app/(app)/rights/page.tsx",
                                                lineNumber: 615,
                                                columnNumber: 23
                                            }, this)
                                        ]
                                    }, i, true, {
                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                        lineNumber: 608,
                                        columnNumber: 21
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/app/(app)/rights/page.tsx",
                                lineNumber: 606,
                                columnNumber: 17
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(app)/rights/page.tsx",
                        lineNumber: 598,
                        columnNumber: 13
                    }, this),
                    result.parsed?.eulgu?.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
                        className: "p-0 overflow-hidden",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setShowEulgu(!showEulgu),
                                className: "w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        className: "text-sm font-semibold flex items-center gap-2",
                                        children: [
                                            "을구 (근저당/전세권) ",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-xs font-normal text-gray-400",
                                                children: [
                                                    result.parsed.eulgu.length,
                                                    "건"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/(app)/rights/page.tsx",
                                                lineNumber: 628,
                                                columnNumber: 32
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                        lineNumber: 627,
                                        columnNumber: 17
                                    }, this),
                                    showEulgu ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$up$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronUp$3e$__["ChevronUp"], {
                                        size: 16
                                    }, void 0, false, {
                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                        lineNumber: 630,
                                        columnNumber: 30
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__["ChevronDown"], {
                                        size: 16
                                    }, void 0, false, {
                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                        lineNumber: 630,
                                        columnNumber: 56
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(app)/rights/page.tsx",
                                lineNumber: 626,
                                columnNumber: 15
                            }, this),
                            showEulgu && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "px-4 pb-4 space-y-2",
                                children: result.parsed.eulgu.map((entry, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("p-3 rounded-lg border text-xs", entry.isCancelled ? "opacity-50 bg-gray-50 border-gray-200 line-through" : "bg-white border-border"),
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center gap-2 mb-1",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "font-mono text-gray-400",
                                                        children: [
                                                            "#",
                                                            entry.order
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                                        lineNumber: 637,
                                                        columnNumber: 25
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "font-medium",
                                                        children: entry.purpose
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                                        lineNumber: 638,
                                                        columnNumber: 25
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-gray-400",
                                                        children: entry.date
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                                        lineNumber: 639,
                                                        columnNumber: 25
                                                    }, this),
                                                    entry.amount > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-blue-600 font-medium",
                                                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatKRW"])(entry.amount)
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                                        lineNumber: 640,
                                                        columnNumber: 46
                                                    }, this),
                                                    entry.isCancelled && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-[9px] px-1.5 py-0.5 bg-gray-200 text-gray-500 rounded",
                                                        children: "말소"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                                        lineNumber: 641,
                                                        columnNumber: 47
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/(app)/rights/page.tsx",
                                                lineNumber: 636,
                                                columnNumber: 23
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-gray-600",
                                                children: entry.holder
                                            }, void 0, false, {
                                                fileName: "[project]/app/(app)/rights/page.tsx",
                                                lineNumber: 643,
                                                columnNumber: 23
                                            }, this)
                                        ]
                                    }, i, true, {
                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                        lineNumber: 635,
                                        columnNumber: 21
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/app/(app)/rights/page.tsx",
                                lineNumber: 633,
                                columnNumber: 17
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(app)/rights/page.tsx",
                        lineNumber: 625,
                        columnNumber: 13
                    }, this),
                    result.validation?.issues?.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
                        className: "p-0 overflow-hidden",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setShowValidation(!showValidation),
                                className: "w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        className: "text-sm font-semibold flex items-center gap-2",
                                        children: [
                                            "검증 결과",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-xs font-normal text-gray-400",
                                                children: [
                                                    result.validation.issues.filter((i)=>i.severity === "error").length,
                                                    "오류 /",
                                                    result.validation.issues.filter((i)=>i.severity === "warning").length,
                                                    "경고"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/(app)/rights/page.tsx",
                                                lineNumber: 657,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                        lineNumber: 655,
                                        columnNumber: 17
                                    }, this),
                                    showValidation ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$up$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronUp$3e$__["ChevronUp"], {
                                        size: 16
                                    }, void 0, false, {
                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                        lineNumber: 662,
                                        columnNumber: 35
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__["ChevronDown"], {
                                        size: 16
                                    }, void 0, false, {
                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                        lineNumber: 662,
                                        columnNumber: 61
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(app)/rights/page.tsx",
                                lineNumber: 654,
                                columnNumber: 15
                            }, this),
                            showValidation && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "px-4 pb-4 space-y-2",
                                children: result.validation.issues.map((issue, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("p-3 rounded-lg border text-xs", SEVERITY_STYLES[issue.severity]?.bg || "bg-gray-50"),
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center gap-2 mb-1",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-[9px] px-1.5 py-0.5 rounded font-medium", SEVERITY_STYLES[issue.severity]?.text || ""),
                                                        children: SEVERITY_STYLES[issue.severity]?.label || issue.severity
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                                        lineNumber: 669,
                                                        columnNumber: 25
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "font-medium",
                                                        children: issue.field
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                                        lineNumber: 670,
                                                        columnNumber: 25
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/(app)/rights/page.tsx",
                                                lineNumber: 668,
                                                columnNumber: 23
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(SEVERITY_STYLES[issue.severity]?.text || "text-gray-600"),
                                                children: issue.message
                                            }, void 0, false, {
                                                fileName: "[project]/app/(app)/rights/page.tsx",
                                                lineNumber: 672,
                                                columnNumber: 23
                                            }, this)
                                        ]
                                    }, i, true, {
                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                        lineNumber: 667,
                                        columnNumber: 21
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/app/(app)/rights/page.tsx",
                                lineNumber: 665,
                                columnNumber: 17
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(app)/rights/page.tsx",
                        lineNumber: 653,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-[#f5f5f7] rounded-xl border border-gray-200 p-6 shadow-sm",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-2 mb-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__["Shield"], {
                                        size: 20,
                                        strokeWidth: 1.5,
                                        className: "text-[#1d1d1f]"
                                    }, void 0, false, {
                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                        lineNumber: 683,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        className: "text-lg font-semibold text-gray-900",
                                        children: "AI 종합 의견"
                                    }, void 0, false, {
                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                        lineNumber: 684,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(app)/rights/page.tsx",
                                lineNumber: 682,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-sm leading-relaxed text-gray-700 whitespace-pre-line",
                                children: result.aiOpinion
                            }, void 0, false, {
                                fileName: "[project]/app/(app)/rights/page.tsx",
                                lineNumber: 686,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(app)/rights/page.tsx",
                        lineNumber: 681,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-5 shadow-sm",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-start gap-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShieldAlert$3e$__["ShieldAlert"], {
                                    size: 20,
                                    className: "text-amber-600 mt-0.5 flex-shrink-0"
                                }, void 0, false, {
                                    fileName: "[project]/app/(app)/rights/page.tsx",
                                    lineNumber: 692,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            className: "text-sm font-semibold text-amber-800 mb-2",
                                            children: "등기부등본의 한계: 공신력 부재"
                                        }, void 0, false, {
                                            fileName: "[project]/app/(app)/rights/page.tsx",
                                            lineNumber: 694,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-xs leading-relaxed text-amber-700",
                                            children: [
                                                "대한민국 등기부등본에는 법적 ",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                    children: "'공신력'"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(app)/rights/page.tsx",
                                                    lineNumber: 696,
                                                    columnNumber: 35
                                                }, this),
                                                "이 없습니다. 등기부는 정보를 공개(공시)할 뿐, 그 내용이 실제와 다르더라도 이를 믿고 거래한 사람을 국가가 완벽히 보호하지 않습니다. 서류 위조 등으로 잘못 기재된 등기를 믿고 계약했더라도 진정한 권리자가 나타나면 매수인이 손해를 볼 수 있습니다."
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/(app)/rights/page.tsx",
                                            lineNumber: 695,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "mt-3 flex items-center gap-2 text-xs text-amber-600",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$info$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Info$3e$__["Info"], {
                                                    size: 12
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(app)/rights/page.tsx",
                                                    lineNumber: 701,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: [
                                                        "반드시 ",
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                            children: "'말소 사항 포함'"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(app)/rights/page.tsx",
                                                            lineNumber: 702,
                                                            columnNumber: 29
                                                        }, this),
                                                        "으로 등기부를 발급받아 과거 이력까지 확인하세요."
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/(app)/rights/page.tsx",
                                                    lineNumber: 702,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/(app)/rights/page.tsx",
                                            lineNumber: 700,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/(app)/rights/page.tsx",
                                    lineNumber: 693,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/(app)/rights/page.tsx",
                            lineNumber: 691,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/app/(app)/rights/page.tsx",
                        lineNumber: 690,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
                        className: "p-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-base font-semibold text-gray-900 mb-4 flex items-center gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileCheck$3e$__["FileCheck"], {
                                        size: 18,
                                        strokeWidth: 1.5,
                                        className: "text-[#1d1d1f]"
                                    }, void 0, false, {
                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                        lineNumber: 711,
                                        columnNumber: 15
                                    }, this),
                                    "거래 전 안전 체크리스트"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(app)/rights/page.tsx",
                                lineNumber: 710,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid grid-cols-1 md:grid-cols-2 gap-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "p-4 bg-red-50 border border-red-200 rounded-lg",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-start gap-2.5",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$landmark$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Landmark$3e$__["Landmark"], {
                                                    size: 16,
                                                    className: "text-red-500 mt-0.5 flex-shrink-0"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(app)/rights/page.tsx",
                                                    lineNumber: 718,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-sm font-medium text-red-800",
                                                            children: "세금 체납 확인"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(app)/rights/page.tsx",
                                                            lineNumber: 720,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-xs text-red-600 mt-1 leading-relaxed",
                                                            children: [
                                                                "집주인의 ",
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                                    children: "국세·지방세 완납증명원"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(app)/rights/page.tsx",
                                                                    lineNumber: 722,
                                                                    columnNumber: 28
                                                                }, this),
                                                                "을 반드시 요구하세요. 체납 세금(당해세)은 근저당보다 ",
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                                    children: "우선 변제"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(app)/rights/page.tsx",
                                                                    lineNumber: 723,
                                                                    columnNumber: 41
                                                                }, this),
                                                                "되어 보증금 회수에 직접 영향을 줍니다."
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/(app)/rights/page.tsx",
                                                            lineNumber: 721,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/(app)/rights/page.tsx",
                                                    lineNumber: 719,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/(app)/rights/page.tsx",
                                            lineNumber: 717,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                        lineNumber: 716,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "p-4 bg-orange-50 border border-orange-200 rounded-lg",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-start gap-2.5",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__["AlertTriangle"], {
                                                    size: 16,
                                                    className: "text-orange-500 mt-0.5 flex-shrink-0"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(app)/rights/page.tsx",
                                                    lineNumber: 732,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-sm font-medium text-orange-800",
                                                            children: "말소 이력 직접 확인"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(app)/rights/page.tsx",
                                                            lineNumber: 734,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-xs text-orange-600 mt-1 leading-relaxed",
                                                            children: [
                                                                "최근 1년 내 근저당이 말소되었다면, 해당 ",
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                                    children: "은행에 직접 전화"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(app)/rights/page.tsx",
                                                                    lineNumber: 736,
                                                                    columnNumber: 47
                                                                }, this),
                                                                "하여 정상 상환 여부를 확인하세요. 말소 서류 위조로 등기부만 깨끗해진 경우가 있습니다."
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/(app)/rights/page.tsx",
                                                            lineNumber: 735,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/(app)/rights/page.tsx",
                                                    lineNumber: 733,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/(app)/rights/page.tsx",
                                            lineNumber: 731,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                        lineNumber: 730,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "p-4 bg-blue-50 border border-blue-200 rounded-lg",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-start gap-2.5",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShieldCheck$3e$__["ShieldCheck"], {
                                                    size: 16,
                                                    className: "text-blue-500 mt-0.5 flex-shrink-0"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(app)/rights/page.tsx",
                                                    lineNumber: 746,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-sm font-medium text-blue-800",
                                                            children: "전세보증보험 가입"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(app)/rights/page.tsx",
                                                            lineNumber: 748,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-xs text-blue-600 mt-1 leading-relaxed",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                                    children: "HUG(주택도시보증공사)"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(app)/rights/page.tsx",
                                                                    lineNumber: 750,
                                                                    columnNumber: 23
                                                                }, this),
                                                                " 또는 ",
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                                    children: "SGI(서울보증보험)"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(app)/rights/page.tsx",
                                                                    lineNumber: 750,
                                                                    columnNumber: 57
                                                                }, this),
                                                                "의 전세보증금반환보증에 반드시 가입하세요. 임대인 부도 시 보증금을 보장합니다."
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/(app)/rights/page.tsx",
                                                            lineNumber: 749,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/(app)/rights/page.tsx",
                                                    lineNumber: 747,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/(app)/rights/page.tsx",
                                            lineNumber: 745,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                        lineNumber: 744,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "p-4 bg-indigo-50 border border-indigo-200 rounded-lg",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-start gap-2.5",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__["Shield"], {
                                                    size: 16,
                                                    className: "text-indigo-500 mt-0.5 flex-shrink-0"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(app)/rights/page.tsx",
                                                    lineNumber: 760,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-sm font-medium text-indigo-800",
                                                            children: "권원보험 (Title Insurance)"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(app)/rights/page.tsx",
                                                            lineNumber: 762,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-xs text-indigo-600 mt-1 leading-relaxed",
                                                            children: [
                                                                "소유권 관련 사기·서류 위조·등기 오류로 인한 피해를 보상하는 보험입니다. 매매가 3억 기준 일시불 약 ",
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                                    children: "10~15만원"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(app)/rights/page.tsx",
                                                                    lineNumber: 765,
                                                                    columnNumber: 39
                                                                }, this),
                                                                "으로 가입 가능합니다."
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/(app)/rights/page.tsx",
                                                            lineNumber: 763,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/(app)/rights/page.tsx",
                                                    lineNumber: 761,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/(app)/rights/page.tsx",
                                            lineNumber: 759,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                        lineNumber: 758,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "p-4 bg-emerald-50 border border-emerald-200 rounded-lg md:col-span-2",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-start gap-2.5",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__["FileText"], {
                                                    size: 16,
                                                    className: "text-emerald-500 mt-0.5 flex-shrink-0"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(app)/rights/page.tsx",
                                                    lineNumber: 774,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-sm font-medium text-emerald-800",
                                                            children: "등기 상태 유지 특약 명시"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(app)/rights/page.tsx",
                                                            lineNumber: 776,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-xs text-emerald-600 mt-1 leading-relaxed",
                                                            children: [
                                                                "계약서에 ",
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                                    children: '"잔금일까지 현재의 등기 상태를 유지하며, 위반 시 계약 해제 및 배액 배상한다"'
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(app)/rights/page.tsx",
                                                                    lineNumber: 778,
                                                                    columnNumber: 28
                                                                }, this),
                                                                "는 취지의 특약을 반드시 기재하세요. 계약 후 잔금일 전에 근저당 추가, 가압류 등이 발생하는 것을 방지합니다."
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/(app)/rights/page.tsx",
                                                            lineNumber: 777,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/(app)/rights/page.tsx",
                                                    lineNumber: 775,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/(app)/rights/page.tsx",
                                            lineNumber: 773,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/(app)/rights/page.tsx",
                                        lineNumber: 772,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(app)/rights/page.tsx",
                                lineNumber: 714,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(app)/rights/page.tsx",
                        lineNumber: 709,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$results$2f$ScholarPapers$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ScholarPapers"], {
                        keywords: [
                            "부동산 권리분석",
                            "등기부등본",
                            result.propertyInfo.address?.split(" ").slice(0, 2).join(" ") || "부동산"
                        ].filter(Boolean)
                    }, void 0, false, {
                        fileName: "[project]/app/(app)/rights/page.tsx",
                        lineNumber: 788,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$Alert$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Alert"], {
                        variant: "warning",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                children: "면책 조항"
                            }, void 0, false, {
                                fileName: "[project]/app/(app)/rights/page.tsx",
                                lineNumber: 792,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                                fileName: "[project]/app/(app)/rights/page.tsx",
                                lineNumber: 792,
                                columnNumber: 35
                            }, this),
                            "본 분석은 등기부등본 자체 파싱 엔진 + AI 기반의 참고 자료이며, 법적 조언이 아닙니다. 등기부등본의 정확성은 원본 문서와 대조해 확인하시기 바랍니다. 부동산 거래 결정 시 반드시 법무사, 공인중개사 등 전문가와 상담하세요."
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(app)/rights/page.tsx",
                        lineNumber: 791,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/(app)/rights/page.tsx",
                lineNumber: 463,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/(app)/rights/page.tsx",
        lineNumber: 361,
        columnNumber: 5
    }, this);
}
_s(RightsAnalysisPage, "Zt28VNflSr0q9LUkbzF1GDD3BcA=");
_c1 = RightsAnalysisPage;
var _c, _c1;
__turbopack_context__.k.register(_c, "AnalysisStepIndicator");
__turbopack_context__.k.register(_c1, "RightsAnalysisPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_641e93e1._.js.map