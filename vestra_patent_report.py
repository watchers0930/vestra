#!/usr/bin/env python3
"""Vestra 특허 기술 리포트 PDF 생성"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY

# ── 한글 폰트 등록 ──
import subprocess, os

# Arial Unicode (macOS - 한글 지원)
font_path = "/Library/Fonts/Arial Unicode.ttf"
pdfmetrics.registerFont(TTFont("Korean", font_path))
pdfmetrics.registerFont(TTFont("KoreanBold", font_path))  # Bold 없으므로 동일 폰트 사용

FONT = "Korean"
FONT_BOLD = "KoreanBold"

# ── 색상 ──
PRIMARY = HexColor("#1a365d")      # 네이비
ACCENT = HexColor("#2563eb")       # 블루
LIGHT_BG = HexColor("#f0f4ff")     # 연한 배경
DARK_TEXT = HexColor("#1e293b")    # 본문 텍스트
MID_TEXT = HexColor("#475569")     # 보조 텍스트
LINE_COLOR = HexColor("#cbd5e1")   # 구분선
WHITE = HexColor("#ffffff")

# ── 스타일 정의 ──
styles = {
    "title": ParagraphStyle("Title", fontName=FONT_BOLD, fontSize=22, leading=30,
                            textColor=PRIMARY, spaceAfter=4, alignment=TA_LEFT),
    "subtitle": ParagraphStyle("Subtitle", fontName=FONT, fontSize=11, leading=16,
                               textColor=MID_TEXT, spaceAfter=20, alignment=TA_LEFT),
    "h1": ParagraphStyle("H1", fontName=FONT_BOLD, fontSize=16, leading=22,
                         textColor=PRIMARY, spaceBefore=24, spaceAfter=10),
    "h2": ParagraphStyle("H2", fontName=FONT_BOLD, fontSize=13, leading=18,
                         textColor=ACCENT, spaceBefore=16, spaceAfter=6),
    "h3": ParagraphStyle("H3", fontName=FONT_BOLD, fontSize=11, leading=15,
                         textColor=DARK_TEXT, spaceBefore=10, spaceAfter=4),
    "body": ParagraphStyle("Body", fontName=FONT, fontSize=10, leading=16,
                           textColor=DARK_TEXT, spaceAfter=6, alignment=TA_JUSTIFY),
    "bullet": ParagraphStyle("Bullet", fontName=FONT, fontSize=10, leading=16,
                             textColor=DARK_TEXT, spaceAfter=4, leftIndent=16,
                             bulletIndent=6, bulletFontName=FONT),
    "sub_bullet": ParagraphStyle("SubBullet", fontName=FONT, fontSize=9.5, leading=14,
                                 textColor=MID_TEXT, spaceAfter=3, leftIndent=32,
                                 bulletIndent=20, bulletFontName=FONT),
    "footer": ParagraphStyle("Footer", fontName=FONT, fontSize=8, leading=10,
                             textColor=MID_TEXT, alignment=TA_CENTER),
}

def add_header_line(story):
    story.append(HRFlowable(width="100%", thickness=1, color=LINE_COLOR,
                            spaceBefore=2, spaceAfter=10))

def add_section(story, title, content_blocks):
    """섹션 추가: title + content_blocks"""
    story.append(Paragraph(title, styles["h1"]))
    add_header_line(story)
    for block in content_blocks:
        if isinstance(block, tuple):
            style_name, text = block
            story.append(Paragraph(text, styles[style_name]))
        else:
            story.append(block)

# ── PDF 생성 ──
output_path = "/Users/watchers/Desktop/Vestra_특허기술_리포트.pdf"

doc = SimpleDocTemplate(
    output_path, pagesize=A4,
    topMargin=25*mm, bottomMargin=25*mm,
    leftMargin=22*mm, rightMargin=22*mm,
)

story = []

# ═══ 표지 ═══
story.append(Spacer(1, 60))
story.append(Paragraph("VESTRA", ParagraphStyle("Logo", fontName=FONT_BOLD, fontSize=36,
                                                 textColor=ACCENT, spaceAfter=2)))
story.append(Paragraph("Verified Estate Safety through Trusted Real-time AI",
                       ParagraphStyle("Tagline", fontName=FONT, fontSize=10,
                                      textColor=MID_TEXT, spaceAfter=30)))
story.append(HRFlowable(width="100%", thickness=2, color=ACCENT, spaceAfter=20))
story.append(Paragraph("기술 리포트: 특허 기술 및 리스크 관리 전략",
                       styles["title"]))
story.append(Paragraph("Technical Report: Patent Technologies and Risk Management",
                       styles["subtitle"]))
story.append(Spacer(1, 30))

# 문서 정보 테이블
info_data = [
    ["문서 분류", "기술 리포트 (Technical Report)"],
    ["버전", "v1.0"],
    ["작성일", "2026년 4월 1일"],
    ["보안 등급", "대외비 (Confidential)"],
    ["작성", "VESTRA AI 기술팀"],
]
info_table = Table(info_data, colWidths=[100, 300])
info_table.setStyle(TableStyle([
    ("FONTNAME", (0, 0), (0, -1), FONT_BOLD),
    ("FONTNAME", (1, 0), (1, -1), FONT),
    ("FONTSIZE", (0, 0), (-1, -1), 10),
    ("TEXTCOLOR", (0, 0), (0, -1), MID_TEXT),
    ("TEXTCOLOR", (1, 0), (1, -1), DARK_TEXT),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ("TOPPADDING", (0, 0), (-1, -1), 8),
    ("LINEBELOW", (0, 0), (-1, -2), 0.5, LINE_COLOR),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
]))
story.append(info_table)
story.append(PageBreak())

# ═══ 1. 개요 ═══
add_section(story, "1. 개요", [
    ("body", "본 리포트는 VESTRA의 핵심 특허 기술을 개괄하고, 각 기술이 생태계 내에서 수행하는 "
             "기능적 역할을 설명합니다. 또한 사고 발생 시 대응(Mitigation) 전략과 "
             "예방적 유지보수(Prevention) 방안을 포함한 전략적 프레임워크를 제공합니다."),
    ("body", "VESTRA는 부동산 거래 안전을 위한 AI 기반 검증 플랫폼으로, 실시간 모니터링, "
             "적응형 암호화, 분산 데이터 무결성 원장 등 세 가지 핵심 특허 기술을 기반으로 합니다."),
])

# ═══ 2. 특허 기술 분석 ═══
story.append(Spacer(1, 10))
story.append(Paragraph("2. 특허 기술 분석", styles["h1"]))
add_header_line(story)

# ── 2-A. 지능형 실시간 모니터링 시스템 ──
story.append(Paragraph("A. 지능형 실시간 모니터링 시스템", styles["h2"]))
story.append(Paragraph("(Intelligent Real-Time Monitoring System)", styles["sub_bullet"]))

story.append(Paragraph("역할", styles["h3"]))
story.append(Paragraph(
    "엣지 컴퓨팅과 AI 알고리즘을 활용하여 네트워크 트래픽 및 하드웨어 상태를 실시간으로 모니터링합니다. "
    "설정된 기준선에서 벗어나는 이상 징후를 자동으로 식별합니다.",
    styles["body"]))

story.append(Paragraph("사고 대응 (Mitigation)", styles["h3"]))
story.append(Paragraph("• <b>즉시 격리</b>: 영향을 받은 노드를 자동으로 격리하여 위협의 횡적 이동을 차단합니다.",
                       styles["bullet"]))
story.append(Paragraph("• <b>동적 라우팅 전환</b>: 데이터 트래픽을 보안 백업 채널로 리다이렉트하여 서비스 연속성을 유지합니다.",
                       styles["bullet"]))

story.append(Paragraph("예방 전략 (Prevention)", styles["h3"]))
story.append(Paragraph("• <b>지속적 학습</b>: 새로운 위협 패턴으로 AI 학습 데이터셋을 정기적으로 업데이트합니다.",
                       styles["bullet"]))
story.append(Paragraph("• <b>예측 유지보수</b>: 시스템이 분석한 MTBF(평균 고장 간격) 데이터를 기반으로 하드웨어 점검을 스케줄링합니다.",
                       styles["bullet"]))

story.append(Spacer(1, 8))

# ── 2-B. 적응형 암호화 프로토콜 (AEP) ──
story.append(Paragraph("B. 적응형 암호화 프로토콜 (AEP)", styles["h2"]))
story.append(Paragraph("(Adaptive Encryption Protocol)", styles["sub_bullet"]))

story.append(Paragraph("역할", styles["h3"]))
story.append(Paragraph(
    "데이터의 민감도와 전송 환경의 인지된 보안 수준에 따라 암호화 강도를 동적으로 조정합니다.",
    styles["body"]))

story.append(Paragraph("사고 대응 (Mitigation)", styles["h3"]))
story.append(Paragraph("• <b>키 로테이션</b>: 잠재적 유출이 감지되면 긴급 암호화 키 교체를 실행합니다.",
                       styles["bullet"]))
story.append(Paragraph("• <b>프로토콜 에스컬레이션</b>: 경보 발생 시 모든 활성 세션에 최대 비트 길이 암호화(예: AES-256)를 강제 적용합니다.",
                       styles["bullet"]))

story.append(Paragraph("예방 전략 (Prevention)", styles["h3"]))
story.append(Paragraph("• <b>제로 트러스트 검증</b>: 네트워크 위치에 관계없이 모든 접근 요청에 대해 엄격한 신원 확인을 구현합니다.",
                       styles["bullet"]))
story.append(Paragraph("• <b>정기 감사</b>: 암호화 핸드셰이크 프로세스에 대한 자동화된 취약점 스캔을 수행합니다.",
                       styles["bullet"]))

story.append(Spacer(1, 8))

# ── 2-C. 분산 데이터 무결성 원장 ──
story.append(Paragraph("C. 분산 데이터 무결성 원장", styles["h2"]))
story.append(Paragraph("(Decentralized Data Integrity Ledger)", styles["sub_bullet"]))

story.append(Paragraph("역할", styles["h3"]))
story.append(Paragraph(
    "분산 네트워크에 무결성 로그를 배포하여 데이터 진본성을 보장하고 무단 수정을 방지합니다.",
    styles["body"]))

story.append(Paragraph("사고 대응 (Mitigation)", styles["h3"]))
story.append(Paragraph("• <b>롤백 메커니즘</b>: 손상된 데이터를 불변 원장에 기록된 마지막 검증 상태로 복원합니다.",
                       styles["bullet"]))
story.append(Paragraph("• <b>합의 검증</b>: 피어 노드 검증을 사용하여 악의적인 데이터 항목을 식별하고 무시합니다.",
                       styles["bullet"]))

story.append(Paragraph("예방 전략 (Prevention)", styles["h3"]))
story.append(Paragraph("• <b>중복성 최적화</b>: 51% 공격에 대한 원장의 견고성을 보장하기 위해 높은 노드 가용성을 유지합니다.",
                       styles["bullet"]))
story.append(Paragraph("• <b>무결성 샤딩</b>: 데이터를 샤드로 분할하여 단일 지점 침해의 영향을 최소화합니다.",
                       styles["bullet"]))

story.append(PageBreak())

# ── 2-D. 등기 공백 실시간 감시 시스템 (Registration Gap Monitoring) ──
story.append(Paragraph("D. 등기 공백 실시간 감시 시스템", styles["h2"]))
story.append(Paragraph("(Registration Gap Real-Time Monitoring System)", styles["sub_bullet"]))

story.append(Paragraph("문제 정의", styles["h3"]))
story.append(Paragraph(
    "전세 계약 체결 후 세입자가 전입신고 및 확정일자를 받기까지 통상 1~7일의 시간 공백이 발생합니다. "
    "이 '등기 공백(Registration Gap)' 기간 동안 집주인이 새로운 근저당을 설정하거나 "
    "소유권을 이전하면, 세입자의 보증금은 후순위로 밀려 회수가 불가능해집니다. "
    "이는 전세사기의 가장 대표적인 수법 중 하나입니다.",
    styles["body"]))

story.append(Paragraph("역할", styles["h3"]))
story.append(Paragraph(
    "계약 체결 시점의 등기부 상태를 기준 스냅샷(Baseline Snapshot)으로 저장하고, "
    "전입신고 완료 시점까지 주기적으로 등기부를 재조회하여 변동 사항을 실시간 감지합니다. "
    "CODEF API를 통한 자동화된 등기 조회와 SHA-256 해시 비교 알고리즘을 결합하여 "
    "미세한 변동도 놓치지 않습니다.",
    styles["body"]))

story.append(Paragraph("핵심 기술 구성", styles["h3"]))
story.append(Paragraph("• <b>기준 스냅샷 저장</b>: 계약 체결 시 등기부 전체를 SHA-256 해시로 저장하여 변동 비교 기준점을 확보합니다.",
                       styles["bullet"]))
story.append(Paragraph("• <b>주기적 자동 재조회</b>: Cron 스케줄러가 매일 등기부를 자동으로 재조회하며, "
                       "계약~전입 기간에는 조회 빈도를 강화(1일 2회)합니다.",
                       styles["bullet"]))
story.append(Paragraph("• <b>변동 유형 자동 분류</b>: 근저당 추가(mortgage_added), 압류(seizure_added), "
                       "소유권 이전(ownership_changed), 경매 개시(auction_started), 전세권 변동(lease_right_changed) "
                       "등 5가지 유형으로 자동 분류합니다.",
                       styles["bullet"]))
story.append(Paragraph("• <b>위험도 자동 산정</b>: 변동 유형에 따라 low → medium → high → critical 4단계로 "
                       "위험도를 자동 산정하고, high 이상 시 즉시 푸시 알림을 발송합니다.",
                       styles["bullet"]))

story.append(Paragraph("감시 타임라인 (사용자 시나리오)", styles["h3"]))
timeline_data = [
    [Paragraph("<b>시점</b>", styles["body"]),
     Paragraph("<b>시스템 동작</b>", styles["body"]),
     Paragraph("<b>결과</b>", styles["body"])],
    [Paragraph("Day 0", styles["body"]),
     Paragraph("계약 체결 → 등기부 기준 스냅샷 저장", styles["body"]),
     Paragraph("SHA-256 해시 기준점 확보", styles["body"])],
    [Paragraph("Day 1", styles["body"]),
     Paragraph("자동 등기 재조회 (오전 9시)", styles["body"]),
     Paragraph("변동 없음 — 안전 상태 유지", styles["body"])],
    [Paragraph("Day 2", styles["body"]),
     Paragraph("자동 재조회 → 근저당 2억 신규 설정 감지", styles["body"]),
     Paragraph("즉시 푸시 알림 + 법률 상담 권고", styles["body"])],
    [Paragraph("Day 3", styles["body"]),
     Paragraph("전입신고 완료 → 감시 모드 종료", styles["body"]),
     Paragraph("최종 안전 리포트 생성", styles["body"])],
]
timeline_table = Table(timeline_data, colWidths=[50, 220, 190])
timeline_table.setStyle(TableStyle([
    ("FONTNAME", (0, 0), (-1, -1), FONT),
    ("FONTSIZE", (0, 0), (-1, -1), 9),
    ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
    ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
    ("GRID", (0, 0), (-1, -1), 0.5, LINE_COLOR),
    ("TOPPADDING", (0, 0), (-1, -1), 6),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [LIGHT_BG, WHITE]),
]))
story.append(timeline_table)

story.append(Paragraph("사고 대응 (Mitigation)", styles["h3"]))
story.append(Paragraph("• <b>즉시 알림 발송</b>: 근저당/압류/소유권 이전 감지 시 Web Push 및 알림톡으로 즉시 통보합니다.",
                       styles["bullet"]))
story.append(Paragraph("• <b>채권 초과 자동 분석</b>: 신규 담보 설정으로 선순위 채권이 시세의 70%를 초과하면 "
                       "'보증금 회수 불가 위험' 경고를 발령합니다.",
                       styles["bullet"]))
story.append(Paragraph("• <b>법률 대응 가이드</b>: 변동 유형별 맞춤 법률 대응 방안(계약 해지, 내용증명, 가처분 신청 등)을 "
                       "AI가 자동으로 생성하여 제공합니다.",
                       styles["bullet"]))
story.append(Paragraph("• <b>dgon 긴급 등기 연계</b>: 위험 감지 시 dgon 플랫폼으로 긴급 전세권 설정 등기를 "
                       "원클릭으로 진행할 수 있도록 연계합니다.",
                       styles["bullet"]))

story.append(Paragraph("예방 전략 (Prevention)", styles["h3"]))
story.append(Paragraph("• <b>계약 전 사전 분석</b>: 계약 체결 전 등기부 13단계 정밀 분석으로 잠재 위험을 사전에 차단합니다.",
                       styles["bullet"]))
story.append(Paragraph("• <b>집주인 이력 프로파일</b>: 집주인의 다른 물건 소유 현황, 과거 담보 설정 패턴을 분석하여 "
                       "반복 사기범을 사전에 식별합니다.",
                       styles["bullet"]))
story.append(Paragraph("• <b>보증보험 가입 연계</b>: HUG/HF/SGI 보증보험 가입 가능 여부를 자동 판단하고, "
                       "가입 절차를 안내하여 보증금을 보호합니다.",
                       styles["bullet"]))

story.append(Spacer(1, 8))

# ── 2-E. dgon 등기 실행 연계 시스템 ──
story.append(Paragraph("E. dgon 등기 실행 연계 시스템", styles["h2"]))
story.append(Paragraph("(dgon Registry Execution Integration System)", styles["sub_bullet"]))

story.append(Paragraph("역할", styles["h3"]))
story.append(Paragraph(
    "VESTRA의 AI 분석('진단') 결과를 dgon 등기 플랫폼('실행')으로 끊김 없이 연결하여, "
    "사용자가 분석부터 등기까지 원스톱(One-Stop)으로 처리할 수 있는 통합 부동산 거래 인프라를 구현합니다. "
    "PG사(Payment Gateway) 패턴의 토큰 교환 방식을 채택하여 두 플랫폼이 독립적으로 운영되면서도 "
    "안전하게 데이터를 교환합니다.",
    styles["body"]))

story.append(Paragraph("핵심 기술 구성", styles["h3"]))
story.append(Paragraph("• <b>토큰 기반 데이터 교환</b>: VESTRA가 분석 완료 시 일회용 암호화 토큰(vtk_*)을 생성하고, "
                       "dgon이 토큰을 검증하여 물건 정보를 자동으로 수신합니다. 토큰은 15분 후 만료됩니다.",
                       styles["bullet"]))
story.append(Paragraph("• <b>위험도 기반 등기 유형 추천</b>: AI 분석 결과의 위험도 점수에 따라 최적의 등기 유형을 자동 추천합니다.",
                       styles["bullet"]))
story.append(Paragraph("    - 위험도 85 이상 + 단순 구조 → 셀프등기 추천 (비용 절감)",
                       styles["sub_bullet"]))
story.append(Paragraph("    - 위험도 60~84 → 전자등기 추천 (균형)",
                       styles["sub_bullet"]))
story.append(Paragraph("    - 위험도 60 미만 또는 복잡 구조 → 프리미엄등기 추천 (전문가 검토)",
                       styles["sub_bullet"]))
story.append(Paragraph("• <b>콜백 기반 상태 동기화</b>: dgon에서 등기 완료 시 VESTRA로 콜백을 전송하여 "
                       "포트폴리오에 등기 완료 상태를 자동 반영합니다.",
                       styles["bullet"]))
story.append(Paragraph("• <b>폼 프리필(Pre-fill)</b>: 분석된 물건 정보(주소, 소유자, 면적, 시세 등)를 "
                       "dgon 등기 신청서에 자동 입력하여 사용자의 재입력 부담을 제거합니다.",
                       styles["bullet"]))

story.append(Paragraph("연계 프로세스", styles["h3"]))
process_data = [
    [Paragraph("<b>단계</b>", styles["body"]),
     Paragraph("<b>플랫폼</b>", styles["body"]),
     Paragraph("<b>동작</b>", styles["body"])],
    [Paragraph("1", styles["body"]),
     Paragraph("VESTRA", styles["body"]),
     Paragraph("등기부 분석 완료 → 일회용 토큰 생성 (vtk_abc123)", styles["body"])],
    [Paragraph("2", styles["body"]),
     Paragraph("VESTRA → dgon", styles["body"]),
     Paragraph("토큰 포함 리다이렉트 (dgon.vercel.app/from-vestra)", styles["body"])],
    [Paragraph("3", styles["body"]),
     Paragraph("dgon → VESTRA", styles["body"]),
     Paragraph("토큰 검증 API 호출 → 물건정보/위험도/추천등기유형 수신", styles["body"])],
    [Paragraph("4", styles["body"]),
     Paragraph("dgon", styles["body"]),
     Paragraph("폼 프리필 → 서류 안내 → 견적 확인 → 결제 → 등기 접수", styles["body"])],
    [Paragraph("5", styles["body"]),
     Paragraph("dgon → VESTRA", styles["body"]),
     Paragraph("콜백: 등기 완료 상태 + 등기번호 전송", styles["body"])],
    [Paragraph("6", styles["body"]),
     Paragraph("VESTRA", styles["body"]),
     Paragraph("포트폴리오에 등기 완료 기록 + 감시 모드 전환", styles["body"])],
]
process_table = Table(process_data, colWidths=[35, 90, 335])
process_table.setStyle(TableStyle([
    ("FONTNAME", (0, 0), (-1, -1), FONT),
    ("FONTSIZE", (0, 0), (-1, -1), 9),
    ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
    ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
    ("GRID", (0, 0), (-1, -1), 0.5, LINE_COLOR),
    ("TOPPADDING", (0, 0), (-1, -1), 6),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [LIGHT_BG, WHITE]),
]))
story.append(process_table)

story.append(Paragraph("사고 대응 (Mitigation)", styles["h3"]))
story.append(Paragraph("• <b>긴급 등기 연계</b>: 등기 공백 감시에서 위험 감지 시 dgon 긴급 전세권 설정 등기를 즉시 연계합니다.",
                       styles["bullet"]))
story.append(Paragraph("• <b>등기 상태 추적</b>: 등기 접수 후 진행 상태를 실시간으로 VESTRA에 동기화합니다.",
                       styles["bullet"]))

story.append(Paragraph("예방 전략 (Prevention)", styles["h3"]))
story.append(Paragraph("• <b>사전 등기 준비</b>: 계약 체결 전 필요 서류를 사전 안내하여 전입신고 즉시 등기 진행이 가능하도록 합니다.",
                       styles["bullet"]))
story.append(Paragraph("• <b>등기 완료 후 감시 전환</b>: 등기 완료 후 자동으로 등기 변동 감시 모드로 전환하여 지속적 보호를 제공합니다.",
                       styles["bullet"]))

story.append(PageBreak())

# ═══ 3. 사고 관리 및 예방 프레임워크 ═══
story.append(Paragraph("3. 사고 관리 및 예방 프레임워크", styles["h1"]))
add_header_line(story)

table_data = [
    [Paragraph("<b>구분</b>", styles["body"]),
     Paragraph("<b>대응 조치 (Mitigation)</b>", styles["body"]),
     Paragraph("<b>예방 방법 (Prevention)</b>", styles["body"])],
    [Paragraph("사이버 침입", styles["body"]),
     Paragraph("의심스러운 세션을 종료하고 '허니팟' 트랩을 활성화합니다.", styles["body"]),
     Paragraph("AI 기반 행동 분석 및 다중 인증(MFA)을 구현합니다.", styles["body"])],
    [Paragraph("시스템 장애", styles["body"]),
     Paragraph("50ms 이내에 이중화 클라우드 서버로 페일오버합니다.", styles["body"]),
     Paragraph("정기적인 스트레스 테스트 및 열 관리 모니터링을 수행합니다.", styles["body"])],
    [Paragraph("데이터 손상", styles["body"]),
     Paragraph("무결성 원장을 사용하여 자동 복원합니다.", styles["body"]),
     Paragraph("모든 정적 데이터베이스 항목에 대한 주기적 암호화 해싱을 수행합니다.", styles["body"])],
    [Paragraph("등기 공백 악용", styles["body"]),
     Paragraph("변동 감지 즉시 알림 + dgon 긴급 등기 연계로 전세권을 확보합니다.", styles["body"]),
     Paragraph("계약~전입 기간 강화 감시(1일 2회) + 보증보험 가입 사전 안내를 수행합니다.", styles["body"])],
]

framework_table = Table(table_data, colWidths=[80, 190, 190])
framework_table.setStyle(TableStyle([
    ("FONTNAME", (0, 0), (-1, -1), FONT),
    ("FONTSIZE", (0, 0), (-1, -1), 9),
    ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
    ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
    ("BACKGROUND", (0, 1), (-1, -1), LIGHT_BG),
    ("GRID", (0, 0), (-1, -1), 0.5, LINE_COLOR),
    ("TOPPADDING", (0, 0), (-1, -1), 8),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ("LEFTPADDING", (0, 0), (-1, -1), 10),
    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [LIGHT_BG, WHITE]),
]))
story.append(framework_table)

# ═══ 4. 결론 ═══
story.append(Spacer(1, 20))
add_section(story, "4. 결론", [
    ("body", "VESTRA의 특허 기술은 단순한 성능 향상이 아닌, <b>복원력(Resilience)</b>을 위해 설계되었습니다. "
             "자동화된 대응 프로토콜과 사전 예방적 조치를 통합함으로써, "
             "시스템은 높은 수준의 보안성과 운영 가동률을 보장합니다."),
    ("body", "특히 <b>등기 공백 실시간 감시 시스템</b>은 전세사기의 가장 위험한 시간대를 "
             "기술적으로 차단하는 핵심 특허 기술입니다. 계약 체결부터 전입신고까지의 "
             "공백 기간을 AI가 24시간 감시하고, 위험 감지 시 dgon 등기 플랫폼과의 "
             "즉각적인 연계를 통해 전세권 확보까지 원스톱으로 처리합니다."),
    ("body", "VESTRA('진단')와 dgon('실행')의 연계는 PG사 패턴의 토큰 교환 방식으로 "
             "두 플랫폼의 독립성을 유지하면서도 끊김 없는 사용자 경험을 제공합니다. "
             "이는 부동산 거래 안전이라는 VESTRA의 핵심 미션을 기술적으로 완성하는 "
             "마지막 퍼즐입니다."),
])

# ═══ 부록: 구현 가이드 ═══
story.append(Spacer(1, 20))
add_section(story, "부록: 구현 가이드", [
    ("body", "<b>문서 형식</b>: Markdown (.md) — 문서 폴더에서 구조화된 관리를 위해 위 헤더 구조를 유지합니다."),
    ("body", "<b>변수 매핑</b>: 대시보드에 통합 시 '역할' 섹션을 툴팁의 기반으로, "
             "'대응 조치' 섹션을 에러 핸들링 로직의 기반으로 활용합니다."),
    ("body", "<b>모니터링 연동</b>: 각 기술의 상태 지표를 실시간 대시보드에 표시하여 "
             "운영팀이 즉시 이상 징후를 인지하고 대응할 수 있도록 합니다."),
])

# ── 하단 면책 ──
story.append(Spacer(1, 40))
story.append(HRFlowable(width="100%", thickness=0.5, color=LINE_COLOR, spaceAfter=8))
story.append(Paragraph(
    "© 2026 VESTRA. All rights reserved. 본 문서는 대외비이며 무단 배포를 금합니다.",
    styles["footer"]))

# ── 빌드 ──
doc.build(story)
print(f"✅ PDF 생성 완료: {output_path}")
