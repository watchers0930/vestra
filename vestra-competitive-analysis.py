#!/usr/bin/env python3
"""Vestra 경쟁력 분석 보고서 PDF 생성"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_CENTER, TA_LEFT
import os
from datetime import datetime

# 폰트 등록
pdfmetrics.registerFont(TTFont('NanumB', '/Users/watchers/Library/Fonts/NanumSquare_acB.ttf'))
pdfmetrics.registerFont(TTFont('Gothic', '/Users/watchers/Library/Fonts/NanumSquare_acR.ttf'))
pdfmetrics.registerFont(TTFont('GothicB', '/Users/watchers/Library/Fonts/NanumSquare_acB.ttf'))

# 색상
NAVY = HexColor('#1a1a2e')
BLUE = HexColor('#0066cc')
LIGHT_BLUE = HexColor('#e8f0fe')
DARK_GRAY = HexColor('#333333')
GRAY = HexColor('#666666')
LIGHT_GRAY = HexColor('#f5f5f5')
WHITE = HexColor('#ffffff')
GREEN = HexColor('#00875a')
RED = HexColor('#de350b')
ORANGE = HexColor('#ff8b00')

# 스타일
styles = {
    'cover_title': ParagraphStyle('cover_title', fontName='GothicB', fontSize=28, textColor=NAVY, alignment=TA_CENTER, leading=36),
    'cover_sub': ParagraphStyle('cover_sub', fontName='Gothic', fontSize=14, textColor=GRAY, alignment=TA_CENTER, leading=20),
    'h1': ParagraphStyle('h1', fontName='GothicB', fontSize=18, textColor=NAVY, spaceBefore=20, spaceAfter=10, leading=24),
    'h2': ParagraphStyle('h2', fontName='GothicB', fontSize=14, textColor=BLUE, spaceBefore=14, spaceAfter=6, leading=18),
    'h3': ParagraphStyle('h3', fontName='GothicB', fontSize=11, textColor=DARK_GRAY, spaceBefore=10, spaceAfter=4, leading=15),
    'body': ParagraphStyle('body', fontName='Gothic', fontSize=9.5, textColor=DARK_GRAY, leading=15, spaceAfter=4),
    'body_bold': ParagraphStyle('body_bold', fontName='GothicB', fontSize=9.5, textColor=DARK_GRAY, leading=15, spaceAfter=4),
    'bullet': ParagraphStyle('bullet', fontName='Gothic', fontSize=9.5, textColor=DARK_GRAY, leading=15, leftIndent=15, spaceAfter=2),
    'small': ParagraphStyle('small', fontName='Gothic', fontSize=8, textColor=GRAY, leading=12),
    'footer': ParagraphStyle('footer', fontName='Gothic', fontSize=7, textColor=GRAY, alignment=TA_CENTER),
}

def make_table(headers, rows, col_widths=None):
    """테이블 생성 헬퍼"""
    header_style = ParagraphStyle('th', fontName='GothicB', fontSize=8.5, textColor=WHITE, leading=12)
    cell_style = ParagraphStyle('td', fontName='Gothic', fontSize=8.5, textColor=DARK_GRAY, leading=12)
    cell_bold = ParagraphStyle('tdb', fontName='GothicB', fontSize=8.5, textColor=DARK_GRAY, leading=12)

    data = [[Paragraph(h, header_style) for h in headers]]
    for row in rows:
        cells = []
        for i, cell in enumerate(row):
            s = cell_bold if i == 0 else cell_style
            cells.append(Paragraph(str(cell), s))
        data.append(cells)

    w = col_widths or [170 * mm / len(headers)] * len(headers)
    t = Table(data, colWidths=w, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTSIZE', (0, 0), (-1, -1), 8.5),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, LIGHT_GRAY]),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#dddddd')),
    ]))
    return t

def add_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont('Gothic', 7)
    canvas.setFillColor(GRAY)
    canvas.drawCentredString(A4[0] / 2, 15 * mm, f"VESTRA Competitive Analysis Report  |  {datetime.now().strftime('%Y-%m-%d')}  |  Page {doc.page}")
    canvas.restoreState()

def build():
    output_path = '/Users/watchers/Desktop/VESTRA_경쟁력분석_보고서.pdf'
    doc = SimpleDocTemplate(output_path, pagesize=A4,
                            topMargin=25*mm, bottomMargin=25*mm,
                            leftMargin=20*mm, rightMargin=20*mm)
    story = []
    W = 170 * mm

    # ─── 표지 ───
    story.append(Spacer(1, 60*mm))
    story.append(Paragraph('VESTRA', styles['cover_title']))
    story.append(Spacer(1, 5*mm))
    story.append(Paragraph('경쟁력 분석 보고서', ParagraphStyle('ct2', fontName='GothicB', fontSize=22, textColor=BLUE, alignment=TA_CENTER, leading=28)))
    story.append(Spacer(1, 8*mm))
    story.append(HRFlowable(width=80*mm, color=BLUE, thickness=2, spaceAfter=8*mm, hAlign='CENTER'))
    story.append(Paragraph('AI 부동산 자산관리 플랫폼 vs 국내 프롭테크 시장', styles['cover_sub']))
    story.append(Spacer(1, 5*mm))
    story.append(Paragraph(f'{datetime.now().strftime("%Y년 %m월 %d일")}', styles['cover_sub']))
    story.append(Spacer(1, 40*mm))
    story.append(Paragraph('v2.4.0  |  BMI C&amp;S', ParagraphStyle('cv', fontName='Gothic', fontSize=11, textColor=GRAY, alignment=TA_CENTER)))
    story.append(PageBreak())

    # ─── 1. Executive Summary ───
    story.append(Paragraph('1. Executive Summary', styles['h1']))
    story.append(HRFlowable(width=W, color=NAVY, thickness=1.5, spaceAfter=4*mm))

    story.append(Paragraph(
        'VESTRA는 AI 기반 부동산 자산관리 플랫폼으로, 등기부등본 자동분석, 권리관계 분석, '
        '계약서 AI 분석 등 기존 프롭테크 시장에서 공백인 영역을 타겟으로 합니다. '
        '기술 수준은 기존 서비스 대비 동급 이상이며, 특히 분석/안전성/의사결정 지원이라는 '
        '차별화된 포지셔닝을 보유하고 있습니다.', styles['body']))
    story.append(Spacer(1, 3*mm))

    summary_data = [
        ['버전', '2.4.0'],
        ['종합 완성도', '80~85%'],
        ['핵심 모듈', '54개 lib, 50개 API, 21개 페이지'],
        ['실 연동 API', '국토부 실거래가, 한국은행, 대법원, OpenAI, 카카오맵'],
        ['기술스택', 'Next.js 16, React 19, Prisma, PostgreSQL(Neon), OpenAI'],
    ]
    story.append(make_table(['항목', '내용'], summary_data, [40*mm, 130*mm]))
    story.append(PageBreak())

    # ─── 2. 시장 현황 ───
    story.append(Paragraph('2. 국내 프롭테크 시장 현황', styles['h1']))
    story.append(HRFlowable(width=W, color=NAVY, thickness=1.5, spaceAfter=4*mm))

    story.append(Paragraph('2.1 주요 경쟁 서비스', styles['h2']))

    competitors = [
        ['직방', 'AI중개사, 매물 추천', 'MAU 229만, 시장점유율 61.7%', '높음 (자연어 매물 매칭)'],
        ['다방', 'AI방찾기, 대화형 검색', '2026 구매안심지수 1위', '중상 (행동 패턴 분석)'],
        ['호갱노노', '실거래가 지도, AI 예측시세', '회원 200만 (직방 인수)', '중간 (기본 시세 예측)'],
        ['아실', '매매/전세 가격 비교, 동호수별 거래', '실수요자/투자자 인기', '낮음 (데이터 조회 중심)'],
        ['부동산지인', '지인지수, 매수/매도 시점 분석', '전문 투자자 중심 니치', '중간 (빅데이터 예측)'],
        ['밸류맵', '3세대 AVM, AI 건축설계', '프롭테크 주요 플레이어', '매우 높음 (AVM 특화)'],
        ['빅밸류', 'AI 주택시세, 상권분석', 'B2B (시중은행 담보대출)', '매우 높음 (실시간 AVM)'],
        ['디스코', '상업용 부동산 통합 정보', '공인중개사 1.8만명+', '중간 (데이터 플랫폼)'],
    ]
    story.append(make_table(
        ['서비스', '핵심 기능', '사용자/시장 지위', 'AI 활용 수준'],
        competitors,
        [25*mm, 55*mm, 50*mm, 40*mm]
    ))
    story.append(Spacer(1, 5*mm))

    story.append(Paragraph('2.2 전세 안전성 관련 서비스 (공공)', styles['h2']))
    public_services = [
        ['안심전세 앱 (HUG)', '등기/확정일자/세금체납 통합 확인', '2026년 9월 출시 예정'],
        ['서울시 AI 분석', '전세사기 가담 임대인 1,500명 패턴 분석', '11가지 위험신호 도출'],
        ['경기도 AI 안전망', '부동산 거래 전 과정 AI 실시간 감지', '사전예방형 시스템'],
    ]
    story.append(make_table(
        ['서비스', '핵심 기능', '비고'],
        public_services,
        [40*mm, 75*mm, 55*mm]
    ))
    story.append(PageBreak())

    # ─── 3. 경쟁 비교 ───
    story.append(Paragraph('3. VESTRA vs 경쟁 서비스 비교', styles['h1']))
    story.append(HRFlowable(width=W, color=NAVY, thickness=1.5, spaceAfter=4*mm))

    story.append(Paragraph('3.1 기능별 포지셔닝', styles['h2']))
    positioning = [
        ['AI 시세전망', '호갱노노(기본), 부동산지인(지인지수), 빅밸류(AVM)', '5모델 앙상블 + 백테스트 + 시장사이클', '동급~우위'],
        ['등기부등본 AI 분석', '디스코(조회만), 안심전세앱(2026.9)', '자동 파싱 + 갑구/을구 위험 분류', '시장 공백, 독보적'],
        ['권리관계 분석', '전문가 수작업 영역, 경쟁자 부재', '그래프 엔진 + 자동 분석', '시장 공백, 독보적'],
        ['전세 안전성', '서울시/경기도(공공), 안심전세앱(하반기)', 'V-Score + 15개 피처 사기위험도', '민간 선점 우위'],
        ['계약서 AI 분석', '경쟁자 거의 없음', '45개 조항 규칙 + 판례 + LLM', '시장 공백, 독보적'],
        ['세금 계산', '부동산계산기(단순)', '거래 흐름 내 통합 계산', '차별화'],
        ['AI 어시스턴트', '직방(AI중개사), 다방(AI방찾기)', '분석/의사결정 지원', '차별화 가능'],
        ['매물 검색', '직방(MAU 229만), 다방', '미제공', '해당 없음'],
        ['B2B AVM', '빅밸류, 밸류맵', '미제공', '해당 없음'],
    ]
    story.append(make_table(
        ['기능 영역', '경쟁 서비스', 'VESTRA', '평가'],
        positioning,
        [30*mm, 52*mm, 52*mm, 36*mm]
    ))
    story.append(Spacer(1, 5*mm))

    story.append(Paragraph('3.2 기술 수준 비교', styles['h2']))
    tech_compare = [
        ['예측 모델', '단일 모델 또는 독자 지수', '5모델 앙상블 (선형회귀, 평균회귀, 모멘텀, ARIMA, 거시경제)', '우위'],
        ['데이터 규모', '전국 단위 대규모 DB', '실거래 36개월 + 공공 API 실시간', '열세'],
        ['NLP/LLM 활용', '매물 검색 자연어 처리', '계약서/등기부 분석 + 의견 생성', '동급'],
        ['위험도 모델', '기본 점수 또는 미제공', 'V-Score 5개 소스 통합 + Gradient Boosting', '우위'],
        ['백테스트/검증', '대부분 미제공', 'MAPE/RMSE/정확도 + 이상치 감지', '우위'],
    ]
    story.append(make_table(
        ['영역', '기존 서비스', 'VESTRA', '평가'],
        tech_compare,
        [28*mm, 48*mm, 60*mm, 34*mm]
    ))
    story.append(PageBreak())

    # ─── 4. VESTRA 상세 분석 ───
    story.append(Paragraph('4. VESTRA 플랫폼 상세 분석', styles['h1']))
    story.append(HRFlowable(width=W, color=NAVY, thickness=1.5, spaceAfter=4*mm))

    story.append(Paragraph('4.1 영역별 완성도', styles['h2']))
    completeness = [
        ['UI/UX (페이지)', '80~85%', '핵심 기능 완성, 세부 UI 정제 필요'],
        ['API 라우트 구현', '85~90%', '핵심 분석 API 정교함, 부가 기능 일부 목업'],
        ['비즈니스 로직 (lib/)', '88~92%', '거의 모든 모듈이 정교하게 구현'],
        ['DB 스키마 설계', '95%', '매우 체계적, 인덱싱 최적화'],
        ['외부 API 연동', '70%', '핵심 3개 정상, 부가 기능 미연동'],
        ['인증 시스템', '90%', 'Google/Kakao/Naver OAuth + 감사 로그'],
        ['결제 시스템', '40%', '구독 모델만 존재, PG 미연동'],
    ]
    story.append(make_table(
        ['영역', '완성도', '상세'],
        completeness,
        [40*mm, 25*mm, 105*mm]
    ))
    story.append(Spacer(1, 5*mm))

    story.append(Paragraph('4.2 핵심 AI/ML 엔진', styles['h2']))
    engines = [
        ['prediction-engine', '5모델 앙상블 예측 + 월별 시계열 + 시장사이클', '정교함'],
        ['risk-scoring', '100점 감점 방식, 13개 위험요소, A~F 등급', '정교함'],
        ['fraud-risk-model', '15개 피처 Gradient Boosting + SHAP 기여도', '정교함'],
        ['v-score', '5개 소스 통합 위험도 + 6개 비선형 규칙', '정교함'],
        ['contract-analyzer', '45개 조항 규칙 + 부재 조항 감지', '정교함'],
        ['registry-parser', '정규식 등기부등본 파싱 + 위험 분류', '정교함'],
        ['anomaly-detector', 'Holt-Winters, Bollinger, CUSUM, Z-Score', '정교함'],
        ['backtesting', 'MAPE, RMSE, 12개월 정확도', '정교함'],
    ]
    story.append(make_table(
        ['엔진', '설명', '수준'],
        engines,
        [38*mm, 110*mm, 22*mm]
    ))
    story.append(PageBreak())

    # ─── 5. SWOT ───
    story.append(Paragraph('5. SWOT 분석', styles['h1']))
    story.append(HRFlowable(width=W, color=NAVY, thickness=1.5, spaceAfter=4*mm))

    # Strengths
    story.append(Paragraph('Strengths (강점)', styles['h2']))
    for s in [
        '등기부등본/권리관계/계약서 AI 분석 — 시장 공백 영역 독점적 기술 보유',
        '5모델 앙상블 + 백테스트 검증 — B2C 시세전망 서비스 중 최고 수준',
        'V-Score 통합 위험도 + 15개 피처 사기탐지 — 민간 전세 안전 서비스 선점',
        '실제 공공 API 연동 (국토부, 한국은행, 대법원) — 데이터 신뢰도 확보',
        '54개 비즈니스 로직 모듈 — 높은 기술적 성숙도 (완성도 88%)',
    ]:
        story.append(Paragraph(f'  +  {s}', styles['bullet']))

    story.append(Spacer(1, 3*mm))
    story.append(Paragraph('Weaknesses (약점)', styles['h2']))
    for w in [
        'PG 결제 미구현 — 수익화 불가 상태',
        '사용자 기반 0 — 신규 서비스로 시장 인지도 부재',
        '데이터 규모 열세 — 빅밸류/밸류맵 대비 자체 데이터 부족',
        '일부 API 목업 상태 — 공급량, 건축물대장, 신용조회 미연동',
        '1인 개발 — 운영/유지보수 인력 리스크',
    ]:
        story.append(Paragraph(f'  -  {w}', styles['bullet']))

    story.append(Spacer(1, 3*mm))
    story.append(Paragraph('Opportunities (기회)', styles['h2']))
    for o in [
        '정부 안심전세앱 2026.9 출시 전 민간 선점 기회',
        '전세사기 사회 이슈 지속 — 전세 안전성 분석 수요 증가',
        '기존 프롭테크는 매물 검색/AVM 집중 — 분석/의사결정 시장 공백',
        'AI 규제 완화 추세 — 부동산 AI 서비스 성장 환경',
        'B2B 수요 (법무사/감정평가사/중개사) — 전문가 시장 진입 가능',
    ]:
        story.append(Paragraph(f'  *  {o}', styles['bullet']))

    story.append(Spacer(1, 3*mm))
    story.append(Paragraph('Threats (위협)', styles['h2']))
    for t in [
        '직방/다방의 AI 강화 — 대형 플랫폼의 분석 기능 추가 가능성',
        '정부 공공 서비스 확대 — 안심전세앱이 민간 수요 흡수 가능',
        '빅밸류/밸류맵의 B2C 전환 — AVM 기술의 소비자 시장 진출',
        '공공 API 정책 변경 — 데이터 소스 접근 제한 리스크',
        '부동산 시장 침체 — 전반적 프롭테크 수요 감소 가능',
    ]:
        story.append(Paragraph(f'  !  {t}', styles['bullet']))
    story.append(PageBreak())

    # ─── 6. 전략 제언 ───
    story.append(Paragraph('6. 전략 제언', styles['h1']))
    story.append(HRFlowable(width=W, color=NAVY, thickness=1.5, spaceAfter=4*mm))

    story.append(Paragraph('6.1 단기 (1~3개월)', styles['h2']))
    for item in [
        'PG 결제 연동 (토스페이먼츠/아임포트) — 수익화 기반 구축',
        '전세 안전성 분석 집중 마케팅 — 사회적 이슈와 연계한 사용자 확보',
        '베타 테스트 운영 — 실사용자 피드백 수집 및 UI 정제',
    ]:
        story.append(Paragraph(f'  1.  {item}', styles['bullet']))

    story.append(Spacer(1, 3*mm))
    story.append(Paragraph('6.2 중기 (3~6개월)', styles['h2']))
    for item in [
        'B2B API 서비스화 — 법무사/감정평가사/중개사 대상 API 제공',
        '모바일 앱 출시 — React Native 기반 크로스플랫폼',
        '데이터 파트너십 — 공공/민간 데이터 소스 확대',
    ]:
        story.append(Paragraph(f'  2.  {item}', styles['bullet']))

    story.append(Spacer(1, 3*mm))
    story.append(Paragraph('6.3 장기 (6~12개월)', styles['h2']))
    for item in [
        '특허 출원 — V-Score, 앙상블 예측 모델, 등기부등본 AI 파싱 알고리즘',
        'AI 에이전트 고도화 — 자율적 위험 모니터링 및 알림 시스템',
        '동남아/일본 시장 진출 — 부동산 분석 플랫폼 해외 확장',
    ]:
        story.append(Paragraph(f'  3.  {item}', styles['bullet']))

    story.append(Spacer(1, 8*mm))
    story.append(HRFlowable(width=W, color=BLUE, thickness=1, spaceAfter=4*mm))

    # 결론 박스
    story.append(Paragraph('결론', styles['h2']))
    story.append(Paragraph(
        'VESTRA는 기술 수준에서 기존 프롭테크 대비 동급 이상이며, '
        '등기부등본/권리분석/계약서 AI 분석은 시장에 없는 독보적 기능입니다. '
        '전세 안전성 분석은 정부 서비스 출시(2026.9) 전 민간 선점 기회가 있습니다. '
        '현재 단계는 베타/데모 수준이며, PG 결제 연동과 사용자 확보가 '
        '상용화를 위한 핵심 과제입니다.',
        styles['body']
    ))

    story.append(Spacer(1, 15*mm))
    story.append(Paragraph('BMI C&amp;S  |  VESTRA Team', ParagraphStyle('end', fontName='Gothic', fontSize=9, textColor=GRAY, alignment=TA_CENTER)))

    doc.build(story, onFirstPage=add_footer, onLaterPages=add_footer)
    print(f'PDF 생성 완료: {output_path}')
    return output_path

if __name__ == '__main__':
    build()
