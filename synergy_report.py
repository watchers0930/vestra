#!/usr/bin/env python3
"""Vestra + 등기온 + ezREMS 3사 협업 시너지 보고서 PDF 생성"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ─── 한글 폰트 등록 ───
pdfmetrics.registerFont(TTFont("AppleGothic", "/System/Library/Fonts/Supplemental/AppleGothic.ttf"))

# ─── 색상 ───
PRIMARY = HexColor("#4F46E5")  # Vestra indigo
DARK = HexColor("#1E1B4B")
GRAY = HexColor("#6B7280")
LIGHT_BG = HexColor("#F8FAFC")
ACCENT = HexColor("#10B981")
WARN = HexColor("#F59E0B")
TABLE_HEADER = HexColor("#4338CA")
TABLE_ROW_ALT = HexColor("#EEF2FF")

# ─── 스타일 ───
def make_style(name, font="AppleGothic", size=10, color=black, align=TA_LEFT,
               leading=None, space_before=0, space_after=0, bold=False):
    return ParagraphStyle(
        name=name, fontName=font, fontSize=size, textColor=color,
        alignment=align, leading=leading or size * 1.6,
        spaceBefore=space_before, spaceAfter=space_after,
    )

s_cover_title = make_style("CoverTitle", size=28, color=PRIMARY, align=TA_CENTER, leading=40)
s_cover_sub = make_style("CoverSub", size=14, color=GRAY, align=TA_CENTER, leading=22)
s_cover_date = make_style("CoverDate", size=11, color=GRAY, align=TA_CENTER)
s_h1 = make_style("H1", size=20, color=DARK, space_before=10, space_after=12, leading=30)
s_h2 = make_style("H2", size=15, color=PRIMARY, space_before=16, space_after=8, leading=22)
s_h3 = make_style("H3", size=12, color=DARK, space_before=10, space_after=6, leading=18)
s_body = make_style("Body", size=10, color=DARK, align=TA_JUSTIFY, space_after=6, leading=17)
s_body_indent = make_style("BodyIndent", size=10, color=DARK, align=TA_LEFT, space_after=4, leading=17)
s_bullet = make_style("Bullet", size=10, color=DARK, space_after=3, leading=16)
s_table_header = make_style("TH", size=9, color=white, align=TA_CENTER, leading=14)
s_table_cell = make_style("TD", size=9, color=DARK, align=TA_CENTER, leading=14)
s_table_cell_left = make_style("TDL", size=9, color=DARK, align=TA_LEFT, leading=14)
s_caption = make_style("Caption", size=8, color=GRAY, align=TA_CENTER, space_before=4, space_after=12)
s_footer_note = make_style("FooterNote", size=8, color=GRAY, align=TA_CENTER)
s_quote = make_style("Quote", size=11, color=PRIMARY, align=TA_CENTER, leading=18, space_before=10, space_after=10)

# ─── 헬퍼 ───
def hr():
    """수평선 테이블"""
    t = Table([[""]],colWidths=[170*mm])
    t.setStyle(TableStyle([
        ("LINEBELOW", (0,0), (-1,-1), 0.5, HexColor("#E5E7EB")),
        ("TOPPADDING", (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
    ]))
    return t

def make_table(headers, rows, col_widths=None):
    """공통 테이블 생성"""
    header_cells = [Paragraph(h, s_table_header) for h in headers]
    data = [header_cells]
    for row in rows:
        data.append([Paragraph(str(c), s_table_cell if i > 0 else s_table_cell_left) for i, c in enumerate(row)])

    w = col_widths or [170*mm / len(headers)] * len(headers)
    t = Table(data, colWidths=w, repeatRows=1)
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), TABLE_HEADER),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#D1D5DB")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            style.append(("BACKGROUND", (0, i), (-1, i), TABLE_ROW_ALT))
    t.setStyle(TableStyle(style))
    return t

def bullet(text):
    return Paragraph(f"&bull;  {text}", s_bullet)

def numbered(num, text):
    return Paragraph(f"<b>{num}.</b>  {text}", s_bullet)

# ─── 페이지 번호 ───
def add_page_number(canvas, doc):
    canvas.saveState()
    canvas.setFont("AppleGothic", 8)
    canvas.setFillColor(GRAY)
    canvas.drawCentredString(A4[0]/2, 15*mm, f"- {doc.page} -")
    if doc.page > 1:
        canvas.drawString(15*mm, 15*mm, "Confidential")
        canvas.drawRightString(A4[0]-15*mm, 15*mm, "BMI C&S")
    canvas.restoreState()

# ─── 문서 빌드 ───
doc = SimpleDocTemplate(
    "/Users/watchers/Desktop/Vestra_등기온_ezREMS_협업시너지_보고서.pdf",
    pagesize=A4,
    topMargin=20*mm, bottomMargin=25*mm,
    leftMargin=20*mm, rightMargin=20*mm,
)

story = []

# ════════════════════════════════════════
# 표지
# ════════════════════════════════════════
story.append(Spacer(1, 60*mm))
story.append(Paragraph("Vestra + 등기온 + ezREMS", s_cover_title))
story.append(Spacer(1, 8*mm))
story.append(Paragraph("3사 협업 시너지 분석 보고서", make_style("CoverTitle2", size=22, color=DARK, align=TA_CENTER, leading=32)))
story.append(Spacer(1, 15*mm))
story.append(Paragraph("데이터 + AI 분석 + 등기 실행", s_cover_sub))
story.append(Paragraph("부동산 풀체인 플랫폼 구축 전략", s_cover_sub))
story.append(Spacer(1, 25*mm))
story.append(hr())
story.append(Spacer(1, 5*mm))
story.append(Paragraph("2026년 3월", s_cover_date))
story.append(Paragraph("BMI C&S | Confidential", s_cover_date))
story.append(PageBreak())

# ════════════════════════════════════════
# 목차
# ════════════════════════════════════════
story.append(Paragraph("목차", s_h1))
story.append(hr())
toc_items = [
    ("1", "Executive Summary", "3"),
    ("2", "3사 현황 분석", "4"),
    ("3", "시장 환경 및 경쟁 분석", "5"),
    ("4", "협업 시너지 분석", "6"),
    ("5", "통합 비즈니스 모델", "8"),
    ("6", "기술 연동 로드맵", "9"),
    ("7", "수익 모델 및 재무 전망", "10"),
    ("8", "리스크 및 대응 전략", "11"),
    ("9", "결론 및 제언", "12"),
]
for num, title, page in toc_items:
    story.append(Paragraph(
        f"<b>{num}.</b>&nbsp;&nbsp;{title}{'&nbsp;' * 3}{'.' * (60 - len(title))} {page}",
        make_style(f"toc{num}", size=11, color=DARK, space_after=6, leading=18)
    ))
story.append(PageBreak())

# ════════════════════════════════════════
# 1. Executive Summary
# ════════════════════════════════════════
story.append(Paragraph("1. Executive Summary", s_h1))
story.append(hr())
story.append(Spacer(1, 3*mm))

story.append(Paragraph(
    "본 보고서는 AI 부동산 분석 플랫폼 <b>Vestra</b>, 온라인 등기 처리 서비스 <b>등기온(dgon)</b>, "
    "부동산 통합 운영관리 ERP <b>ezREMS</b> 3사의 전략적 협업을 통해 창출 가능한 시너지를 분석합니다.",
    s_body
))
story.append(Spacer(1, 3*mm))

story.append(Paragraph("핵심 요약", s_h3))
story.append(bullet("3사는 부동산 가치사슬의 서로 다른 영역을 담당하며, 기능 중복 없이 상호보완적"))
story.append(bullet("<b>ezREMS</b>(데이터) + <b>Vestra</b>(AI 분석) + <b>등기온</b>(실행) = 부동산 풀체인 플랫폼"))
story.append(bullet("국내 최초 '분석-의사결정-실행' 원스톱 부동산 서비스 구현 가능"))
story.append(bullet("B2B 전문가 시장(공인중개사, 자산관리사, 법인)에서 압도적 차별화"))
story.append(bullet("호갱노노, 리치고 등 B2C 플랫폼과 다른 시장 포지셔닝으로 직접 경쟁 회피"))
story.append(Spacer(1, 5*mm))

story.append(Paragraph(
    '"보여주는 서비스에서, 실행하는 서비스로"',
    s_quote
))

story.append(PageBreak())

# ════════════════════════════════════════
# 2. 3사 현황 분석
# ════════════════════════════════════════
story.append(Paragraph("2. 3사 현황 분석", s_h1))
story.append(hr())

story.append(Paragraph("2.1 개별 서비스 개요", s_h2))
story.append(make_table(
    ["구분", "Vestra", "등기온 (dgon)", "ezREMS"],
    [
        ["핵심 서비스", "AI 부동산 분석\n자산관리 플랫폼", "법인/부동산\n온라인 등기 처리", "부동산 임대\n통합 운영관리 ERP"],
        ["운영 주체", "BMI C&S", "법무법인 시화", "이지램스"],
        ["주요 기능", "권리분석, 시세전망\n세금계산, 전세보호\n계약서 AI 검토", "소유권이전, 근저당\n법인등기(설립/변경)\n공인중개사 B2B", "전자계약, 임대료관리\n자동수납(CMS)\n세금계산서, 분석"],
        ["타겟 고객", "개인/중개사/기업\n(B2C + B2B)", "개인/중개사/법인\n(B2C + B2B)", "기업/자산관리사\n(B2B 전문)"],
        ["기술 스택", "Next.js 16, React 19\nOpenAI, Prisma", "Next.js\nTailwind CSS", "클라우드 SaaS\n웹/앱 기반"],
        ["핵심 자산", "AI 분석 엔진\nOpenAI 연동", "법무법인 네트워크\n등기 실행력", "20년 축적 실거래 DB\n51,000+ 관리 세대"],
    ],
    [25*mm, 38*mm, 38*mm, 38*mm]
))
story.append(Spacer(1, 3*mm))

story.append(Paragraph("2.2 가치사슬 내 포지셔닝", s_h2))
story.append(Paragraph(
    "3사는 부동산 거래의 가치사슬에서 서로 다른 단계를 담당합니다. "
    "이는 협업 시 기능 충돌 없이 시너지를 극대화할 수 있는 구조적 장점입니다.",
    s_body
))

story.append(make_table(
    ["단계", "역할", "담당 서비스"],
    [
        ["1. 데이터 수집", "실거래 데이터, 임대차 정보 축적", "ezREMS"],
        ["2. AI 분석", "권리분석, 시세전망, 위험도 평가", "Vestra"],
        ["3. 의사결정", "분석 리포트 기반 매수/매도 판단", "Vestra"],
        ["4. 법률 실행", "등기 신청, 소유권이전, 근저당", "등기온"],
        ["5. 사후 관리", "임대 운영, 수납, 세금 관리", "ezREMS"],
    ],
    [30*mm, 65*mm, 45*mm]
))
story.append(PageBreak())

# ════════════════════════════════════════
# 3. 시장 환경 및 경쟁 분석
# ════════════════════════════════════════
story.append(Paragraph("3. 시장 환경 및 경쟁 분석", s_h1))
story.append(hr())

story.append(Paragraph("3.1 프롭테크 시장 현황", s_h2))
story.append(Paragraph(
    "국내 프롭테크 시장은 급속한 재편 중입니다. 직방의 호갱노노 인수(2018), "
    "네이버페이의 아실 인수 등 대형 플랫폼의 데이터 확보 경쟁이 본격화되고 있습니다. "
    "그러나 대부분의 서비스가 '정보 조회' 단계에 머물러 있으며, 분석에서 실행까지 "
    "연결하는 서비스는 부재합니다.",
    s_body
))

story.append(Paragraph("3.2 주요 경쟁사 비교", s_h2))
story.append(make_table(
    ["구분", "호갱노노", "리치고", "3사 통합 플랫폼"],
    [
        ["핵심 기능", "아파트 실거래가 조회", "투자분석 + 빅데이터", "데이터+AI분석+등기실행"],
        ["데이터 소스", "국토부 공공 API", "국토부 + 자체 분석", "ezREMS 자체 DB\n+ 공공 API"],
        ["분석 수준", "시세 그래프 제공", "투자 점수 산정", "AI 기반 종합 분석\n(GPT-4 연동)"],
        ["실행 기능", "없음", "없음", "등기 신청까지 완결"],
        ["타겟", "일반인 (B2C)", "투자자 (B2C)", "전문가/기업 (B2B)"],
        ["회원 규모", "200만+ (직방)", "대규모", "신규 진입"],
        ["수익 모델", "광고 + 프리미엄", "구독 모델", "거래 수수료 + SaaS"],
    ],
    [25*mm, 35*mm, 35*mm, 45*mm]
))

story.append(Paragraph("3.3 차별화 포인트", s_h2))
story.append(Paragraph("<b>핵심 차별화: '보는 서비스' vs '실행하는 서비스'</b>", s_body))
story.append(bullet("호갱노노/리치고: 공공 데이터를 시각화하여 보여주는 서비스 (정보 조회 단계)"))
story.append(bullet("3사 통합: 독자 데이터 + AI 분석 + 법률 실행까지 원스톱 완결 (실행 단계)"))
story.append(bullet("B2B 전문가 시장에서 호갱노노/리치고가 제공하지 못하는 가치 창출"))
story.append(bullet("공인중개사 51만명, 자산관리사 시장이 핵심 타겟"))
story.append(PageBreak())

# ════════════════════════════════════════
# 4. 협업 시너지 분석
# ════════════════════════════════════════
story.append(Paragraph("4. 협업 시너지 분석", s_h1))
story.append(hr())

story.append(Paragraph("4.1 시너지 매트릭스", s_h2))
story.append(make_table(
    ["연계 방향", "제공 가치", "기대 효과"],
    [
        ["ezREMS -> Vestra\n(데이터 제공)", "20년 축적 실거래 DB\n임대차/관리비/공실률 데이터", "AI 분석 정확도 대폭 향상\n공공 데이터 한계 극복"],
        ["Vestra -> 등기온\n(분석->실행 연계)", "AI 권리분석 리포트\n시세전망/세금 시뮬레이션", "등기 전 사전 분석 제공\n고객 이탈률 감소"],
        ["등기온 -> ezREMS\n(실행->관리 연계)", "등기 완료 물건 정보\n소유권/근저당 변동 이력", "물건 정보 자동 업데이트\n관리 효율 향상"],
        ["Vestra -> ezREMS\n(분석->관리 연계)", "시세전망 리포트\n포트폴리오 분석", "자산관리 의사결정 지원\n부가서비스 제공"],
        ["ezREMS -> 등기온\n(관리->실행 연계)", "임대차 계약 만료 알림\n근저당 변경 필요 건", "등기 수요 자동 발굴\n선제적 고객 접근"],
    ],
    [35*mm, 55*mm, 55*mm]
))

story.append(Paragraph("4.2 고객 여정 통합 시나리오", s_h2))
story.append(Paragraph("<b>시나리오 A: 부동산 매수 고객</b>", s_h3))
story.append(numbered(1, "매물 발견 -> <b>Vestra</b>에서 AI 권리분석 실행 (등기부등본 파싱, 위험도 평가)"))
story.append(numbered(2, "<b>Vestra</b> 시세전망으로 미래 가격 예측 + 세금 시뮬레이션"))
story.append(numbered(3, "매수 결정 -> <b>등기온</b>에서 소유권이전등기 신청 (원클릭 연계)"))
story.append(numbered(4, "등기 완료 -> <b>ezREMS</b>에서 임대 운영 관리 시작"))
story.append(Spacer(1, 3*mm))

story.append(Paragraph("<b>시나리오 B: 전세 임차인</b>", s_h3))
story.append(numbered(1, "<b>Vestra</b> 전세 안전 분석으로 위험도 평가"))
story.append(numbered(2, "<b>Vestra</b> 계약서 AI 검토로 불리한 조항 발견"))
story.append(numbered(3, "<b>등기온</b>에서 전세권설정등기 신청"))
story.append(numbered(4, "계약 만료 시 <b>ezREMS</b> 알림 -> <b>등기온</b> 임차권등기명령"))
story.append(Spacer(1, 3*mm))

story.append(Paragraph("<b>시나리오 C: 공인중개사 B2B</b>", s_h3))
story.append(numbered(1, "<b>ezREMS</b> 실거래 데이터로 매물 시장 파악"))
story.append(numbered(2, "고객에게 <b>Vestra</b> AI 분석 리포트 제공 (차별화된 서비스)"))
story.append(numbered(3, "거래 성사 -> <b>등기온</b>에서 등기 처리 (중개사 전용 할인)"))
story.append(numbered(4, "임대 관리 필요 시 <b>ezREMS</b> 연동"))

story.append(Paragraph("4.3 데이터 시너지 상세", s_h2))
story.append(Paragraph(
    "가장 핵심적인 시너지는 <b>ezREMS의 데이터</b>와 <b>Vestra의 AI 분석 엔진</b> 결합입니다.",
    s_body
))
story.append(make_table(
    ["데이터 항목", "공공 API (현재)", "ezREMS 데이터", "개선 효과"],
    [
        ["실거래가", "월 1회 업데이트\n지연 1-2개월", "실시간 계약 데이터\n즉시 반영", "분석 실시간성\n대폭 향상"],
        ["임대차 정보", "제한적\n(전월세 신고만)", "임대료/관리비/보증금\n공실률/계약조건", "전세 안전 분석\n정확도 향상"],
        ["건물 정보", "건축물대장 기본", "실제 관리 데이터\n하자/수선 이력", "권리분석\n실질적 가치평가"],
        ["시장 동향", "과거 데이터만", "현재 계약 동향\n수요/공급 실시간", "시세전망\n예측력 강화"],
    ],
    [30*mm, 35*mm, 38*mm, 35*mm]
))
story.append(PageBreak())

# ════════════════════════════════════════
# 5. 통합 비즈니스 모델
# ════════════════════════════════════════
story.append(Paragraph("5. 통합 비즈니스 모델", s_h1))
story.append(hr())

story.append(Paragraph("5.1 B2B 패키지 상품 구성", s_h2))
story.append(make_table(
    ["패키지", "포함 서비스", "타겟 고객", "예상 월 요금"],
    [
        ["Basic", "Vestra AI 분석(월 50건)\n+ 등기온 5% 할인", "개인 중개사", "99,000원/월"],
        ["Professional", "Vestra AI 분석(월 200건)\n+ 등기온 10% 할인\n+ ezREMS 기본", "중개법인\n자산관리사", "299,000원/월"],
        ["Enterprise", "Vestra 무제한\n+ 등기온 15% 할인\n+ ezREMS 전체\n+ 전용 API", "대형 중개법인\n자산관리 회사", "별도 협의"],
    ],
    [28*mm, 52*mm, 32*mm, 28*mm]
))

story.append(Paragraph("5.2 수익 배분 구조", s_h2))
story.append(make_table(
    ["수익원", "설명", "배분 비율"],
    [
        ["SaaS 구독료", "B2B 패키지 월 구독", "3사 균등 (33.3%)"],
        ["등기 연계 수수료", "Vestra/ezREMS에서 등기온 연결 시", "연결 서비스 20%\n등기온 80%"],
        ["데이터 라이선스", "ezREMS 데이터 -> Vestra 제공", "ezREMS 70%\nVestra 30%"],
        ["AI 분석 API", "ezREMS/등기온에서 Vestra API 호출", "Vestra 80%\n호출 서비스 20%"],
        ["화이트라벨", "등기온 브랜드로 Vestra 분석 제공", "Vestra 60%\n등기온 40%"],
    ],
    [32*mm, 55*mm, 50*mm]
))

story.append(Paragraph("5.3 시장 규모 추정", s_h2))
story.append(bullet("공인중개사 등록 수: 약 <b>51만명</b> (2025 기준)"))
story.append(bullet("자산관리 전문기업: 약 <b>3,000개사</b>"))
story.append(bullet("연간 부동산 등기 건수: 약 <b>800만건</b>"))
story.append(bullet("타겟 시장 (SAM): 공인중개사 10% 전환 시 <b>51,000명 x 99,000원 = 월 50억원</b>"))
story.append(PageBreak())

# ════════════════════════════════════════
# 6. 기술 연동 로드맵
# ════════════════════════════════════════
story.append(Paragraph("6. 기술 연동 로드맵", s_h1))
story.append(hr())

story.append(Paragraph("6.1 단계별 구현 계획", s_h2))
story.append(make_table(
    ["단계", "기간", "구현 내용", "기술 요구사항"],
    [
        ["1단계\n상호 링크", "1개월", "CTA 버튼으로 상호 연결\n주소/물건 파라미터 전달\nUTM 추적 코드 삽입", "URL 딥링크\n쿼리 파라미터 규격\n공통 주소 체계"],
        ["2단계\nAPI 연동", "2-3개월", "Vestra 분석 API 공개\nezREMS 데이터 API 연동\n공유 물건 정보 규격", "REST API 설계\nAPI Key 인증\n데이터 스키마 통일"],
        ["3단계\n통합 인증", "3-4개월", "OAuth SSO 구현\n통합 회원 관리\n구독/결제 시스템", "OAuth 2.0 서버\n통합 DB 설계\nPG 연동"],
        ["4단계\n플랫폼화", "6개월+", "통합 대시보드\n화이트라벨 위젯\n공인중개사 전용 포털", "마이크로프론트엔드\niframe/Web Component\nB2B 포털 구축"],
    ],
    [22*mm, 18*mm, 48*mm, 42*mm]
))

story.append(Paragraph("6.2 기술 아키텍처", s_h2))
story.append(Paragraph(
    "3사 모두 웹 기반 SaaS이며, Vestra와 등기온은 동일한 기술 스택(Next.js + Vercel)을 "
    "사용하고 있어 연동 비용이 매우 낮습니다.",
    s_body
))
story.append(make_table(
    ["계층", "기술 요소", "담당"],
    [
        ["프론트엔드", "Next.js (공통), React 컴포넌트 공유", "Vestra + 등기온"],
        ["API Gateway", "공통 인증, 요청 라우팅, Rate Limiting", "공동 구축"],
        ["분석 엔진", "OpenAI GPT-4, 자체 모델", "Vestra"],
        ["데이터 레이어", "실거래 DB, 임대차 DB, 공공 API", "ezREMS"],
        ["실행 엔진", "등기 신청 자동화, 법률 워크플로우", "등기온"],
        ["인프라", "Vercel (Vestra/등기온), AWS (ezREMS)", "개별 운영"],
    ],
    [28*mm, 72*mm, 40*mm]
))
story.append(PageBreak())

# ════════════════════════════════════════
# 7. 수익 모델 및 재무 전망
# ════════════════════════════════════════
story.append(Paragraph("7. 수익 모델 및 재무 전망", s_h1))
story.append(hr())

story.append(Paragraph("7.1 연도별 매출 전망 (보수적 시나리오)", s_h2))
story.append(make_table(
    ["구분", "1차년도", "2차년도", "3차년도"],
    [
        ["B2B 구독 고객수", "500명", "2,000명", "5,000명"],
        ["구독 매출 (월)", "4,950만원", "2.5억원", "7.5억원"],
        ["등기 연계 건수 (월)", "200건", "1,000건", "3,000건"],
        ["등기 연계 매출 (월)", "1,000만원", "5,000만원", "1.5억원"],
        ["API 라이선스 (월)", "500만원", "3,000만원", "1억원"],
        ["월 총매출", "6,450만원", "3.3억원", "10억원"],
        ["연 총매출", "7.7억원", "39.6억원", "120억원"],
    ],
    [35*mm, 40*mm, 40*mm, 40*mm]
))
story.append(Paragraph("* 보수적 시나리오 기준. 공인중개사 51만명 대비 1% 미만 전환율 가정", s_caption))

story.append(Paragraph("7.2 투자 대비 효과", s_h2))
story.append(make_table(
    ["항목", "1단계 (1개월)", "2단계 (3개월)", "전체 (6개월)"],
    [
        ["개발 인력", "각사 1명", "각사 2명", "각사 3명"],
        ["예상 개발비", "1,500만원", "6,000만원", "1.5억원"],
        ["손익분기", "-", "-", "6개월 후"],
        ["ROI (1년)", "-", "200%+", "400%+"],
    ],
    [30*mm, 40*mm, 40*mm, 40*mm]
))
story.append(PageBreak())

# ════════════════════════════════════════
# 8. 리스크 및 대응
# ════════════════════════════════════════
story.append(Paragraph("8. 리스크 및 대응 전략", s_h1))
story.append(hr())

story.append(make_table(
    ["리스크", "영향도", "발생 확률", "대응 전략"],
    [
        ["데이터 보안/개인정보", "높음", "중간", "데이터 익명화 처리\n개인정보 최소 수집 원칙\n정보보호 인증(ISMS)"],
        ["수익 배분 갈등", "높음", "중간", "사전 계약서 체결\n명확한 KPI 기반 배분\n분기별 정산 리뷰"],
        ["기술 연동 지연", "중간", "높음", "단계별 접근 (1단계 우선)\nAPI 규격 사전 합의\nMVP 우선 출시"],
        ["경쟁사 유사 서비스", "중간", "낮음", "선점 효과 활용\n독점 데이터 우위\n고객 lock-in 전략"],
        ["법규 변경 리스크", "중간", "낮음", "법무법인 자문 (등기온)\n규제 모니터링\n유연한 서비스 구조"],
    ],
    [32*mm, 20*mm, 22*mm, 55*mm]
))
story.append(PageBreak())

# ════════════════════════════════════════
# 9. 결론 및 제언
# ════════════════════════════════════════
story.append(Paragraph("9. 결론 및 제언", s_h1))
story.append(hr())
story.append(Spacer(1, 5*mm))

story.append(Paragraph("9.1 핵심 결론", s_h2))
story.append(Paragraph(
    "Vestra, 등기온, ezREMS 3사의 협업은 단순한 서비스 연동을 넘어, "
    "국내 부동산 시장에서 <b>유일한 풀체인 플랫폼</b>을 구축할 수 있는 기회입니다.",
    s_body
))
story.append(Spacer(1, 3*mm))
story.append(numbered(1, "<b>상호보완적 구조</b>: 데이터(ezREMS) + 분석(Vestra) + 실행(등기온)으로 기능 중복 없는 완벽한 조합"))
story.append(numbered(2, "<b>시장 차별화</b>: 호갱노노/리치고가 점유한 B2C '정보 조회' 시장이 아닌, B2B '분석+실행' 시장 공략"))
story.append(numbered(3, "<b>데이터 경쟁력</b>: ezREMS의 20년 축적 데이터는 공공 API로는 얻을 수 없는 독보적 자산"))
story.append(numbered(4, "<b>낮은 연동 비용</b>: 동일 기술 스택(Next.js) + SaaS 구조로 빠른 구현 가능"))
story.append(numbered(5, "<b>확장 가능성</b>: B2B 시장 선점 후 B2C 확장, 해외 진출 기반 마련"))

story.append(Paragraph("9.2 제언", s_h2))
story.append(Paragraph("<b>즉시 실행 (1개월 내)</b>", s_h3))
story.append(bullet("3사 MOU 체결 및 실무 TF 구성"))
story.append(bullet("1단계 상호 링크 + 파라미터 연동 구현"))
story.append(bullet("공인중개사 10개사 파일럿 테스트"))

story.append(Spacer(1, 3*mm))
story.append(Paragraph("<b>단기 (3개월 내)</b>", s_h3))
story.append(bullet("API 연동 및 데이터 파이프라인 구축"))
story.append(bullet("B2B 패키지 상품 출시 (Basic/Professional)"))
story.append(bullet("공인중개사 100개사 확대 테스트"))

story.append(Spacer(1, 3*mm))
story.append(Paragraph("<b>중기 (6개월 내)</b>", s_h3))
story.append(bullet("통합 인증(SSO) 및 공유 대시보드 구축"))
story.append(bullet("공인중개사 전용 B2B 포털 오픈"))
story.append(bullet("Enterprise 패키지 출시 및 대형 고객 영업"))

story.append(Spacer(1, 15*mm))
story.append(hr())
story.append(Spacer(1, 5*mm))
story.append(Paragraph(
    "본 보고서는 BMI C&S에서 작성되었으며, 내부 검토용입니다.",
    s_footer_note
))
story.append(Paragraph(
    "문의: BMI C&S | Tel 010-8490-9271 | 경기도 광명시 디지털로64",
    s_footer_note
))

# ─── PDF 생성 ───
doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
print("PDF 생성 완료!")
