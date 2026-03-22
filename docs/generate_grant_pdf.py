#!/usr/bin/env python3
"""VESTRA 초기창업패키지 신청서 PDF 생성 - 4대 평가항목 매핑 버전"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os

# ── Fonts ──
FD = "/Users/watchers/Library/Fonts"
pdfmetrics.registerFont(TTFont("NR", f"{FD}/NanumSquareR.ttf"))
pdfmetrics.registerFont(TTFont("NB", f"{FD}/NanumSquareB.ttf"))
pdfmetrics.registerFont(TTFont("NEB", f"{FD}/NanumSquareEB.ttf"))
pdfmetrics.registerFont(TTFont("NL", f"{FD}/NanumSquareL.ttf"))

# ── Colors ──
C1 = HexColor("#1a1a2e")   # primary dark
C2 = HexColor("#16213e")   # accent
C3 = HexColor("#0f3460")   # blue
C4 = HexColor("#e94560")   # red accent
C5 = HexColor("#2d6a4f")   # green
BG = HexColor("#f8f9fa")
BD = HexColor("#dee2e6")
GR = HexColor("#6c757d")
EVAL_BG = HexColor("#e8f0fe")  # light blue for evaluation headers
EVAL_BD = HexColor("#1967d2")  # blue border for evaluation sections

W, H = A4
MARGIN = 20 * mm

# ── Styles ──
s_cover_title = ParagraphStyle("ct", fontName="NEB", fontSize=28, textColor=white, alignment=TA_CENTER, leading=36)
s_cover_sub = ParagraphStyle("cs", fontName="NB", fontSize=14, textColor=HexColor("#a8dadc"), alignment=TA_CENTER, leading=20)
s_cover_info = ParagraphStyle("ci", fontName="NR", fontSize=11, textColor=HexColor("#e0e0e0"), alignment=TA_CENTER, leading=16)

s_h1 = ParagraphStyle("h1", fontName="NEB", fontSize=18, textColor=C1, spaceBefore=16, spaceAfter=10, leading=24)
s_h2 = ParagraphStyle("h2", fontName="NEB", fontSize=14, textColor=C3, spaceBefore=12, spaceAfter=6, leading=20)
s_h3 = ParagraphStyle("h3", fontName="NB", fontSize=11, textColor=C2, spaceBefore=8, spaceAfter=4, leading=16)
s_body = ParagraphStyle("body", fontName="NR", fontSize=9, textColor=C1, leading=14, alignment=TA_JUSTIFY)
s_small = ParagraphStyle("small", fontName="NR", fontSize=8, textColor=GR, leading=11)
s_quote = ParagraphStyle("quote", fontName="NB", fontSize=9, textColor=C3, leading=13, leftIndent=10, borderWidth=2, borderColor=C3, borderPadding=6, backColor=HexColor("#eef4ff"))
s_toc = ParagraphStyle("toc", fontName="NR", fontSize=10, textColor=C1, leading=18)
s_toc_h = ParagraphStyle("toch", fontName="NEB", fontSize=12, textColor=C3, leading=20)

# Evaluation section header style
s_eval = ParagraphStyle("eval", fontName="NEB", fontSize=16, textColor=EVAL_BD, spaceBefore=14, spaceAfter=8, leading=22)

# Table cell styles
s_tc = ParagraphStyle("tc", fontName="NR", fontSize=8, textColor=C1, leading=11, alignment=TA_CENTER)
s_tc_l = ParagraphStyle("tcl", fontName="NR", fontSize=8, textColor=C1, leading=11)
s_tc_b = ParagraphStyle("tcb", fontName="NB", fontSize=8, textColor=C1, leading=11)
s_tc_bc = ParagraphStyle("tcbc", fontName="NB", fontSize=8, textColor=C1, leading=11, alignment=TA_CENTER)
s_tc_r = ParagraphStyle("tcr", fontName="NB", fontSize=8, textColor=C4, leading=11)

def tbl(text, style=None):
    """Wrap text in Paragraph for table cells."""
    return Paragraph(str(text), style or s_tc_l)

def B(text, style=None):
    return Paragraph(f"<b>{text}</b>", style or s_tc_b)

def RED(text):
    return Paragraph(f'<font color="#e94560"><b>{text}</b></font>', s_tc_l)

def GREEN(text):
    return Paragraph(f'<font color="#2d6a4f"><b>{text}</b></font>', s_tc_l)

def std_ts(rows, col_widths=None):
    """Standard table style."""
    ts = [
        ('BACKGROUND', (0, 0), (-1, 0), C1),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'NB'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, BD),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]
    for i in range(1, len(rows)):
        if i % 2 == 0:
            ts.append(('BACKGROUND', (0, i), (-1, i), BG))
    return ts

def make_table(header, data, col_widths=None):
    """Create a styled table."""
    all_rows = [header] + data
    w = col_widths or [W - 2 * MARGIN - 2]
    t = Table(all_rows, colWidths=w, repeatRows=1)
    t.setStyle(TableStyle(std_ts(all_rows)))
    return t

def kv_table(pairs, key_w=35*mm, val_w=None):
    """Key-value pair table."""
    vw = val_w or (W - 2 * MARGIN - key_w - 2)
    rows = []
    for k, v in pairs:
        rows.append([B(k, s_tc_bc), tbl(v)])
    t = Table(rows, colWidths=[key_w, vw])
    ts = [
        ('BACKGROUND', (0, 0), (0, -1), HexColor("#f0f4f8")),
        ('GRID', (0, 0), (-1, -1), 0.5, BD),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]
    t.setStyle(TableStyle(ts))
    return t

def eval_header(num, title, subtitle):
    """Create evaluation section header with blue accent."""
    header_text = f"【평가항목 {num}】 {title}"
    sub_text = subtitle
    rows = [[Paragraph(f'<font color="#1967d2"><b>{header_text}</b></font>',
                        ParagraphStyle("eh", fontName="NEB", fontSize=14, leading=20, textColor=EVAL_BD)),
             Paragraph(f'<font color="#666666">{sub_text}</font>',
                        ParagraphStyle("es", fontName="NR", fontSize=9, leading=13, textColor=GR, alignment=TA_RIGHT))]]
    tw = W - 2*MARGIN - 2
    t = Table(rows, colWidths=[tw*0.65, tw*0.35])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), EVAL_BG),
        ('LINEBELOW', (0, 0), (-1, 0), 2, EVAL_BD),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    return t

# ── Header / Footer ──
def header_footer(canvas, doc):
    canvas.saveState()
    # Header
    canvas.setFont("NB", 8)
    canvas.setFillColor(C3)
    canvas.drawString(MARGIN, H - 12*mm, "VESTRA — 초기창업패키지 사업계획서")
    canvas.setFont("NR", 7)
    canvas.setFillColor(GR)
    canvas.drawRightString(W - MARGIN, H - 12*mm, "CONFIDENTIAL")
    canvas.setStrokeColor(BD)
    canvas.setLineWidth(0.5)
    canvas.line(MARGIN, H - 14*mm, W - MARGIN, H - 14*mm)
    # Footer
    canvas.line(MARGIN, 14*mm, W - MARGIN, 14*mm)
    canvas.setFont("NR", 7)
    canvas.setFillColor(GR)
    canvas.drawString(MARGIN, 10*mm, "© 2026 (주)비엠아이씨엔에스 — AI 기반 부동산 풀체인 분석 플랫폼")
    canvas.drawRightString(W - MARGIN, 10*mm, f"Page {doc.page}")
    canvas.restoreState()

def build():
    out = "/Users/watchers/Desktop/vestra/docs/VESTRA_초기창업패키지_신청서.pdf"
    doc = SimpleDocTemplate(out, pagesize=A4,
                            topMargin=18*mm, bottomMargin=18*mm,
                            leftMargin=MARGIN, rightMargin=MARGIN)
    story = []
    tw = W - 2*MARGIN - 2  # total width

    # ═══════════════════════════════════════════
    # COVER PAGE
    # ═══════════════════════════════════════════
    story.append(Spacer(1, 40*mm))

    # Cover box
    cover_data = [
        [Paragraph("", s_cover_title)],  # spacer row
        [Paragraph("초기창업패키지", s_cover_title)],
        [Paragraph("창업기업 사업계획서", ParagraphStyle("ct2", fontName="NEB", fontSize=22, textColor=HexColor("#a8dadc"), alignment=TA_CENTER, leading=30))],
        [Paragraph("", s_cover_sub)],
        [Paragraph("AI 기반 부동산 풀체인 분석 플랫폼", s_cover_sub)],
        [Paragraph("VESTRA", ParagraphStyle("logo", fontName="NEB", fontSize=36, textColor=white, alignment=TA_CENTER, leading=48))],
        [Paragraph("", s_cover_sub)],
        [Paragraph("분석 → 의사결정 → 법률실행 → 사후관리", s_cover_info)],
        [Paragraph("국내 최초 풀체인 원스톱 플랫폼", s_cover_info)],
        [Paragraph("", s_cover_info)],
        [Paragraph("(주)비엠아이씨엔에스", s_cover_info)],
        [Paragraph("2026년 3월", s_cover_info)],
        [Paragraph("", s_cover_info)],
    ]
    ct = Table(cover_data, colWidths=[tw])
    ct.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), C1),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 20),
        ('RIGHTPADDING', (0, 0), (-1, -1), 20),
        ('ROUNDEDCORNERS', [8, 8, 8, 8]),
    ]))
    story.append(ct)
    story.append(PageBreak())

    # ═══════════════════════════════════════════
    # TABLE OF CONTENTS
    # ═══════════════════════════════════════════
    story.append(Paragraph("목차", s_h1))
    story.append(Spacer(1, 4*mm))

    toc_items = [
        ("일반현황", ""),
        ("창업 아이템 개요(요약)", ""),
        ("【평가항목 1】 문제 인식", "창업 아이템의 개발 동기 및 필요성"),
        ("【평가항목 2】 실현 가능성", "창업 아이템의 구체화 계획"),
        ("【평가항목 3】 성장전략", "차별성·수익모델·시장 확장 전략"),
        ("【평가항목 4】 팀 구성", "대표자 및 인력의 역량"),
        ("사업추진 일정", ""),
        ("지원금 사용 계획", ""),
    ]

    for i, (title, sub) in enumerate(toc_items, 1):
        if sub:
            story.append(Paragraph(f"<b>{i}. {title}</b>  <font color='#6c757d' size='8'>— {sub}</font>", s_toc_h if "평가항목" in title else s_toc))
        else:
            story.append(Paragraph(f"{i}. {title}", s_toc))

    # Evaluation criteria summary box
    story.append(Spacer(1, 8*mm))
    story.append(Paragraph("평가항목 구성 (4대 평가기준)", s_h3))
    eval_summary = [
        [B("평가항목", s_tc_bc), B("세부 내용", s_tc_bc), B("배점 비중", s_tc_bc)],
        [tbl("문제인식"), tbl("창업 아이템의 개발 배경 및 필요성"), tbl("★★★★")],
        [tbl("실현가능성"), tbl("사업기간 내 개발 또는 구체화 계획"), tbl("★★★★★")],
        [tbl("성장전략"), tbl("차별성, 수익모델, 자금조달 방안"), tbl("★★★★")],
        [tbl("팀(기업) 구성"), tbl("대표자 및 인력의 기술 역량과 노하우"), tbl("★★★")],
    ]
    et = Table(eval_summary, colWidths=[tw*0.2, tw*0.55, tw*0.25])
    et.setStyle(TableStyle(std_ts(eval_summary)))
    story.append(et)
    story.append(PageBreak())

    # ═══════════════════════════════════════════
    # 일반현황
    # ═══════════════════════════════════════════
    story.append(Paragraph("일반현황", s_h1))
    story.append(kv_table([
        ("창업아이템명", "AI 기반 부동산 풀체인 분석 플랫폼 (VESTRA)"),
        ("산출물", "플랫폼 정식 출시 (v1.0) + B2B API 오픈 + 3사 통합 Phase 2 완료"),
        ("업종", "소프트웨어 개발업 (정보통신업)"),
        ("기업(예정)명", "(주)비엠아이씨엔에스"),
        ("사업분야", "AI / 프롭테크"),
    ]))
    story.append(Spacer(1, 6*mm))

    # 팀 구성 현황
    story.append(Paragraph("팀 구성 현황 (대표자 본인 제외)", s_h3))
    team_h = [B("순번", s_tc_bc), B("직위", s_tc_bc), B("담당 업무", s_tc_bc), B("보유 역량", s_tc_bc), B("구성 상태", s_tc_bc)]
    team_d = [
        [tbl("1", s_tc), tbl(""), tbl(""), tbl(""), tbl("")],
        [tbl("2", s_tc), tbl(""), tbl(""), tbl(""), tbl("")],
        [tbl("3", s_tc), tbl(""), tbl(""), tbl(""), tbl("")],
    ]
    story.append(make_table(team_h, team_d, [tw*0.08, tw*0.12, tw*0.25, tw*0.40, tw*0.15]))
    story.append(Spacer(1, 6*mm))

    # ═══════════════════════════════════════════
    # 창업 아이템 개요
    # ═══════════════════════════════════════════
    story.append(Paragraph("창업 아이템 개요(요약)", s_h1))
    story.append(kv_table([
        ("명칭", "VESTRA — AI 부동산 풀체인 분석 플랫폼"),
        ("범주", "AI 부동산 자산 분석 / 풀체인 플랫폼 / 전자등기·법률정보"),
        ("아이템 개요", "AI 독자 엔진 기반 권리분석·계약검토·세무시뮬레이션·가치예측 수행, 등기온(법률실행)·ezREMS(데이터/관리) 연동으로 국내 최초 풀체인 B2B SaaS 플랫폼"),
    ]))
    story.append(Spacer(1, 4*mm))

    overview_h = [B("구분", s_tc_bc), B("핵심 내용", s_tc_bc)]
    overview_d = [
        [B("문제 인식"), tbl("부동산 시장 정보 비대칭 (전세사기 3년간 4조 원+), 기존 플랫폼의 정보 조회 한계, 분석→실행 단절")],
        [B("실현 가능성"), tbl("MVP v2.3.1 운영 중 (31,315 LOC, 8종 독자 엔진, 49개 API). 지원금 투입 시 6개월 내 정식 출시")],
        [B("성장 전략"), tbl("풀체인 통합 → 공인중개사 51만 명 대상 SaaS → 3차년도 연 120억 원 매출")],
        [B("팀 역량"), tbl("AI/풀스택 대표 + 3사 파트너십 (등기온·ezREMS·법무법인 시화) 확보")],
    ]
    story.append(make_table(overview_h, overview_d, [tw*0.18, tw*0.82]))
    story.append(PageBreak())

    # ═══════════════════════════════════════════
    # 【평가항목 1】 문제 인식
    # ═══════════════════════════════════════════
    story.append(eval_header(1, "문제 인식", "창업 아이템의 개발 동기 및 필요성"))
    story.append(Spacer(1, 4*mm))

    # 1-1
    story.append(Paragraph("1-1. 시장의 구조적 문제: 가치사슬 분절", s_h2))
    story.append(Paragraph("현재 부동산 시장은 정보 조회→AI 분석→법률 실행→사후 관리 가치사슬이 완전히 분절되어 있다.", s_body))
    story.append(Spacer(1, 2*mm))

    vc_h = [B("가치사슬 단계", s_tc_bc), B("현재 상황", s_tc_bc), B("문제점", s_tc_bc), B("사회적 비용", s_tc_bc)]
    vc_d = [
        [B("1. 데이터 수집"), tbl("국토부 API 월 1회"), tbl("1~2개월 지연"), tbl("시세 오판 손실")],
        [B("2. AI 분석"), tbl("단순 시세 조회"), tbl("권리분석·리스크 부재"), RED("전세사기 4조 원+")],
        [B("3. 의사결정"), tbl("전문가 의존"), tbl("50~200만 원/건"), tbl("소상공인 접근 불가")],
        [B("4. 법률 실행"), tbl("오프라인 등기소"), tbl("평균 3~5일"), tbl("연 800만 건 비효율")],
        [B("5. 사후 관리"), tbl("수동 관리(엑셀)"), tbl("만료일 누락"), tbl("보증금 미회수")],
    ]
    story.append(make_table(vc_h, vc_d, [tw*0.20, tw*0.25, tw*0.28, tw*0.27]))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph("핵심 인사이트: 호갱노노, 직방 등 기존 플랫폼은 1~2단계에만 머물러 있다. VESTRA는 2~5단계 전체를 통합하는 국내 최초 풀체인 플랫폼을 구축한다.", s_quote))
    story.append(Spacer(1, 4*mm))

    # 1-2 리스크
    story.append(Paragraph("1-2. 부동산 거래 리스크 — 급증하는 사회적 비용", s_h2))
    risk_h = [B("구분", s_tc_bc), B("현황", s_tc_bc), B("연간 증가율", s_tc_bc)]
    risk_d = [
        [tbl("전세사기 피해"), RED("최근 3년간 4조 원 이상"), tbl("매년 확대")],
        [tbl("분쟁 조정 건수"), tbl("연 10만 건+"), tbl("15% 이상")],
        [tbl("세무 관련 민원"), tbl("다주택/양도세 민원 급증"), tbl("20% 이상")],
    ]
    story.append(make_table(risk_h, risk_d, [tw*0.30, tw*0.40, tw*0.30]))
    story.append(Spacer(1, 4*mm))

    # 1-3 TAM/SAM/SOM
    story.append(Paragraph("1-3. 목표 시장 분석 — TAM/SAM/SOM", s_h2))
    mkt_h = [B("시장 구분", s_tc_bc), B("규모", s_tc_bc), B("산출 근거", s_tc_bc)]
    mkt_d = [
        [B("TAM (전체 시장)"), RED("약 6,000조 원"), tbl("국내 부동산 자산 총액")],
        [B("SAM (유효 시장)"), tbl("연 600억 원"), tbl("공인중개사 51만 명 + 자산관리 3,000개사 대상 SaaS")],
        [B("SOM (초기 확보)"), tbl("연 7.7억 원"), tbl("1차년도 B2B 500명 전환 (전환율 0.1%)")],
    ]
    story.append(make_table(mkt_h, mkt_d, [tw*0.22, tw*0.22, tw*0.56]))
    story.append(Spacer(1, 4*mm))

    # 1-4 경쟁사 비교
    story.append(Paragraph("1-4. 경쟁사 비교 — VESTRA의 차별화", s_h2))
    comp_h = [B("기능", s_tc_bc), B("호갱노노", s_tc_bc), B("직방", s_tc_bc), B("KB마이데이터", s_tc_bc), B("로앤컴", s_tc_bc), B("VESTRA", s_tc_bc)]
    comp_d = [
        [tbl("실거래 데이터"), tbl("◎", s_tc), tbl("○", s_tc), tbl("✕", s_tc), tbl("✕", s_tc), RED("◎")],
        [B("AI 권리분석"), tbl("✕", s_tc), tbl("✕", s_tc), tbl("✕", s_tc), tbl("△", s_tc), RED("◎ (독자 엔진)")],
        [B("계약서 AI 검토"), tbl("✕", s_tc), tbl("✕", s_tc), tbl("✕", s_tc), tbl("✕", s_tc), RED("◎")],
        [B("세무 시뮬레이션"), tbl("✕", s_tc), tbl("✕", s_tc), tbl("✕", s_tc), tbl("✕", s_tc), RED("◎")],
        [B("가치예측"), tbl("✕", s_tc), tbl("✕", s_tc), tbl("✕", s_tc), tbl("✕", s_tc), RED("◎")],
        [B("등기 실행 연동"), tbl("✕", s_tc), tbl("✕", s_tc), tbl("✕", s_tc), tbl("✕", s_tc), RED("◎ (등기온)")],
        [B("임대 관리 연동"), tbl("✕", s_tc), tbl("✕", s_tc), tbl("✕", s_tc), tbl("✕", s_tc), RED("◎ (ezREMS)")],
        [tbl("타깃"), tbl("B2C", s_tc), tbl("B2C", s_tc), tbl("B2C", s_tc), tbl("B2C", s_tc), RED("B2B+B2C")],
    ]
    ct2 = make_table(comp_h, comp_d, [tw*0.18, tw*0.13, tw*0.10, tw*0.14, tw*0.13, tw*0.32])
    story.append(ct2)
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph("결론: 경쟁사 중 '분석→실행→관리' 풀체인을 제공하는 서비스는 전무하다.", s_quote))
    story.append(Spacer(1, 4*mm))

    # 1-5 SWOT
    story.append(Paragraph("1-5. SWOT 분석", s_h2))
    swot_h = [B("", s_tc_bc), B("긍정적", s_tc_bc), B("부정적", s_tc_bc)]
    swot_d = [
        [B("내부"), tbl("S: 8종 독자 엔진 (5,111 LOC), MVP v2.3.1 배포 운영 중, 3사 파트너십 확보"), tbl("W: 초기 브랜드 인지도 부족, 소규모 팀")],
        [B("외부"), tbl("O: 전세사기 급증→검증 수요 폭발, 정부 AI·DX 정책, B2B 프롭테크 연 20% 성장"), tbl("T: 대형 플랫폼 유사 서비스 진입, 법/제도 변화 리스크")],
    ]
    story.append(make_table(swot_h, swot_d, [tw*0.10, tw*0.50, tw*0.40]))
    story.append(PageBreak())

    # ═══════════════════════════════════════════
    # 【평가항목 2】 실현 가능성
    # ═══════════════════════════════════════════
    story.append(eval_header(2, "실현 가능성", "창업 아이템의 구체화 계획"))
    story.append(Spacer(1, 4*mm))

    # 2-1 기술적 실현 가능성
    story.append(Paragraph("2-1. 기술적 실현 가능성 — MVP 완료로 기술 리스크 해소", s_h2))
    tech_h = [B("검증 항목", s_tc_bc), B("목표", s_tc_bc), B("현재 달성", s_tc_bc), B("비고", s_tc_bc)]
    tech_d = [
        [tbl("AI 분석 모듈"), tbl("7개", s_tc), GREEN("11개 ✅"), tbl("목표 157% 초과")],
        [tbl("독자 엔진"), tbl("3개", s_tc), GREEN("8개 ✅"), tbl("5,111 LOC (AI 미의존)")],
        [tbl("API 연동"), tbl("5건", s_tc), GREEN("10건 ✅"), tbl("200% 초과")],
        [tbl("분석 정확도"), tbl("95%", s_tc), GREEN("96~97% ✅"), tbl("지원금으로 99.5% 목표")],
        [tbl("DB 모델"), tbl("-"), GREEN("25개 ✅"), tbl("상용 수준")],
        [tbl("보안"), tbl("-"), GREEN("7개 헤더+AES-256 ✅"), tbl("상용 수준")],
    ]
    story.append(make_table(tech_h, tech_d, [tw*0.20, tw*0.15, tw*0.30, tw*0.35]))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph("1차년도 기술 KPI를 MVP 단계에서 이미 초과 달성. 지원금은 '개발'이 아닌 '고도화·확장'에 집중 투입된다.", s_quote))
    story.append(Spacer(1, 4*mm))

    # 2-2 핵심 기능
    story.append(Paragraph("2-2. 핵심 기능 구현 현황 (11개 모듈 완료)", s_h2))
    func_h = [B("#", s_tc_bc), B("기능", s_tc_bc), B("상태", s_tc_bc), B("설명", s_tc_bc), B("LOC", s_tc_bc)]
    func_d = [
        [tbl("1", s_tc), B("권리분석"), GREEN("✅"), tbl("등기부등본 자동 파싱+4단계 검증+리스크 스코어링"), tbl("2,767", s_tc)],
        [tbl("2", s_tc), B("계약검토"), GREEN("✅"), tbl("조항별 위험도 분석, 판례 인용"), tbl("597", s_tc)],
        [tbl("3", s_tc), B("가치예측"), GREEN("✅"), tbl("국토부 실거래가 연동, 3시나리오 분석"), tbl("879", s_tc)],
        [tbl("4", s_tc), B("세무시뮬레이션"), GREEN("✅"), tbl("취득세/양도세/종부세 자동 계산"), tbl("334", s_tc)],
        [tbl("5", s_tc), B("전세보호 허브"), GREEN("✅"), tbl("6개 행정절차 가이드+법적 문서 자동생성"), tbl("1,200+", s_tc)],
        [tbl("6", s_tc), B("AI 어시스턴트"), GREEN("✅"), tbl("법률 Q&A 챗봇, 판례 자동 인용"), tbl("800+", s_tc)],
        [tbl("7", s_tc), B("V-Score"), GREEN("✅"), tbl("5개 정보원 가중 융합 통합 위험 지수"), tbl("850", s_tc)],
        [tbl("8", s_tc), B("사기위험모델"), GREEN("✅"), tbl("15개 특성 Gradient Boosting 시뮬레이션"), tbl("680", s_tc)],
        [tbl("9", s_tc), B("대시보드"), GREEN("✅"), tbl("KPI 카드, 자산 포트폴리오"), tbl("600+", s_tc)],
        [tbl("10", s_tc), B("관리자 시스템"), GREEN("✅"), tbl("RBAC, 감사 로그, ML 관리"), tbl("2,000+", s_tc)],
        [tbl("11", s_tc), B("PDF/OCR"), GREEN("✅"), tbl("PDF+GPT-4o Vision 하이브리드"), tbl("400+", s_tc)],
    ]
    story.append(make_table(func_h, func_d, [tw*0.06, tw*0.16, tw*0.08, tw*0.56, tw*0.14]))
    story.append(Spacer(1, 4*mm))

    # 2-3 독자 엔진
    story.append(Paragraph("2-3. 독자 기술 엔진 — 순수 TypeScript, AI 미의존 (특허 출원 대상 8종)", s_h2))
    eng_h = [B("#", s_tc_bc), B("엔진", s_tc_bc), B("LOC", s_tc_bc), B("AI 의존", s_tc_bc), B("핵심 기술", s_tc_bc)]
    eng_d = [
        [tbl("1", s_tc), tbl("등기부 파싱"), tbl("598", s_tc), RED("없음"), tbl("비정형 한글→구조화 (6단계 파이프라인)")],
        [tbl("2", s_tc), tbl("4단계 검증"), tbl("1,232", s_tc), RED("없음"), tbl("포맷→논리→위험패턴→신뢰도 전파")],
        [tbl("3", s_tc), tbl("리스크 스코어링"), tbl("937", s_tc), RED("없음"), tbl("12개 위험요소, 100점 감점 모델")],
        [tbl("4", s_tc), tbl("V-Score 융합"), tbl("850", s_tc), RED("없음"), tbl("5개 정보원 가중 융합+비선형 상호작용")],
        [tbl("5", s_tc), tbl("사기위험 탐지"), tbl("680", s_tc), RED("없음"), tbl("15개 특성 규칙 기반 앙상블")],
        [tbl("6", s_tc), tbl("교차 분석"), tbl("292", s_tc), RED("없음"), tbl("다중 지표 상관관계")],
        [tbl("7", s_tc), tbl("연쇄 엔진"), tbl("180", s_tc), RED("없음"), tbl("리스크 의존성 모델링")],
        [tbl("8", s_tc), tbl("보증금 시뮬레이션"), tbl("342", s_tc), RED("없음"), tbl("경매 배당 시뮬레이션")],
        [B(""), B("합계"), B("5,111", s_tc_bc), B(""), B("")],
    ]
    story.append(make_table(eng_h, eng_d, [tw*0.06, tw*0.18, tw*0.10, tw*0.12, tw*0.54]))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph("AI 장애 시에도 핵심 분석이 독립 작동하며, LLM 비용 의존도를 최소화한다.", s_quote))
    story.append(Spacer(1, 4*mm))

    # 2-4 환각 최소화
    story.append(Paragraph("2-4. 환각(Hallucination) 최소화 — 독자 엔진의 구조적 우위", s_h2))
    hall_h = [B("구분", s_tc_bc), B("기존 AI 서비스", s_tc_bc), B("VESTRA", s_tc_bc)]
    hall_d = [
        [tbl("핵심 분석"), tbl("LLM 전면 의존"), RED("독자 엔진 (AI 미의존)")],
        [tbl("AI 장애 시"), tbl("서비스 전면 중단"), GREEN("핵심 분석 독립 작동")],
        [tbl("법적 신뢰성"), tbl("환각 위험 높음"), GREEN("검증 근거+출처 제시")],
        [tbl("비용 구조"), tbl("높은 API 비용"), GREEN("독자 엔진 비용 절감")],
    ]
    story.append(make_table(hall_h, hall_d, [tw*0.20, tw*0.35, tw*0.45]))
    story.append(Spacer(1, 4*mm))

    # 2-5 지원금 투입 로드맵
    story.append(Paragraph("2-5. 지원금 투입 시 개발 로드맵 — 6개월의 가속", s_h2))

    # 비교표
    story.append(Paragraph("지원금 유무 비교", s_h3))
    acc_h = [B("항목", s_tc_bc), B("지원금 없음", s_tc_bc), B("지원금 투입 시", s_tc_bc), B("효과", s_tc_bc)]
    acc_d = [
        [tbl("v1.0 정식 출시"), tbl("12개월 후"), RED("6개월 후"), GREEN("6개월 단축")],
        [tbl("3사 API 통합"), tbl("18개월 후"), RED("9개월 후"), GREEN("9개월 단축")],
        [tbl("B2B 파일럿"), tbl("10개사/연말"), RED("30개사/6개월"), GREEN("3배 가속")],
        [tbl("분석 정확도"), tbl("97% 유지"), RED("99.5% 달성"), GREEN("NLP 투자")],
        [tbl("첫 매출"), tbl("2차년도"), RED("1차년도 하반기"), GREEN("6개월 앞당김")],
        [tbl("BEP"), tbl("4차년도"), RED("2차년도"), GREEN("2년 단축")],
    ]
    story.append(make_table(acc_h, acc_d, [tw*0.20, tw*0.22, tw*0.30, tw*0.28]))
    story.append(Spacer(1, 4*mm))

    # Phase별 계획
    story.append(Paragraph("Phase별 개발 계획", s_h3))
    ph_h = [B("Phase", s_tc_bc), B("기간", s_tc_bc), B("핵심 개발 내용", s_tc_bc), B("산출물", s_tc_bc), B("예산", s_tc_bc)]
    ph_d = [
        [B("Phase 1"), tbl("1~2개월", s_tc), tbl("기술 고도화+3사 연동"), tbl("V-Score 고도화, CTA 연동"), tbl("2,000만 원", s_tc)],
        [B("Phase 2"), tbl("3~4개월", s_tc), tbl("API 통합+B2B 파일럿"), tbl("REST API, 파일럿 10개사"), tbl("3,000만 원", s_tc)],
        [B("Phase 3"), tbl("5~7개월", s_tc), tbl("통합 인증+결제"), tbl("OAuth SSO, v1.0 정식 출시"), tbl("3,000만 원", s_tc)],
        [B("Phase 4"), tbl("8~12개월", s_tc), tbl("플랫폼화+시장 확장"), tbl("B2B 포털, 모바일 앱 MVP"), tbl("2,000만 원", s_tc)],
        [B("합계"), tbl(""), tbl(""), tbl(""), RED("1억 원")],
    ]
    story.append(make_table(ph_h, ph_d, [tw*0.12, tw*0.13, tw*0.28, tw*0.28, tw*0.19]))
    story.append(Spacer(1, 4*mm))

    # 2-6 풀체인 가치사슬
    story.append(Paragraph("2-6. 풀체인 가치사슬", s_h2))
    fc_h = [B("Step", s_tc_bc), B("역할", s_tc_bc), B("담당", s_tc_bc), B("설명", s_tc_bc)]
    fc_d = [
        [B("Step 1"), tbl("데이터 수집"), B("ezREMS"), tbl("20년 축적 실거래 DB + 실시간 임대차 정보")],
        [B("Step 2"), tbl("AI 분석"), RED("VESTRA"), tbl("권리분석, 시세전망, 위험도 평가 (8종 엔진)")],
        [B("Step 3"), tbl("의사결정"), RED("VESTRA"), tbl("분석 리포트 기반 매수/매도 판단 지원")],
        [B("Step 4"), tbl("법률 실행"), B("등기온"), tbl("원클릭 소유권이전, 근저당, 법인등기")],
        [B("Step 5"), tbl("사후 관리"), B("ezREMS"), tbl("임대 운영, 수납, 세금 관리")],
    ]
    story.append(make_table(fc_h, fc_d, [tw*0.10, tw*0.14, tw*0.14, tw*0.62]))
    story.append(Spacer(1, 4*mm))

    # 2-7 기술 스택
    story.append(Paragraph("2-7. 기술 스택 (확정·운영 중)", s_h2))
    ts_h = [B("구분", s_tc_bc), B("기술", s_tc_bc), B("상태", s_tc_bc)]
    ts_d = [
        [tbl("언어/프레임워크"), tbl("TypeScript 5.x + Next.js 16 (App Router)"), GREEN("✅ 운영 중")],
        [tbl("DB"), tbl("PostgreSQL (Neon) + Prisma ORM 6.x"), GREEN("✅ 운영 중")],
        [tbl("AI (보조)"), tbl("OpenAI GPT-4.1-mini + GPT-4o Vision OCR"), GREEN("✅ 운영 중")],
        [tbl("인증/보안"), tbl("NextAuth v5 (RBAC) + AES-256-GCM + 7개 보안 헤더"), GREEN("✅ 운영 중")],
        [tbl("배포"), tbl("Vercel (Serverless)"), GREEN("✅ 운영 중")],
        [tbl("테스트"), tbl("Vitest (9개 파일, 1,497 LOC)"), GREEN("✅ 운영 중")],
    ]
    story.append(make_table(ts_h, ts_d, [tw*0.20, tw*0.58, tw*0.22]))
    story.append(PageBreak())

    # ═══════════════════════════════════════════
    # 【평가항목 3】 성장전략
    # ═══════════════════════════════════════════
    story.append(eval_header(3, "성장전략", "차별성·수익모델·시장 확장 전략"))
    story.append(Spacer(1, 4*mm))

    # 3-1 3사 시너지
    story.append(Paragraph("3-1. 3사 통합 풀체인 시너지 — 1+1+1 = 10", s_h2))
    syn_h = [B("파트너", s_tc_bc), B("역할", s_tc_bc), B("핵심 자산", s_tc_bc), B("시너지", s_tc_bc)]
    syn_d = [
        [RED("VESTRA"), tbl("AI 분석"), tbl("8종 독자 엔진, OpenAI 연동"), tbl("분석→의사결정")],
        [B("등기온 dgon"), tbl("법률 실행"), tbl("법무법인 시화 네트워크, 온라인 등기"), tbl("의사결정→실행")],
        [B("ezREMS"), tbl("데이터·관리"), tbl("20년 실거래 DB, 51,000+ 세대"), tbl("실행→사후관리")],
    ]
    story.append(make_table(syn_h, syn_d, [tw*0.18, tw*0.14, tw*0.40, tw*0.28]))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph("시너지 플라이휠: ezREMS→VESTRA(데이터로 AI 정확도↑) → VESTRA→등기온(사전 분석으로 이탈 방지) → 등기온→ezREMS(등기 완료 즉시 자동 업데이트)", s_quote))
    story.append(Spacer(1, 4*mm))

    # 3-2 SaaS 요금
    story.append(Paragraph("3-2. B2B SaaS 수익모델 — 3단계 구독", s_h2))
    price_h = [B("플랜", s_tc_bc), B("월 요금", s_tc_bc), B("타깃", s_tc_bc), B("주요 기능", s_tc_bc)]
    price_d = [
        [B("Basic"), tbl("99,000원", s_tc), tbl("개인 공인중개사"), tbl("AI 분석 월 50건 + 등기온 5% 할인")],
        [RED("Professional ⭐"), RED("299,000원"), tbl("중개법인·자산관리사"), tbl("월 200건 + 등기온 10% + ezREMS 기본")],
        [B("Enterprise"), tbl("별도 협의", s_tc), tbl("대형 AMC"), tbl("무제한 + 15% 할인 + 전용 API")],
    ]
    story.append(make_table(price_h, price_d, [tw*0.18, tw*0.15, tw*0.22, tw*0.45]))
    story.append(Spacer(1, 4*mm))

    # 3-3 매출 성장
    story.append(Paragraph("3-3. 매출 성장 시나리오 — J커브 성장", s_h2))
    rev_h = [B("지표", s_tc_bc), B("1차년도", s_tc_bc), B("2차년도", s_tc_bc), B("3차년도", s_tc_bc)]
    rev_d = [
        [B("B2B 유료 고객"), tbl("500명", s_tc), tbl("2,000명", s_tc), RED("5,000명")],
        [B("연간 매출"), tbl("7.7억 원", s_tc), tbl("39.6억 원", s_tc), RED("120억 원")],
        [tbl("성장률"), tbl("-", s_tc), tbl("414%", s_tc), tbl("203%", s_tc)],
        [tbl("MAU"), tbl("5,000", s_tc), tbl("20,000", s_tc), tbl("50,000", s_tc)],
        [tbl("전환율"), tbl("3~5%", s_tc), tbl("5~8%", s_tc), tbl("8~10%", s_tc)],
    ]
    story.append(make_table(rev_h, rev_d, [tw*0.25, tw*0.25, tw*0.25, tw*0.25]))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph("보수적 가정: 공인중개사 51만 명 중 전환율 1% 미만으로 산출", s_quote))
    story.append(Spacer(1, 4*mm))

    # 3-4 연도별 매출 상세 - 1차년도
    story.append(Paragraph("3-4. 연도별 매출 상세", s_h2))
    story.append(Paragraph("1차년도 (시장 진입) — 연 7.7억 원", s_h3))
    y1_h = [B("구분", s_tc_bc), B("단가(월)", s_tc_bc), B("고객 수", s_tc_bc), B("연 매출", s_tc_bc)]
    y1_d = [
        [tbl("Basic (B2B)"), tbl("99,000원", s_tc), tbl("300명", s_tc), tbl("3.6억 원", s_tc)],
        [tbl("Professional (B2B)"), tbl("299,000원", s_tc), tbl("100명", s_tc), tbl("3.6억 원", s_tc)],
        [tbl("B2C 이용권"), tbl("100,000원", s_tc), tbl("50명", s_tc), tbl("500만 원", s_tc)],
        [B("합계"), tbl(""), RED("450명+"), RED("7.7억 원")],
    ]
    story.append(make_table(y1_h, y1_d, [tw*0.30, tw*0.23, tw*0.23, tw*0.24]))
    story.append(Spacer(1, 2*mm))

    # 2차년도
    story.append(Paragraph("2차년도 (본격 성장) — 연 39.6억 원", s_h3))
    y2_h = [B("구분", s_tc_bc), B("단가(월)", s_tc_bc), B("고객 수", s_tc_bc), B("연 매출", s_tc_bc)]
    y2_d = [
        [tbl("Basic"), tbl("99,000원", s_tc), tbl("1,200명", s_tc), tbl("14.3억 원", s_tc)],
        [tbl("Professional"), tbl("299,000원", s_tc), tbl("500명", s_tc), tbl("17.9억 원", s_tc)],
        [tbl("Enterprise"), tbl("500,000원", s_tc), tbl("50곳", s_tc), tbl("3억 원", s_tc)],
        [tbl("API/데이터 라이선스"), tbl("-", s_tc), tbl("-", s_tc), tbl("2.4억 원", s_tc)],
        [tbl("B2C 이용권"), tbl("-", s_tc), tbl("2,000명", s_tc), tbl("2억 원", s_tc)],
        [B("합계"), tbl(""), tbl(""), RED("39.6억 원")],
    ]
    story.append(make_table(y2_h, y2_d, [tw*0.30, tw*0.23, tw*0.23, tw*0.24]))
    story.append(Spacer(1, 4*mm))

    # 3-5 손익분기점
    story.append(Paragraph("3-5. 손익분기점 분석", s_h2))
    bep_h = [B("구분", s_tc_bc), B("1차년도", s_tc_bc), B("2차년도", s_tc_bc), B("3차년도", s_tc_bc)]
    bep_d = [
        [tbl("매출"), tbl("7.7억", s_tc), tbl("39.6억", s_tc), RED("120억")],
        [tbl("고정비"), tbl("6억", s_tc), tbl("8억", s_tc), tbl("12억", s_tc)],
        [B("순손익"), GREEN("1.7억"), GREEN("31.6억"), GREEN("108억")],
        [B("BEP"), GREEN("도달 ✅"), tbl("흑자 확대", s_tc), tbl("대규모 흑자", s_tc)],
    ]
    story.append(make_table(bep_h, bep_d, [tw*0.25, tw*0.25, tw*0.25, tw*0.25]))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph("지원금 효과: 자력 개발 시 BEP 4차년도 → 지원금 투입 시 1차년도 BEP 달성", s_quote))
    story.append(Spacer(1, 4*mm))

    # 3-6 ROI
    story.append(Paragraph("3-6. 투자 대비 효과 (ROI)", s_h2))
    roi_h = [B("항목", s_tc_bc), B("수치", s_tc_bc)]
    roi_d = [
        [tbl("지원금 투입"), RED("1억 원")],
        [tbl("1차년도 매출"), tbl("7.7억 원")],
        [tbl("2차년도 매출"), tbl("39.6억 원")],
        [tbl("3차년도 매출"), RED("120억 원")],
        [B("3년 누적 매출"), RED("167.3억 원")],
        [B("ROI"), RED("16,630%")],
    ]
    story.append(make_table(roi_h, roi_d, [tw*0.50, tw*0.50]))
    story.append(Spacer(1, 4*mm))

    # 3-7 마케팅
    story.append(Paragraph("3-7. 마케팅 전략", s_h2))
    story.append(Paragraph("B2B 마케팅", s_h3))
    b2b_data = [
        ("핵심 타깃", "공인중개사 (51만 명), 자산관리사, 법무/회계 법인"),
        ("핵심 메시지", '"분석부터 등기까지, 하나의 플랫폼으로 끝내세요"'),
        ("전환 방식", "데모→파일럿 10개사→구독 전환"),
        ("KPI", "유료 기관 수, 계약 전환율"),
    ]
    story.append(kv_table(b2b_data))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph("B2C 마케팅", s_h3))
    b2c_data = [
        ("핵심 타깃", "전/월세 계약 예정자, 개인 투자자"),
        ("핵심 메시지", '"계약 전 5분, AI로 리스크를 먼저 확인하세요"'),
        ("전환 방식", "무료 체험→건별 과금/구독"),
    ]
    story.append(kv_table(b2c_data))
    story.append(Spacer(1, 4*mm))

    # 3-8 KPI
    story.append(Paragraph("3-8. 핵심 성과지표 (KPI)", s_h2))
    kpi_h = [B("구분", s_tc_bc), B("지표", s_tc_bc), B("1차년도", s_tc_bc), B("2차년도", s_tc_bc), B("3차년도", s_tc_bc)]
    kpi_d = [
        [B("기술"), tbl("분석 정확도"), tbl("97% (달성)", s_tc), tbl("99%", s_tc), tbl("99.5%", s_tc)],
        [tbl(""), tbl("독자 엔진"), tbl("8종 (달성)", s_tc), tbl("10종", s_tc), tbl("12종", s_tc)],
        [B("플랫폼"), tbl("3사 통합 Phase"), tbl("Phase 2", s_tc), tbl("Phase 3", s_tc), tbl("Phase 4", s_tc)],
        [B("사용자"), tbl("B2B 유료 고객"), tbl("500", s_tc), tbl("2,000", s_tc), RED("5,000")],
        [tbl(""), tbl("MAU"), tbl("5,000", s_tc), tbl("20,000", s_tc), tbl("50,000", s_tc)],
        [B("매출"), tbl("연간 매출"), tbl("7.7억", s_tc), tbl("39.6억", s_tc), RED("120억")],
    ]
    story.append(make_table(kpi_h, kpi_d, [tw*0.12, tw*0.20, tw*0.22, tw*0.22, tw*0.24]))
    story.append(PageBreak())

    # ═══════════════════════════════════════════
    # 【평가항목 4】 팀 구성
    # ═══════════════════════════════════════════
    story.append(eval_header(4, "팀 구성", "대표자 및 인력의 역량"))
    story.append(Spacer(1, 4*mm))

    # 4-1 대표자
    story.append(Paragraph("4-1. 대표자 역량", s_h2))
    ceo_data = [
        ("핵심 역량", "AI/풀스택 개발, 프롭테크 사업 기획"),
        ("기술 성과", "MVP v2.3.1 단독 개발 (31,315 LOC, 89커밋, 18일 집중 개발)"),
        ("개발 범위", "8종 독자 엔진 + 49개 API + 25개 DB 모델 + 11개 기능 모듈"),
    ]
    story.append(kv_table(ceo_data))
    story.append(Spacer(1, 4*mm))

    # 4-2 팀 구성안
    story.append(Paragraph("4-2. 팀 구성(안) — 지원금 투입 시 확충", s_h2))
    tm_h = [B("구분", s_tc_bc), B("직위", s_tc_bc), B("담당 업무", s_tc_bc), B("보유 역량", s_tc_bc), B("상태", s_tc_bc)]
    tm_d = [
        [tbl("1", s_tc), B("CTO/대표"), tbl("전체 기술 총괄, AI 엔진"), tbl("AI/풀스택, MVP 단독 개발"), GREEN("재직")],
        [tbl("2", s_tc), tbl("풀스택 개발자"), tbl("프론트/백엔드 개발"), tbl("React, Node.js, TS"), tbl("채용 예정")],
        [tbl("3", s_tc), tbl("AI/ML 엔지니어"), tbl("NLP 모델 고도화"), tbl("Python, NLP, ML"), tbl("채용 예정")],
        [tbl("4", s_tc), tbl("사업개발(BD)"), tbl("B2B 영업, 파트너십"), tbl("프롭테크 업계 경험"), tbl("채용 예정")],
    ]
    story.append(make_table(tm_h, tm_d, [tw*0.08, tw*0.16, tw*0.26, tw*0.30, tw*0.20]))
    story.append(Spacer(1, 4*mm))

    # 4-3 파트너십
    story.append(Paragraph("4-3. 전략적 파트너십 — 풀체인 생태계", s_h2))
    ptn_h = [B("#", s_tc_bc), B("파트너", s_tc_bc), B("보유 역량", s_tc_bc), B("협업 방안", s_tc_bc), B("상태", s_tc_bc)]
    ptn_d = [
        [tbl("1", s_tc), B("제온스 (ezREMS)"), tbl("부동산 ERP, 20년 실거래 DB, 51,000+ 세대"), tbl("데이터+사후관리 연동"), tbl("협의 중", s_tc)],
        [tbl("2", s_tc), B("등기온 (dgon)"), tbl("온라인 등기 플랫폼, 법무법인 시화"), tbl("원클릭 등기 실행 연동"), tbl("협의 중", s_tc)],
        [tbl("3", s_tc), tbl("MJIT"), tbl("LLM 구축 전문"), tbl("AI 모델 고도화"), tbl("협의 중", s_tc)],
        [tbl("4", s_tc), B("법무법인 시화"), tbl("부동산 법무 전문"), tbl("법률 자문+등기 검증"), GREEN("확정")],
    ]
    story.append(make_table(ptn_h, ptn_d, [tw*0.06, tw*0.18, tw*0.36, tw*0.25, tw*0.15]))
    story.append(PageBreak())

    # ═══════════════════════════════════════════
    # 사업추진 일정
    # ═══════════════════════════════════════════
    story.append(Paragraph("사업추진 일정", s_h1))
    sch_h = [B("단계", s_tc_bc), B("기간", s_tc_bc), B("주요 추진 내용", s_tc_bc), B("상태", s_tc_bc)]
    sch_d = [
        [tbl("1단계", s_tc), tbl("1~2개월", s_tc), tbl("아키텍처 설계, 고객군 설정"), GREEN("✅ 완료")],
        [tbl("2단계", s_tc), tbl("3~4개월", s_tc), tbl("10개 공공 API 연동, 품질 검증"), GREEN("✅ 완료")],
        [tbl("3단계", s_tc), tbl("5~7개월", s_tc), tbl("8종 독자 엔진 + 3종 AI 모듈"), GREEN("✅ 완료")],
        [tbl("4단계", s_tc), tbl("8~9개월", s_tc), tbl("UI/UX, API, 인증/보안, MVP 배포"), GREEN("✅ 완료")],
        [tbl("5단계", s_tc), tbl("10~11개월", s_tc), tbl("PoC 파일럿, 정확도 검증"), tbl("🔄 진행 중", s_tc)],
        [B("6단계"), tbl("12개월", s_tc), RED("v1.0 출시, B2B SaaS, 3사 통합"), RED("지원금 투입 시 가속")],
    ]
    story.append(make_table(sch_h, sch_d, [tw*0.12, tw*0.14, tw*0.48, tw*0.26]))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph("현재 6단계 중 4단계 완료 (67%). 지원금은 나머지 33%를 가속하여 6개월 내 정식 출시.", s_quote))
    story.append(Spacer(1, 8*mm))

    # ═══════════════════════════════════════════
    # 지원금 사용 계획
    # ═══════════════════════════════════════════
    story.append(Paragraph("지원금 사용 계획", s_h1))

    story.append(Paragraph("예산 배분", s_h2))
    bud_h = [B("항목", s_tc_bc), B("금액", s_tc_bc), B("비중", s_tc_bc), B("상세 내용", s_tc_bc)]
    bud_d = [
        [B("기술 고도화"), tbl("4,000만 원", s_tc), tbl("40%", s_tc), tbl("NLP 모델 학습, V-Score 고도화, 정확도 99.5%")],
        [B("3사 통합 개발"), tbl("3,000만 원", s_tc), tbl("30%", s_tc), tbl("REST API, OAuth SSO, 스키마 통일")],
        [B("B2B 파일럿"), tbl("1,500만 원", s_tc), tbl("15%", s_tc), tbl("중개사 10곳 + 자산관리 5곳 실증")],
        [B("인프라/마케팅"), tbl("1,500만 원", s_tc), tbl("15%", s_tc), tbl("서버 확장, 보안 강화, 초기 마케팅")],
        [B("합계"), RED("1억 원"), tbl("100%", s_tc), tbl("")],
    ]
    story.append(make_table(bud_h, bud_d, [tw*0.18, tw*0.17, tw*0.10, tw*0.55]))
    story.append(Spacer(1, 4*mm))

    story.append(Paragraph("지원금 투입 효과 요약", s_h2))
    eff_h = [B("지표", s_tc_bc), B("지원금 없음", s_tc_bc), B("지원금 투입 시", s_tc_bc), B("개선 효과", s_tc_bc)]
    eff_d = [
        [tbl("정식 출시"), tbl("12개월 후"), RED("6개월 후"), GREEN("2배 가속")],
        [tbl("1차년도 매출"), tbl("0원"), RED("7.7억 원"), GREEN("매출 창출")],
        [tbl("BEP"), tbl("4차년도"), RED("1차년도"), GREEN("3년 단축")],
        [tbl("3차년도 매출"), tbl("3.1억 원"), RED("120억 원"), GREEN("38배")],
        [tbl("고용"), tbl("2명"), RED("6명 확충"), GREEN("일자리 창출")],
        [B("ROI"), tbl("-"), RED("16,630%"), GREEN("압도적 성과")],
    ]
    story.append(make_table(eff_h, eff_d, [tw*0.20, tw*0.22, tw*0.28, tw*0.30]))
    story.append(Spacer(1, 8*mm))

    # Footer message
    story.append(HRFlowable(width="100%", thickness=1, color=C3))
    story.append(Spacer(1, 4*mm))

    closing = Paragraph(
        '<font color="#1a1a2e"><b>VESTRA는 이미 31,315줄의 코드와 8종의 독자 엔진으로 MVP를 완성했다.</b></font><br/>'
        '<font color="#e94560"><b>지원금 1억 원은 \'개발\'이 아닌 \'폭발적 성장의 방아쇠\'로 사용된다.</b></font><br/>'
        '<font color="#1a1a2e">3사 풀체인 통합으로 국내 최초 원스톱 플랫폼을 구축하고, 3차년도 연 120억 원 매출을 달성한다.</font><br/><br/>'
        '<font color="#0f3460"><b>프로덕션 URL: https://vestra-plum.vercel.app</b></font>',
        ParagraphStyle("closing", fontName="NR", fontSize=10, textColor=C1, leading=16, alignment=TA_CENTER)
    )
    story.append(closing)

    # Build
    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    size = os.path.getsize(out)
    print(f"✅ PDF 생성 완료: {out}")
    print(f"   파일 크기: {size:,} bytes ({size/1024:.1f} KB)")

if __name__ == "__main__":
    build()
