#!/usr/bin/env python3
"""
VESTRA v2.3.0 고유 알고리즘 고도화 PDCA 완료 보고서 PDF 생성기
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.units import mm, cm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.shapes import Drawing, Rect, String
import os
from datetime import datetime

# ─── 한글 폰트 등록 ───
FONT_PATH = "/System/Library/Fonts/Supplemental/AppleGothic.ttf"
pdfmetrics.registerFont(TTFont("Korean", FONT_PATH))

# ─── 색상 정의 ───
PRIMARY = HexColor("#1E3A5F")
SECONDARY = HexColor("#2E75B6")
ACCENT = HexColor("#22C55E")
LIGHT_BG = HexColor("#F0F4F8")
TABLE_HEADER = HexColor("#1E3A5F")
TABLE_ALT = HexColor("#F8FAFC")
BORDER_COLOR = HexColor("#CBD5E1")

# ─── 스타일 정의 ───
styles = getSampleStyleSheet()

def make_style(name, parent='Normal', **kwargs):
    return ParagraphStyle(name, parent=styles[parent], fontName="Korean", **kwargs)

title_style = make_style("KTitle", fontSize=28, leading=36, textColor=PRIMARY, alignment=TA_CENTER, spaceAfter=6*mm)
subtitle_style = make_style("KSubtitle", fontSize=14, leading=20, textColor=SECONDARY, alignment=TA_CENTER, spaceAfter=12*mm)
h1_style = make_style("KH1", fontSize=18, leading=24, textColor=PRIMARY, spaceBefore=10*mm, spaceAfter=5*mm)
h2_style = make_style("KH2", fontSize=14, leading=20, textColor=SECONDARY, spaceBefore=6*mm, spaceAfter=3*mm)
h3_style = make_style("KH3", fontSize=11, leading=16, textColor=PRIMARY, spaceBefore=4*mm, spaceAfter=2*mm)
body_style = make_style("KBody", fontSize=9.5, leading=15, alignment=TA_JUSTIFY, spaceAfter=2*mm)
caption_style = make_style("KCaption", fontSize=8.5, leading=12, textColor=HexColor("#64748B"), alignment=TA_CENTER, spaceBefore=2*mm, spaceAfter=4*mm)

def section_header(text):
    return Paragraph(text, h1_style)

def sub_header(text):
    return Paragraph(text, h2_style)

def sub_sub_header(text):
    return Paragraph(text, h3_style)

def body(text):
    return Paragraph(text, body_style)

def spacer(h=4):
    return Spacer(1, h*mm)

def divider():
    return HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR, spaceBefore=3*mm, spaceAfter=3*mm)

def make_table(data, col_widths=None, has_header=True):
    t = Table(data, colWidths=col_widths, repeatRows=1 if has_header else 0)
    cmds = [
        ('FONTNAME', (0, 0), (-1, -1), 'Korean'),
        ('FONTSIZE', (0, 0), (-1, -1), 8.5),
        ('LEADING', (0, 0), (-1, -1), 13),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
    ]
    if has_header:
        cmds += [
            ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER),
            ('TEXTCOLOR', (0, 0), (-1, 0), white),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
        ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            cmds.append(('BACKGROUND', (0, i), (-1, i), TABLE_ALT))
    t.setStyle(TableStyle(cmds))
    return t

def kpi_box(label, value, color=PRIMARY):
    d = Drawing(120, 55)
    d.add(Rect(0, 0, 118, 53, fillColor=HexColor("#F8FAFC"), strokeColor=color, strokeWidth=1.5, rx=4, ry=4))
    d.add(String(59, 32, value, fontSize=18, fontName="Korean", fillColor=color, textAnchor='middle'))
    d.add(String(59, 12, label, fontSize=8, fontName="Korean", fillColor=HexColor("#64748B"), textAnchor='middle'))
    return d

# ─── PDF 생성 ───
OUTPUT_PATH = "/Users/watchers/Desktop/VESTRA_고도화_완료보고서.pdf"

doc = SimpleDocTemplate(
    OUTPUT_PATH, pagesize=A4,
    topMargin=20*mm, bottomMargin=20*mm, leftMargin=18*mm, rightMargin=18*mm,
    title="VESTRA PDCA Completion Report", author="VESTRA AI Team",
)

story = []

# ═══════════════════════════════════════
# 표지
# ═══════════════════════════════════════
story.append(Spacer(1, 35*mm))

logo_style = make_style("Logo", fontSize=42, leading=50, textColor=PRIMARY, alignment=TA_CENTER, spaceAfter=3*mm)
story.append(Paragraph("VESTRA", logo_style))

tagline = make_style("Tag", fontSize=11, leading=16, textColor=HexColor("#64748B"), alignment=TA_CENTER, spaceAfter=20*mm)
story.append(Paragraph("AI-Powered Real Estate Asset Management Platform", tagline))

story.append(HRFlowable(width="60%", thickness=2, color=SECONDARY, spaceBefore=0, spaceAfter=15*mm))
story.append(Paragraph("고유 알고리즘 고도화", title_style))
story.append(Paragraph("PDCA 완료 보고서", subtitle_style))

meta = [
    ["프로젝트", "VESTRA v2.3.0"],
    ["문서 유형", "PDCA Act Phase - 완료 보고서"],
    ["작성일", datetime.now().strftime("%Y년 %m월 %d일")],
    ["근거 문서", "VESTRA_고유알고리즘_고도화_전략.docx"],
    ["배포 URL", "https://vestra-plum.vercel.app"],
]
mt = Table(meta, colWidths=[80, 300])
mt.setStyle(TableStyle([
    ('FONTNAME', (0,0), (-1,-1), 'Korean'), ('FONTSIZE', (0,0), (-1,-1), 9),
    ('LEADING', (0,0), (-1,-1), 14),
    ('TEXTCOLOR', (0,0), (0,-1), HexColor("#64748B")), ('TEXTCOLOR', (1,0), (1,-1), PRIMARY),
    ('ALIGN', (0,0), (-1,-1), 'CENTER'),
    ('TOPPADDING', (0,0), (-1,-1), 4), ('BOTTOMPADDING', (0,0), (-1,-1), 4),
]))
story.append(mt)
story.append(PageBreak())

# ═══════════════════════════════════════
# 목차
# ═══════════════════════════════════════
story.append(section_header("목차"))
story.append(divider())

toc = [("1.", "Executive Summary"), ("2.", "Plan - 계획 수립"),
       ("3.", "Do - 구현 결과"), ("4.", "Check - Gap 분석 결과"),
       ("5.", "Act - 조치 및 개선"), ("6.", "성과 지표 요약"), ("7.", "향후 로드맵")]
for num, title in toc:
    row = Table([[num, title]], colWidths=[25, 400])
    row.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,-1), 'Korean'), ('FONTSIZE', (0,0), (-1,-1), 11),
        ('TEXTCOLOR', (0,0), (0,0), SECONDARY), ('TEXTCOLOR', (1,0), (1,0), PRIMARY),
        ('TOPPADDING', (0,0), (-1,-1), 5), ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(row)
story.append(PageBreak())

# ═══════════════════════════════════════
# 1. Executive Summary
# ═══════════════════════════════════════
story.append(section_header("1. Executive Summary"))
story.append(divider())
story.append(body(
    "VESTRA v2.3.0 고유 알고리즘 고도화 프로젝트는 특허출원 가능성 확보를 위한 "
    "4대 핵심 알고리즘을 설계하고 구현하는 것을 목표로 진행되었습니다. "
    "전략 문서에서 정의한 4개 전략 중 3개를 즉시 구현하고, 1개는 인터페이스를 선정의하여 "
    "총 2,828줄의 신규 코드와 10개 핵심 파일을 생성/수정하였습니다."
))
story.append(spacer(4))

# KPI
kpi = Table(
    [[kpi_box("Gap 일치율", "100%", ACCENT), kpi_box("신규 코드", "2,828줄", SECONDARY),
      kpi_box("핵심 파일", "10개", PRIMARY), kpi_box("빌드 상태", "Pass", ACCENT)]],
    colWidths=[130,130,130,130]
)
kpi.setStyle(TableStyle([('ALIGN',(0,0),(-1,-1),'CENTER'), ('VALIGN',(0,0),(-1,-1),'MIDDLE')]))
story.append(kpi)
story.append(Paragraph("[ 핵심 성과 지표 ]", caption_style))
story.append(spacer(4))

# 4대 전략 요약
story.append(sub_header("4대 전략 실행 결과"))
story.append(make_table([
    ["전략", "내용", "실행", "구현 방식"],
    ["전략 1: V-Score", "통합 위험도 점수화", "즉시 구현", "5대 소스 가중합 + 비선형 보정"],
    ["전략 2: NLP 특화", "부동산 문서 NLP", "인터페이스", "Provider 패턴 (KR-BERT 교체 가능)"],
    ["전략 3: 크로스 연계", "기능 간 피드백 루프", "즉시 구현", "이벤트 버스 + DAG + 캐스케이드"],
    ["전략 4: 사기 예방", "전세사기 위험 예측", "즉시 구현", "15피처 앙상블 + SHAP LOO"],
], col_widths=[80, 100, 60, 150]))
story.append(PageBreak())

# ═══════════════════════════════════════
# 2. Plan
# ═══════════════════════════════════════
story.append(section_header("2. Plan - 계획 수립"))
story.append(divider())

story.append(sub_header("2-1. 프로젝트 배경"))
story.append(body(
    "VESTRA는 LLM 기반 통합 AI 부동산 자산관리 플랫폼으로, 전세 안전성 분석, "
    "권리분석, 계약서 분석, 세금 계산, 시세전망 등의 서비스를 제공합니다. "
    "특허출원 가능성 확보를 위해 기존 기능을 고도화하고, 차별화된 알고리즘을 구현할 필요가 있었습니다."
))

story.append(sub_header("2-2. 목표 설정"))
story.append(make_table([
    ["목표", "측정 기준", "목표치"],
    ["V-Score 알고리즘", "5대 소스 통합 점수화", "0-100 점수 + A-F 등급"],
    ["크로스 기능 연계", "교차 분석 규칙 수", "6개 규칙 + 이벤트 기반"],
    ["전세사기 예방 모델", "피처 수 + 기여도", "15피처 + SHAP LOO"],
    ["NLP 인터페이스", "엔티티 타입 수", "15개 + Provider 패턴"],
    ["Gap 분석 일치율", "설계 대비 구현", "100%"],
], col_widths=[115, 145, 125]))

story.append(sub_header("2-3. 구현 순서"))
story.append(make_table([
    ["Phase", "핵심 산출물", "의존성", "코드"],
    ["Phase 1", "v-score.ts, VScoreRadar.tsx", "risk-scoring", "714줄"],
    ["Phase 2", "event-bus, dependency-graph,\ncascade-engine, cross-analysis", "Phase 1", "901줄"],
    ["Phase 3", "fraud-risk-model.ts,\nFraudRiskCard.tsx", "risk-scoring", "640줄"],
    ["Phase 4", "nlp-model-interface.ts", "독립", "223줄"],
], col_widths=[55, 145, 90, 50]))
story.append(PageBreak())

# ═══════════════════════════════════════
# 3. Do - 구현 결과
# ═══════════════════════════════════════
story.append(section_header("3. Do - 구현 결과"))
story.append(divider())

# V-Score
story.append(sub_header("3-1. V-Score 통합 위험도 알고리즘 (전략 1)"))
story.append(body(
    "기존 단순 평균 방식을 5대 위험 소스 가중 복합 점수화 엔진으로 교체하였습니다. "
    "핵심 수식: V-Score = Sum(w_i x S_i) + InteractionBonus + TemporalPenalty"
))
story.append(make_table([
    ["위험 소스", "변수명", "가중치", "데이터 출처"],
    ["등기 권리관계", "registryScore", "0.30", "risk-scoring.ts"],
    ["전세가율/시세", "priceScore", "0.25", "prediction-engine.ts"],
    ["계약서 위험도", "contractScore", "0.20", "contract-analyzer.ts"],
    ["임대인 위험지표", "landlordScore", "0.15", "credit-api.ts (mock)"],
    ["지역 위험도", "regionScore", "0.10", "fraud-data-importer.ts"],
], col_widths=[90, 90, 55, 145]))
story.append(Paragraph("[ V-Score 5대 위험 소스 가중치 벡터 ]", caption_style))

story.append(sub_sub_header("비선형 상호작용 보정 (6개 규칙)"))
story.append(make_table([
    ["규칙 ID", "유형", "조건", "보정"],
    ["registry_price", "compound", "등기 + 시세 모두 고위험", "+15점"],
    ["registry_contract", "amplify", "등기 + 계약서 동시 위험", "+10점"],
    ["price_region", "amplify", "시세 불안정 + 사기다발 지역", "+8점"],
    ["landlord_registry", "amplify", "임대인 + 등기 동시 위험", "+12점"],
    ["contract_price", "mitigate", "계약서 안전 + 시세 안정", "-5점"],
    ["all_high_cascade", "compound", "3개 이상 소스 고위험", "+20점"],
], col_widths=[95, 60, 130, 50]))

story.append(spacer(3))
story.append(sub_sub_header("Explainable AI 하이브리드"))
story.append(body(
    "규칙 기반 설명 트리로 각 소스별 기여도를 결정론적으로 산출하고, "
    "LLM(GPT-4.1-mini)이 이를 자연어로 변환하는 2단계 설명 생성 방식을 적용하였습니다. "
    "UI에서는 5축 레이더 차트(SVG 기반, 외부 라이브러리 미사용)로 시각화합니다."
))

# 크로스 연계
story.append(sub_header("3-2. 크로스 기능 연계 시스템 (전략 3)"))
story.append(body(
    "분석 기능 간 상호 참조 피드백 루프를 구현하기 위해 3개 핵심 엔진을 개발하였습니다."
))
story.append(make_table([
    ["컴포넌트", "파일", "줄수", "핵심 기능"],
    ["이벤트 버스", "event-bus.ts", "123", "Per-request 인메모리 Pub/Sub"],
    ["의존성 그래프", "dependency-graph.ts", "270", "8노드 DAG + Kahn 토폴로지 정렬"],
    ["캐스케이드 엔진", "cascade-engine.ts", "219", "임계값 기반 변경 전파"],
    ["교차 분석", "cross-analysis.ts", "289", "6개 교차 분석 규칙 평가"],
], col_widths=[80, 115, 35, 155]))

story.append(sub_sub_header("6개 교차 분석 규칙"))
story.append(make_table([
    ["#", "출발", "도착", "연계 로직"],
    ["1", "권리분석", "세무", "소유권이전 이력 -> 양도세 자동 계산"],
    ["2", "시세전망", "전세보호", "시세하락 예측 시 깡투자 위험도 상향"],
    ["3", "계약서", "권리분석", "특약사항 <-> 등기부 교차 검증"],
    ["4", "전세보호", "시세전망", "전세가율 변동 -> 시세예측 피드백"],
    ["5", "세무", "AI어시스턴트", "절세 전략 -> 상담 컨텍스트"],
    ["6", "V-Score", "전체", "위험도 변동 시 관련 분석 재계산"],
], col_widths=[20, 60, 65, 225]))
story.append(PageBreak())

# 전세사기 예방
story.append(sub_header("3-3. 전세사기 예방 위험 평가 (전략 4)"))
story.append(body(
    "15개 피처를 5대 그룹으로 분류하고, 규칙 기반 앙상블로 점수화한 후 "
    "SHAP 유사 Leave-One-Out 방식으로 각 피처의 기여도를 산출합니다."
))
story.append(make_table([
    ["그룹", "피처", "가중치", "설명"],
    ["권리관계", "근저당 비율", "0.12", "총 근저당 / 매매가"],
    ["권리관계", "압류/가압류", "0.10", "압류 건수 존재 여부"],
    ["권리관계", "선순위 채권비율", "0.08", "선순위 채권 / 매매가"],
    ["시세가격", "전세가율", "0.14", "전세가 / 매매가 비율"],
    ["시세가격", "시세 변동률", "0.06", "최근 1년 시세 변동"],
    ["시세가격", "공실률", "0.04", "해당 단지 공실 비율"],
    ["임대인", "다주택 보유", "0.06", "임대인 보유 주택 수"],
    ["임대인", "법인/개인", "0.04", "법인 임대인 여부"],
    ["임대인", "세금 체납", "0.08", "세금 체납 이력"],
    ["건물지역", "건축년수", "0.03", "준공 후 경과 년수"],
    ["건물지역", "사기 발생률", "0.08", "지역 전세사기 발생률"],
    ["건물지역", "경매 발생률", "0.05", "지역 경매 진행 비율"],
    ["계약조건", "계약서 안전점수", "0.06", "계약서 분석 결과"],
    ["계약조건", "중개사 등록", "0.03", "공인중개사 등록 여부"],
    ["계약조건", "보증보험 가입", "0.03", "보증보험 가입 여부"],
], col_widths=[55, 85, 45, 175]))
story.append(Paragraph("[ 전세사기 예측 모델 15대 피처 ]", caption_style))

# NLP
story.append(sub_header("3-4. 부동산 NLP 특화 인터페이스 (전략 2)"))
story.append(body(
    "KR-BERT 파인튜닝은 10만건+ 학습 데이터 필요로 장기 R&D 과제로 분류하고, "
    "Provider 패턴 기반 인터페이스를 선정의하였습니다. 15개 부동산 특화 엔티티 타입을 정의하였습니다."
))
story.append(make_table([
    ["구분", "엔티티 유형 (15개)"],
    ["인물/기관", "소유자, 근저당권자, 임차인, 압류권자"],
    ["금액", "채권최고액, 거래금액, 전세금"],
    ["날짜", "설정일, 말소일"],
    ["권리", "권리종류, 위험요소"],
    ["부동산", "주소, 면적, 용도, 건축년도"],
], col_widths=[80, 305]))

# 13단계 파이프라인
story.append(sub_header("3-5. 13단계 통합 분석 파이프라인"))
story.append(body(
    "기존 10단계에 V-Score(11), 교차분석(12), 전세사기 위험예측(13)을 추가하여 "
    "13단계 통합 분석 파이프라인을 완성하였습니다."
))
story.append(make_table([
    ["단계", "이름", "특허", "설명"],
    ["1", "Registry Parsing", "-", "등기부등본 자체 파싱"],
    ["2", "Market Data Fetch", "-", "MOLIT 실거래 데이터 조회"],
    ["3", "Validation Engine", "-", "파싱 데이터 검증"],
    ["4", "Risk Scoring", "A", "리스크 점수화"],
    ["5", "Property Info", "-", "통합 물건 정보"],
    ["6", "Risk Analysis", "-", "통합 위험 분석"],
    ["7", "AI Opinion", "-", "OpenAI 종합 의견"],
    ["8", "Redemption Sim.", "B", "경매 배당 시뮬레이션"],
    ["9", "Confidence Prop.", "C", "신뢰도 전파"],
    ["10", "Self Verification", "H", "AI <-> 결정론 교차검증"],
    ["11", "V-Score", "H-1", "통합 위험도 산출 (신규)"],
    ["12", "Cross Analysis", "H-3", "교차 기능 분석 (신규)"],
    ["13", "Fraud Risk", "H-2", "전세사기 위험 예측 (신규)"],
], col_widths=[35, 110, 40, 185]))
story.append(Paragraph("[ analyze-unified 13단계 통합 파이프라인 ]", caption_style))
story.append(PageBreak())

# ═══════════════════════════════════════
# 4. Check
# ═══════════════════════════════════════
story.append(section_header("4. Check - Gap 분석 결과"))
story.append(divider())

story.append(sub_header("4-1. 1차 Gap 분석 (95%)"))
story.append(body(
    "초기 구현 완료 후 Gap 분석 결과 95% 일치율을 달성하였으나, 4개 미흡 항목이 발견되었습니다."
))
story.append(make_table([
    ["#", "Gap 항목", "상태", "상세 내용"],
    ["1", "교차분석 미연동", "미흡", "cross-analysis가 analyze-unified에 미연동"],
    ["2", "이벤트 버스 미연동", "미흡", "event-bus가 파이프라인에서 미사용"],
    ["3", "사기위험예측 미연동", "미흡", "fraud-risk-model이 응답에 미포함"],
    ["4", "시드 데이터 누락", "미흡", "fraud-data-importer에 riskFeatures 없음"],
], col_widths=[20, 120, 40, 200]))

story.append(spacer(5))
story.append(sub_header("4-2. 2차 Gap 분석 (100%)"))
story.append(body("4개 미흡 항목을 모두 수정하여 100% 일치율을 달성하였습니다."))
story.append(make_table([
    ["#", "Gap 항목", "조치 내용", "결과"],
    ["1", "교차분석 연동", "Stage 12 추가 (evaluateCrossAnalysis)", "완료"],
    ["2", "이벤트 버스 연동", "createEventBus() + emit() 삽입", "완료"],
    ["3", "사기위험예측 연동", "Stage 13 추가 (predictFraudRisk)", "완료"],
    ["4", "시드 데이터", "16건 전체에 피처 벡터 추가", "완료"],
], col_widths=[20, 105, 195, 40]))

story.append(spacer(5))
story.append(make_table([
    ["구분", "1차 분석", "2차 분석", "변동"],
    ["Gap 일치율", "95%", "100%", "+5%p"],
    ["미흡 항목", "4건", "0건", "-4건"],
    ["빌드 상태", "Pass", "Pass", "-"],
], col_widths=[100, 90, 90, 70]))
story.append(PageBreak())

# ═══════════════════════════════════════
# 5. Act
# ═══════════════════════════════════════
story.append(section_header("5. Act - 조치 및 개선"))
story.append(divider())

story.append(sub_header("5-1. 수행된 조치"))
story.append(make_table([
    ["조치", "수정 파일", "변경 내용"],
    ["Stage 12 추가", "analyze-unified/route.ts", "evaluateCrossAnalysis() + 응답 필드"],
    ["Stage 13 추가", "analyze-unified/route.ts", "predictFraudRisk() + 응답 필드"],
    ["이벤트 버스 삽입", "analyze-unified/route.ts", "createEventBus() + emit() + eventLog"],
    ["피처 벡터 추가", "fraud-data-importer.ts", "16건에 riskFeatures 추가"],
], col_widths=[85, 140, 160]))

story.append(sub_header("5-2. 배포 이력"))
story.append(make_table([
    ["커밋", "메시지", "날짜"],
    ["ae1a37a", "feat: 고유 알고리즘 고도화 (V-Score, 크로스연계, 사기예방, NLP)", "2026-03-11"],
    ["e51da33", "fix: Gap 100% 달성 (교차분석/이벤트버스/사기위험도 통합)", "2026-03-11"],
], col_widths=[60, 250, 70]))
story.append(spacer(3))
story.append(body("Git push 후 Vercel 자동 배포로 프로덕션에 즉시 반영되었습니다."))
story.append(PageBreak())

# ═══════════════════════════════════════
# 6. 성과 지표
# ═══════════════════════════════════════
story.append(section_header("6. 성과 지표 요약"))
story.append(divider())

story.append(sub_header("6-1. 파일별 코드 규모"))
story.append(make_table([
    ["파일", "유형", "줄수", "비고"],
    ["lib/v-score.ts", "신규", "541", "V-Score 핵심 알고리즘"],
    ["lib/fraud-risk-model.ts", "신규", "487", "전세사기 위험 예측"],
    ["lib/cross-analysis.ts", "신규", "289", "6개 교차 분석 규칙"],
    ["lib/dependency-graph.ts", "신규", "270", "DAG 의존성 관리"],
    ["lib/nlp-model-interface.ts", "신규", "223", "NLP Provider 인터페이스"],
    ["lib/cascade-engine.ts", "신규", "219", "캐스케이드 엔진"],
    ["results/VScoreRadar.tsx", "신규", "173", "5축 레이더 차트"],
    ["results/FraudRiskCard.tsx", "신규", "153", "사기 위험도 카드"],
    ["lib/event-bus.ts", "신규", "123", "이벤트 버스"],
    ["api/analyze-unified/route.ts", "수정", "350", "13단계 파이프라인"],
    ["합계", "", "2,828", "신규 10개 파일"],
], col_widths=[150, 40, 40, 145]))

story.append(spacer(5))
story.append(sub_header("6-2. 특허 기술 요소 매핑"))
story.append(make_table([
    ["ID", "기술 요소", "구현 파일", "핵심 차별점"],
    ["H-1", "V-Score 통합 점수화", "v-score.ts", "이질적 데이터 비선형 통합"],
    ["H-2", "전세사기 위험 예측", "fraud-risk-model.ts", "SHAP LOO 기여도 분석"],
    ["H-3", "교차 기능 연계", "cross-analysis.ts 외 3개", "DAG + 이벤트 피드백 루프"],
    ["H-4", "부동산 특화 NLP", "nlp-model-interface.ts", "15 엔티티 + Provider 패턴"],
], col_widths=[35, 105, 120, 130]))
story.append(PageBreak())

# ═══════════════════════════════════════
# 7. 향후 로드맵
# ═══════════════════════════════════════
story.append(section_header("7. 향후 로드맵"))
story.append(divider())

story.append(make_table([
    ["단계", "기간", "내용", "우선순위"],
    ["Phase A", "2026 Q2", "KR-BERT 파인튜닝 데이터셋 구축 (10만건+)", "높음"],
    ["Phase B", "2026 Q2-Q3", "ML 기반 전세사기 예측 (XGBoost/LightGBM)", "높음"],
    ["Phase C", "2026 Q3", "실시간 모니터링 (DB 변경 감지 + Push)", "중간"],
    ["Phase D", "2026 Q3-Q4", "KR-BERT NER/RE 모델 배포", "중간"],
    ["Phase E", "2026 Q4", "특허출원서 작성 및 제출", "높음"],
], col_widths=[55, 75, 195, 55]))

story.append(spacer(15))
story.append(divider())
story.append(spacer(5))

sign = make_style("Sign", fontSize=10, leading=16, textColor=PRIMARY, alignment=TA_CENTER)
story.append(Paragraph("VESTRA AI Team", sign))
story.append(Paragraph(datetime.now().strftime("%Y년 %m월 %d일"), caption_style))

# ─── Build ───
doc.build(story)
print(f"PDF 생성 완료: {OUTPUT_PATH}")
print(f"파일 크기: {os.path.getsize(OUTPUT_PATH):,} bytes")
