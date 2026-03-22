#!/usr/bin/env python3
"""VESTRA 사업계획서 v3 PDF 생성 - 초기창업패키지 지원금 신청용"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ── Fonts ──
FD = "/Users/watchers/Library/Fonts"
pdfmetrics.registerFont(TTFont("NR", f"{FD}/NanumSquareR.ttf"))
pdfmetrics.registerFont(TTFont("NB", f"{FD}/NanumSquareB.ttf"))
pdfmetrics.registerFont(TTFont("NEB", f"{FD}/NanumSquareEB.ttf"))
pdfmetrics.registerFont(TTFont("NL", f"{FD}/NanumSquareL.ttf"))

# ── Colors ──
C1 = HexColor("#1a1a2e")  # primary dark
C2 = HexColor("#16213e")  # accent
C3 = HexColor("#0f3460")  # blue
C4 = HexColor("#e94560")  # red accent
BG = HexColor("#f8f9fa")
BD = HexColor("#dee2e6")
GR = HexColor("#6c757d")
GRN = HexColor("#28a745")
BLU = HexColor("#0066cc")
ORG = HexColor("#e67e22")

# ── Styles ──
def ps(name, font="NR", size=9.5, leading=15, color="#212529", align=TA_LEFT,
       space_before=0, space_after=2*mm, left_indent=0, **kw):
    return ParagraphStyle(name, fontName=font, fontSize=size, leading=leading,
                          textColor=HexColor(color), alignment=align,
                          spaceBefore=space_before, spaceAfter=space_after,
                          leftIndent=left_indent, **kw)

S = {
    "cover_title": ps("ct", "NEB", 32, 42, "#1a1a2e", TA_CENTER, space_after=3*mm),
    "cover_sub": ps("cs", "NB", 16, 22, "#0f3460", TA_CENTER, space_after=6*mm),
    "cover_info": ps("ci", "NR", 11, 18, "#495057", TA_CENTER, space_after=1*mm),
    "h0": ps("h0", "NEB", 20, 28, "#1a1a2e", TA_CENTER, space_before=5*mm, space_after=8*mm),
    "h1": ps("h1", "NEB", 17, 24, "#1a1a2e", space_before=10*mm, space_after=5*mm),
    "h2": ps("h2", "NB", 13, 18, "#16213e", space_before=7*mm, space_after=3*mm),
    "h3": ps("h3", "NB", 11, 16, "#0f3460", space_before=4*mm, space_after=2*mm),
    "body": ps("body", align=TA_JUSTIFY, space_after=3*mm),
    "bullet": ps("bl", left_indent=8*mm, space_after=1.5*mm),
    "quote": ps("qt", "NB", 9, 14, "#e94560", left_indent=6*mm, space_before=3*mm, space_after=3*mm),
    "code": ps("cd", "NL", 7.5, 11, "#383a42", left_indent=4*mm, space_after=1*mm,
               backColor=HexColor("#f4f4f5")),
    "footer_note": ps("fn", "NL", 8, 11, "#6c757d", TA_CENTER, space_before=10*mm),
    "conf": ps("cf", "NB", 9, 12, "#dc3545", TA_CENTER),
    "toc": ps("toc", size=11, leading=22, color="#16213e", left_indent=8*mm),
}

def B(t): return f'<font name="NB">{t}</font>'
def EB(t): return f'<font name="NEB">{t}</font>'
def RED(t): return f'<font color="#e94560">{t}</font>'
def GR_T(t): return f'<font color="#28a745">{t}</font>'
def BL(t): return f'<font color="#0066cc">{t}</font>'


def tbl(headers, rows, widths=None, header_color=C1):
    W = 170 * mm
    if not widths:
        n = len(headers)
        widths = [W / n] * n
    th = ParagraphStyle("th", fontName="NB", fontSize=8, leading=11, textColor=white, alignment=TA_CENTER)
    td = ParagraphStyle("td", fontName="NR", fontSize=8, leading=11, textColor=HexColor("#212529"))
    data = [[Paragraph(h, th) for h in headers]]
    for row in rows:
        data.append([Paragraph(str(c), td) for c in row])
    t = Table(data, colWidths=widths, repeatRows=1)
    style_cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), header_color),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.4, BD),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, BG]),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]
    t.setStyle(TableStyle(style_cmds))
    return t


def header_footer(canvas, doc):
    canvas.saveState()
    w, h = A4
    canvas.setStrokeColor(C1)
    canvas.setLineWidth(1)
    canvas.line(20*mm, h - 15*mm, w - 20*mm, h - 15*mm)
    canvas.setFont("NL", 7)
    canvas.setFillColor(GR)
    canvas.drawString(20*mm, h - 13*mm, "VESTRA 사업계획서 v3 | 초기창업패키지 지원금 신청")
    canvas.drawRightString(w - 20*mm, h - 13*mm, "2026-03-13 | Confidential")
    canvas.setStrokeColor(BD)
    canvas.setLineWidth(0.5)
    canvas.line(20*mm, 15*mm, w - 20*mm, 15*mm)
    canvas.setFont("NR", 7)
    canvas.drawCentredString(w / 2, 10*mm, f"{doc.page}")
    canvas.restoreState()


def cover_page(canvas, doc):
    canvas.saveState()
    w, h = A4
    canvas.setFillColor(C1)
    canvas.rect(0, h - 10*mm, w, 10*mm, fill=1, stroke=0)
    canvas.rect(0, 0, w, 6*mm, fill=1, stroke=0)
    canvas.setFont("NR", 7)
    canvas.setFillColor(GR)
    canvas.drawCentredString(w / 2, 10*mm, f"{doc.page}")
    canvas.restoreState()


def build():
    out = "/Users/watchers/Desktop/vestra/docs/VESTRA_사업계획서_v3.pdf"
    doc = SimpleDocTemplate(out, pagesize=A4,
                            leftMargin=20*mm, rightMargin=20*mm,
                            topMargin=22*mm, bottomMargin=22*mm,
                            title="VESTRA 사업계획서 v3",
                            author="BMI C&S")
    story = []

    # ════ COVER ════
    story.append(Spacer(1, 35*mm))
    story.append(Paragraph("VESTRA", S["cover_title"]))
    story.append(Paragraph("AI 기반 부동산 풀체인 분석 플랫폼", S["cover_sub"]))
    story.append(Spacer(1, 5*mm))
    story.append(HRFlowable(width="35%", thickness=1, color=BD, spaceAfter=5*mm, hAlign="CENTER"))
    story.append(Paragraph("초기창업패키지 창업기업 사업계획서", ps("x", "NB", 13, 18, "#495057", TA_CENTER, space_after=8*mm)))

    for lb, vl in [("기업(예정)명", "(주)비엠아이씨엔에스"), ("아이템명", "AI 기반 부동산 풀체인 분석 플랫폼"),
                   ("작성일", "2026년 3월"), ("프로덕션 URL", "https://vestra-plum.vercel.app"),
                   ("현재 버전", "v2.3.1 (MVP 완료, 31,315 LOC)")]:
        story.append(Paragraph(f"{B(lb)}: {vl}", S["cover_info"]))

    story.append(Spacer(1, 20*mm))
    story.append(Paragraph("CONFIDENTIAL", S["conf"]))
    story.append(PageBreak())

    # ════ TOC ════
    story.append(Paragraph("목차", S["h0"]))
    toc_items = [
        "1. 문제 인식 (Problem) - 창업 아이템의 필요성",
        "2. 창업 아이템의 개발 계획",
        "3. 실현 가능성",
        "4. 성장전략 (Scale-up) - 지원금이 만드는 폭발적 성장",
        "5. 매출계획",
        "6. 마케팅 방안",
        "7. 팀 구성 및 협력 기관",
        "8. 사업추진 일정",
        "9. 지원금 사용 계획",
    ]
    for item in toc_items:
        story.append(Paragraph(item, S["toc"]))
    story.append(PageBreak())

    # ════ 일반현황 ════
    story.append(Paragraph("일반현황", S["h1"]))
    story.append(tbl(["항목", "내용"],
        [["창업아이템명", "AI 기반 부동산 풀체인 분석 플랫폼 (VESTRA)"],
         ["산출물 (협약기간 내 목표)", "플랫폼 웹 버전 v1.0 정식 출시 + B2B API 오픈 + 3사 통합 Phase 2"],
         ["직업", "IT기획"],
         ["기업(예정)명", "(주)비엠아이씨엔에스"]],
        [45*mm, 125*mm]))

    story.append(Paragraph("창업 아이템 개요", S["h2"]))
    story.append(tbl(["구분", "내용"],
        [["명칭", "VESTRA"],
         ["범주", "AI 부동산 자산 분석 / 부동산 풀체인 플랫폼 / 전자등기·법률정보 제공"],
         ["문제 인식", "부동산 정보 비대칭 (전세사기 3년간 4조 원+), 기존 플랫폼의 '정보 조회' 한계, 분석→실행 단절"],
         ["실현 가능성", "MVP v2.3.1 완료·운영 중 (31,315 LOC, 8종 독자 엔진). 지원금 투입 시 6개월 내 정식 출시"],
         ["성장전략", "3사 풀체인 통합 → 공인중개사 51만 명 대상 SaaS → 3차년도 연 120억 원 매출"]],
        [35*mm, 135*mm]))

    # ════ 1. 문제 인식 ════
    story.append(PageBreak())
    story.append(Paragraph("1. 문제 인식 (Problem) - 창업 아이템의 필요성", S["h1"]))

    story.append(Paragraph('1-1. 시장의 구조적 문제: "정보는 넘치지만, 실행은 끊긴다"', S["h2"]))
    story.append(Paragraph(
        '현재 부동산 시장은 정보 조회→AI 분석→법률 실행→사후 관리 가치사슬이 완전히 분절되어 있다.', S["body"]))

    story.append(tbl(["가치사슬 단계", "현재 상황", "문제점", "사회적 비용"],
        [["1. 데이터 수집", "국토부 API 월 1회", "1~2개월 지연", "시세 오판 손실"],
         ["2. AI 분석", "단순 시세 조회", "권리분석 부재", "전세사기 4조 원+"],
         ["3. 의사결정", "전문가 의존", "건당 50~200만 원", "개인 접근 불가"],
         ["4. 법률 실행", "오프라인 등기소", "3~5일 소요", "연 800만 건 비효율"],
         ["5. 사후 관리", "수동 (엑셀/수기)", "만료일 누락", "보증금 미회수"]],
        [35*mm, 40*mm, 45*mm, 50*mm]))

    story.append(Paragraph(
        f'{RED("핵심")}: 호갱노노, 직방 등 기존 B2C 플랫폼은 1~2단계에만 머물러 있다. '
        f'{B("VESTRA는 지원금을 통해 2~5단계 전체를 통합하는 국내 최초 풀체인 플랫폼을 구축한다.")}', S["quote"]))

    story.append(Paragraph("1-2. 부동산 거래 리스크 — 급증하는 사회적 비용", S["h2"]))
    story.append(tbl(["구분", "현황", "연간 증가율"],
        [["전세사기 피해", "최근 3년간 4조 원 이상", "매년 확대"],
         ["분쟁 조정 건수", "연 10만 건+", "15% 이상"],
         ["세무 관련 민원", "다주택/양도세 급증", "20% 이상"],
         ["부동산 민사 소송", "전체 민사 소송 상당 비중", "지속 증가"]],
        [50*mm, 70*mm, 50*mm]))

    story.append(Paragraph("1-3. 목표 시장 분석 — TAM / SAM / SOM", S["h2"]))
    story.append(tbl(["시장 구분", "규모", "산출 근거"],
        [["TAM (전체 시장)", "약 6,000조 원", "국내 부동산 자산 총액"],
         ["SAM (유효 시장)", "연 600억 원", "공인중개사 51만 명 + 자산관리 3,000개사 SaaS"],
         ["SOM (초기 확보)", "연 7.7억 원", "1차년도 B2B 500명 전환 (전환율 0.1%)"]],
        [40*mm, 45*mm, 85*mm]))

    story.append(Paragraph("1-4. 경쟁사 비교 — VESTRA의 압도적 차별화", S["h2"]))
    story.append(tbl(["기능", "호갱노노", "직방", "KB", "로앤컴", "로폼", "VESTRA"],
        [["실거래 데이터", "◎", "○", "✕", "✕", "✕", "◎ (실시간)"],
         ["AI 권리분석", "✕", "✕", "✕", "△", "△", "◎ (독자엔진)"],
         ["계약서 AI 검토", "✕", "✕", "✕", "✕", "◎", "◎ (조항별)"],
         ["세무 시뮬레이션", "✕", "✕", "✕", "✕", "✕", "◎ (3종)"],
         ["가치예측 (다변수)", "✕", "✕", "✕", "✕", "✕", "◎ (10년)"],
         ["전세보호 가이드", "✕", "✕", "✕", "✕", "✕", "◎ (6절차)"],
         ["등기 실행 연동", "✕", "✕", "✕", "✕", "✕", "◎ (등기온)"],
         ["임대 관리 연동", "✕", "✕", "✕", "✕", "✕", "◎ (ezREMS)"]],
        [35*mm, 19*mm, 19*mm, 19*mm, 19*mm, 19*mm, 40*mm]))

    # ════ 2. 개발 계획 ════
    story.append(PageBreak())
    story.append(Paragraph("2. 창업 아이템의 개발 계획", S["h1"]))

    story.append(Paragraph('2-1. 핵심 전략: "지원금이 만드는 성장 가속 엔진"', S["h2"]))
    story.append(Paragraph(
        'MVP v2.3.1이 이미 완성된 상태에서, 지원금은 \'개발\'이 아닌 \'고도화와 시장 진입 가속\'에 집중 투입된다.', S["body"]))

    # Acceleration table
    story.append(tbl(["항목", "지원금 없음 (자력)", "지원금 투입 시", "차이"],
        [["v1.0 정식 출시", "12개월 후", "6개월 후", "6개월 단축"],
         ["3사 API 통합", "18개월 후", "9개월 후", "9개월 단축"],
         ["B2B 파일럿", "10개사/연말", "30개사/6개월", "3배 가속"],
         ["분석 정확도", "97% 유지", "99.5% 달성", "NLP 투자"],
         ["첫 매출 시점", "2차년도", "1차년도 하반기", "6개월 앞당김"],
         ["BEP 도달", "4차년도", "2차년도", "2년 단축"]],
        [35*mm, 45*mm, 45*mm, 45*mm]))

    story.append(Paragraph("2-2. 현재 개발 완료 현황 (MVP v2.3.1)", S["h2"]))
    story.append(Paragraph(f'{B("핵심 기능 구현 현황 (11개 모듈 완료)")}:', S["body"]))
    story.append(tbl(["#", "기능", "상태", "설명"],
        [["1", "권리분석", "✅", "등기부 파싱 + 4단계 검증 + 리스크 스코어링 + AI 의견"],
         ["2", "계약검토", "✅", "조항별 위험도, 위험 조항 감지, 판례 인용"],
         ["3", "가치예측", "✅", "국토부 실거래가 연동, 3시나리오 (1/5/10년)"],
         ["4", "세무시뮬레이션", "✅", "취득세/양도세/종부세 (2024-2026 세율)"],
         ["5", "전세보호 허브", "✅", "6개 절차 가이드 + AI 분석 + 문서 자동생성"],
         ["6", "AI 어시스턴트", "✅", "법률 Q&A, 판례 인용, 멀티턴 대화"],
         ["7", "V-Score", "✅", "5개 정보원 가중 융합 (특허 출원 대상)"],
         ["8", "사기위험모델", "✅", "15개 특성 Gradient Boosting (특허 특징)"],
         ["9", "대시보드", "✅", "KPI, 자산 포트폴리오, 분석 이력"],
         ["10", "관리자 시스템", "✅", "RBAC, 감사 로그, ML 학습 데이터"],
         ["11", "PDF/OCR", "✅", "PDF 추출 + GPT-4o Vision 하이브리드"]],
        [10*mm, 30*mm, 12*mm, 118*mm]))

    story.append(Spacer(1, 3*mm))
    story.append(Paragraph(f'{B("독자 기술 엔진 — AI 미의존, 순수 TypeScript (특허 출원 대상 8종)")}:', S["body"]))
    story.append(tbl(["#", "엔진", "LOC", "AI 의존", "핵심 기술"],
        [["1", "등기부 파싱", "598", "없음", "비정형 한글 → 구조화 (6단계 파이프라인)"],
         ["2", "4단계 검증", "1,232", "없음", "포맷→논리→위험패턴→신뢰도 전파"],
         ["3", "리스크 스코어링", "937", "없음", "12개 위험요소, 100점 감점 모델"],
         ["4", "V-Score 융합", "850", "없음", "5개 정보원 가중 융합 + 비선형"],
         ["5", "사기위험 탐지", "680", "없음", "15개 특성 규칙 기반 앙상블"],
         ["6", "교차 분석", "292", "없음", "다중 지표 상관관계"],
         ["7", "연쇄 엔진", "180", "없음", "리스크 의존성 모델링"],
         ["8", "보증금 시뮬레이션", "342", "없음", "경매 배당 시뮬레이션"],
         ["합계", "", "5,111", "", ""]],
        [10*mm, 35*mm, 20*mm, 20*mm, 85*mm]))

    story.append(Paragraph(
        f'{RED("핵심 차별화")}: 5,111줄의 순수 TypeScript 독자 알고리즘. AI 장애 시에도 핵심 분석이 독립 작동.', S["quote"]))

    story.append(Paragraph("2-3. 지원금 투입 시 Phase별 개발 계획", S["h2"]))
    story.append(tbl(["Phase", "기간", "핵심 개발 내용", "산출물", "예산"],
        [["Phase 1", "1~2개월", "기술 고도화 + 3사 링크 연동", "V-Score 고도화, CTA 연동", "2,000만"],
         ["Phase 2", "3~4개월", "API 통합 + B2B 파일럿", "REST API, 파일럿 10개사", "3,000만"],
         ["Phase 3", "5~7개월", "통합 인증 + 결제 + v1.0", "OAuth SSO, 정식 출시", "3,000만"],
         ["Phase 4", "8~12개월", "플랫폼화 + 시장 확장", "B2B 포털, 모바일 MVP", "2,000만"],
         ["합계", "", "", "", "1억 원"]],
        [22*mm, 22*mm, 48*mm, 48*mm, 30*mm]))

    story.append(Paragraph("2-4. 풀체인 가치사슬", S["h2"]))
    story.append(tbl(["Step", "역할", "담당", "설명"],
        [["Step 1", "데이터 수집", "ezREMS", "20년 축적 실거래 DB + 실시간 임대차 정보"],
         ["Step 2", "AI 분석", "VESTRA", "권리분석, 시세전망, 위험도 평가 (8종 엔진)"],
         ["Step 3", "의사결정", "VESTRA", "분석 리포트 기반 매수/매도 판단 지원"],
         ["Step 4", "법률 실행", "등기온", "원클릭 소유권이전, 근저당, 법인등기"],
         ["Step 5", "사후 관리", "ezREMS", "임대 운영, 수납, 세금 관리"]],
        [20*mm, 30*mm, 30*mm, 90*mm]))

    # ════ 3. 실현 가능성 ════
    story.append(PageBreak())
    story.append(Paragraph("3. 실현 가능성", S["h1"]))

    story.append(Paragraph("3-1. 기술적 실현 가능성 — MVP 완료로 기술 리스크 해소", S["h2"]))
    story.append(tbl(["검증 항목", "목표", "현재 달성", "비고"],
        [["AI 분석 모듈", "7개", "11개 ✅", "목표 157% 초과"],
         ["독자 엔진", "3개", "8개 ✅", "5,111 LOC"],
         ["API 연동", "5건", "10건 ✅", "200% 초과"],
         ["분석 정확도", "95%", "96~97% ✅", "지원금으로 99.5% 목표"],
         ["DB 모델", "-", "25개 ✅", "상용 수준"],
         ["테스트", "-", "9개 파일 ✅", "커버리지 50%+"],
         ["보안", "-", "7개 헤더 + AES-256 ✅", "상용 수준"]],
        [35*mm, 30*mm, 45*mm, 60*mm]))

    story.append(Paragraph(
        f'{RED("1차년도 기술 KPI를 MVP 단계에서 이미 초과 달성")}. 지원금은 개발이 아닌 고도화·확장에 집중.', S["quote"]))

    story.append(Paragraph("3-2. 독자 엔진의 구조적 우위", S["h2"]))
    story.append(tbl(["구분", "기존 AI 서비스", "VESTRA"],
        [["핵심 분석", "LLM 전면 의존", "독자 엔진 (AI 미의존)"],
         ["AI 장애 시", "서비스 전면 중단", "핵심 분석 독립 작동"],
         ["분석 일관성", "LLM 응답 변동성", "규칙 기반 일관 결과"],
         ["법적 신뢰성", "환각 위험 높음", "검증 근거 + 출처 제시"],
         ["비용 구조", "높은 API 비용", "독자 엔진으로 비용 절감"]],
        [35*mm, 67*mm, 68*mm]))

    story.append(Paragraph("3-3. 시장 실현 가능성", S["h2"]))
    story.append(tbl(["수요 동인", "현황", "시장 규모"],
        [["전세사기 예방", "3년간 4조 원 피해", "연간 300만 건 전/월세"],
         ["전문가 업무 효율화", "공인중개사 51만 명", "연 800만 건 등기"],
         ["자산관리 DX", "AMC·법무·회계 5,000곳+", "B2B SaaS 연 20% 성장"],
         ["정부 AI 정책", "DX 가속, AI 육성 기조", "국내 AI 시장 연 20%+"]],
        [45*mm, 60*mm, 65*mm]))

    # ════ 4. 성장전략 ════
    story.append(PageBreak())
    story.append(Paragraph("4. 성장전략 (Scale-up) — 지원금이 만드는 폭발적 성장", S["h1"]))

    story.append(Paragraph("4-1. 3사 통합 풀체인 시너지", S["h2"]))
    story.append(tbl(["파트너", "역할", "핵심 자산", "시너지"],
        [["VESTRA", "AI 분석", "8종 독자 엔진, OpenAI", "분석→의사결정"],
         ["등기온 dgon", "법률 실행", "법무법인 시화, 온라인 등기", "의사결정→실행"],
         ["ezREMS", "데이터·관리", "20년 실거래 DB, 51,000+ 세대", "실행→사후관리"]],
        [30*mm, 28*mm, 55*mm, 57*mm]))

    story.append(Paragraph(f'{B("시너지 플라이휠")}:', S["body"]))
    for item in [
        "ezREMS → VESTRA: 20년 실거래 DB로 AI 분석 정확도 극대화",
        "VESTRA → 등기온: 권리분석으로 등기 전 사전 분석, 고객 이탈 방지",
        "등기온 → ezREMS: 등기 완료 즉시 정보 자동 업데이트, 관리 효율화"
    ]:
        story.append(Paragraph(f"\u2022  {item}", S["bullet"]))

    story.append(Paragraph("4-2. B2B SaaS 요금 모델", S["h2"]))
    story.append(tbl(["플랜", "월 요금", "타깃", "주요 기능"],
        [["Basic", "99,000원", "개인 공인중개사", "AI 분석 50건/월 + 등기온 5% 할인"],
         ["Professional ★", "299,000원", "중개법인·자산관리사", "AI 200건/월 + 10% 할인 + ezREMS"],
         ["Enterprise", "별도 협의", "대형 중개법인·AMC", "무제한 분석 + 15% 할인 + 전용 API"]],
        [30*mm, 28*mm, 40*mm, 72*mm]))

    story.append(Paragraph('4-3. 매출 성장 시나리오 — "J커브 성장"', S["h2"]))
    story.append(tbl(["지표", "1차년도", "2차년도", "3차년도"],
        [["B2B 유료 고객", "500명", "2,000명", "5,000명"],
         ["월 구독 매출", "6,400만 원", "3.3억 원", "10억 원"],
         ["연간 매출", "7.7억 원", "39.6억 원", "120억 원"],
         ["성장률", "-", "414%", "203%"],
         ["MAU", "5,000", "20,000", "50,000"],
         ["무료→유료 전환율", "3~5%", "5~8%", "8~10%"]],
        [40*mm, 43*mm, 43*mm, 44*mm]))

    story.append(Paragraph(
        f'{RED("보수적 가정")}: 공인중개사 51만 명 중 전환율 1% 미만으로 산출. 실제 시장 반응에 따라 상향 여지 큼.', S["quote"]))

    story.append(Paragraph("4-4. 투자 대비 효과 (ROI)", S["h2"]))
    story.append(tbl(["항목", "수치"],
        [["지원금 투입", "1억 원"],
         ["1차년도 매출", "7.7억 원"],
         ["2차년도 매출", "39.6억 원"],
         ["3차년도 매출", "120억 원"],
         ["3년 누적 매출", "167.3억 원"],
         ["ROI", "16,630%"],
         ["BEP 도달", "6개월 후 (3사 통합 시)"]],
        [50*mm, 120*mm]))

    story.append(Paragraph("4-5. 핵심 성과지표 (KPI)", S["h2"]))
    story.append(tbl(["구분", "지표", "1차년도", "2차년도", "3차년도"],
        [["기술", "AI 분석 모듈", "11개 (달성)", "13개", "15개"],
         ["", "분석 정확도", "97% (달성)", "99%", "99.5%"],
         ["", "API 연동", "10건 (달성)", "15건", "20건"],
         ["플랫폼", "3사 통합", "Phase 2", "Phase 3", "Phase 4"],
         ["사용자", "MAU", "5,000", "20,000", "50,000"],
         ["", "B2B 유료", "500", "2,000", "5,000"],
         ["매출", "연간 매출", "7.7억", "39.6억", "120억"]],
        [25*mm, 35*mm, 36*mm, 37*mm, 37*mm]))

    # ════ 5. 매출계획 ════
    story.append(PageBreak())
    story.append(Paragraph("5. 매출계획", S["h1"]))

    story.append(Paragraph("5-1. 수익모델 구조", S["h2"]))
    story.append(tbl(["구분", "내용"],
        [["주요 고객", "공인중개사, 자산관리사, 법무/회계 법인, 개인 이용자"],
         ["수익 구조", "B2B SaaS 구독 + 등기 연계 수수료 + AI API 과금 + B2C 이용권"],
         ["핵심 동력", "3사 풀체인 통합 → 고객 Lock-in → ARPU 상승"],
         ["성장 엔진", "독점 데이터(ezREMS) + 독자 AI 엔진 + 법률 실행(등기온)"]],
        [35*mm, 135*mm]))

    story.append(Paragraph("5-2. 1차년도 매출 (시장 진입)", S["h2"]))
    story.append(tbl(["구분", "단가(월)", "고객 수", "연 매출"],
        [["Basic (B2B)", "99,000원", "300명", "3.6억 원"],
         ["Professional (B2B)", "299,000원", "100명", "3.6억 원"],
         ["10회 이용권 (B2C)", "100,000원", "50명", "500만 원"],
         ["합계", "", "450명+", "7.7억 원"]],
        [40*mm, 35*mm, 35*mm, 60*mm]))

    story.append(Paragraph("5-3. 2차년도 매출 (본격 성장)", S["h2"]))
    story.append(tbl(["구분", "단가(월)", "고객 수", "연 매출"],
        [["Basic", "99,000원", "1,200명", "14.3억 원"],
         ["Professional", "299,000원", "500명", "17.9억 원"],
         ["Enterprise", "500,000원", "50곳", "3억 원"],
         ["API/데이터", "-", "-", "2.4억 원"],
         ["B2C", "-", "2,000명", "2억 원"],
         ["합계", "", "", "39.6억 원"]],
        [40*mm, 35*mm, 35*mm, 60*mm]))

    story.append(Paragraph("5-4. 손익분기점 분석", S["h2"]))
    story.append(tbl(["구분", "1차년도", "2차년도", "3차년도"],
        [["매출", "7.7억", "39.6억", "120억"],
         ["고정비", "6억", "8억", "12억"],
         ["순손익", "1.7억", "31.6억", "108억"],
         ["BEP", "도달 ✅", "흑자 확대", "대규모 흑자"]],
        [40*mm, 43*mm, 43*mm, 44*mm]))

    story.append(Paragraph(
        f'{RED("지원금 효과")}: 자력 개발 시 BEP 4차년도 → 지원금 투입 시 {B("1차년도 BEP 달성")}', S["quote"]))

    # ════ 6. 마케팅 ════
    story.append(Paragraph("6. 마케팅 방안", S["h1"]))

    story.append(Paragraph("6-1. B2B 마케팅 전략", S["h2"]))
    story.append(tbl(["구분", "내용"],
        [["핵심 타깃", "공인중개사 (51만 명), 자산관리사, 법무/회계 법인"],
         ["핵심 메시지", '"분석부터 등기까지, 하나의 플랫폼으로 끝내세요"'],
         ["차별화", "경쟁사는 정보 조회만, VESTRA는 분석→실행→관리 풀체인"],
         ["전환 방식", "데모/시범 → 파일럿 10개사 → 구독 전환"],
         ["KPI", "유료 기관 수, 계약 전환율, ARPA"]],
        [30*mm, 140*mm]))

    story.append(Paragraph("6-2. B2C 마케팅 전략", S["h2"]))
    story.append(tbl(["구분", "내용"],
        [["핵심 타깃", "전/월세 계약 예정자, 개인 투자자, 임대인"],
         ["핵심 메시지", '"계약 전 5분, AI로 리스크를 먼저 확인하세요"'],
         ["주요 채널", "부동산 커뮤니티, 콘텐츠 마케팅, 검색 유입"],
         ["전환 방식", "무료 체험 → 건별 과금 / 구독"]],
        [30*mm, 140*mm]))

    story.append(Paragraph("6-3. 전문가 실증단 기반 검증", S["h2"]))
    story.append(Paragraph(
        '지원금으로 공인중개사 10개사 + 자산관리사 5개사 대상 6개월 실증 파일럿을 운영하여, '
        '실제 분석 정확도를 검증하고 마케팅 레퍼런스를 확보한다.', S["body"]))

    # ════ 7. 팀 구성 ════
    story.append(Paragraph("7. 팀 구성 및 협력 기관", S["h1"]))

    story.append(Paragraph("7-1. 전략적 파트너십 — 풀체인 생태계", S["h2"]))
    story.append(tbl(["#", "파트너", "보유 역량", "협업 방안", "상태"],
        [["1", "제온스 (ezREMS)", "부동산 ERP, 20년 DB, 51,000+ 세대", "데이터 + 사후관리 연동", "협의 중"],
         ["2", "등기온 (dgon)", "온라인 등기, 법무법인 시화", "원클릭 등기 연동", "협의 중"],
         ["3", "MJIT", "LLM 구축 전문", "AI 모델 고도화", "협의 중"],
         ["4", "법무법인 시화", "부동산 법무 전문", "법률 자문 + 등기 검증", "확정"]],
        [10*mm, 32*mm, 55*mm, 45*mm, 28*mm]))

    # ════ 8. 사업추진 일정 ════
    story.append(Paragraph("8. 사업추진 일정", S["h1"]))
    story.append(tbl(["단계", "기간", "주요 추진 내용", "상태"],
        [["1단계 (기획/설계)", "1~2개월", "아키텍처 설계, 고객군 설정", "✅ 완료"],
         ["2단계 (데이터통합)", "3~4개월", "10개 공공 API 연동, 데이터 검증", "✅ 완료"],
         ["3단계 (AI모듈)", "5~7개월", "8종 독자 엔진 + 3종 AI 모듈", "✅ 완료"],
         ["4단계 (플랫폼)", "8~9개월", "UI/UX, API, 인증/보안, v2.3.1 배포", "✅ 완료"],
         ["5단계 (실증)", "10~11개월", "PoC 파일럿, 정확도 검증, 피드백", "🔄 진행 중"],
         ["6단계 (사업화)", "12개월", "v1.0 출시, B2B SaaS, 3사 통합", "⬜ 지원금 가속"]],
        [30*mm, 25*mm, 75*mm, 40*mm]))

    story.append(Paragraph(
        f'현재 6단계 중 4단계 완료 (67%). {B("지원금은 나머지 33%를 가속하여 6개월 내 정식 출시 달성.")}', S["quote"]))

    # ════ 9. 지원금 사용 계획 ════
    story.append(PageBreak())
    story.append(Paragraph("9. 지원금 사용 계획", S["h1"]))

    story.append(Paragraph("9-1. 예산 배분", S["h2"]))
    story.append(tbl(["항목", "금액", "비중", "상세 내용"],
        [["기술 고도화", "4,000만 원", "40%", "NLP 모델 학습, V-Score 고도화, 정확도 99.5%"],
         ["3사 통합 개발", "3,000만 원", "30%", "REST API, OAuth SSO, 데이터 스키마 통일"],
         ["B2B 파일럿", "1,500만 원", "15%", "중개사 10개사 + 자산관리사 5개사 실증"],
         ["인프라/마케팅", "1,500만 원", "15%", "서버 확장, 보안 강화, 초기 마케팅"],
         ["합계", "1억 원", "100%", ""]],
        [30*mm, 28*mm, 15*mm, 97*mm]))

    story.append(Paragraph("9-2. 지원금 투입 효과 요약", S["h2"]))
    story.append(tbl(["지표", "지원금 없음", "지원금 투입 시", "개선 효과"],
        [["정식 출시", "12개월 후", "6개월 후", "2배 가속"],
         ["1차년도 매출", "0원", "7.7억 원", "매출 창출"],
         ["BEP", "4차년도", "1차년도", "3년 단축"],
         ["3차년도 매출", "3.1억 원", "120억 원", "38배"],
         ["고용", "2명 유지", "6명 확충", "일자리 창출"],
         ["ROI", "-", "16,630%", "압도적 성과"]],
        [32*mm, 40*mm, 48*mm, 50*mm]))

    # ════ Footer ════
    story.append(Spacer(1, 10*mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BD, spaceAfter=5*mm))
    story.append(Paragraph(
        'VESTRA는 이미 31,315줄의 코드와 8종의 독자 엔진으로 MVP를 완성했다. '
        '지원금 1억 원은 "개발"이 아닌 "폭발적 성장의 방아쇠"로 사용된다. '
        '3사 풀체인 통합으로 국내 최초 분석→실행→관리 원스톱 플랫폼을 구축하고, '
        '공인중개사 51만 명 시장에서 3차년도 연 120억 원 매출을 달성한다.',
        ps("closing", "NB", 9, 14, "#1a1a2e", TA_JUSTIFY, space_after=5*mm)))

    story.append(Paragraph("프로덕션 URL: https://vestra-plum.vercel.app", S["footer_note"]))

    # Build
    doc.build(story, onFirstPage=cover_page, onLaterPages=header_footer)
    print(f"PDF 생성 완료: {out}")


if __name__ == "__main__":
    build()
