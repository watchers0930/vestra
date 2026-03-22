#!/usr/bin/env python3
"""VESTRA 기술보고서 마크다운 -> PDF 변환 (Paperlogy 폰트)"""

import re
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Preformatted, Flowable, HRFlowable
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# -- 페이퍼로지 폰트 등록 --
FONT_DIR = '/Users/watchers/Library/Fonts'
pdfmetrics.registerFont(TTFont('Paperlogy', f'{FONT_DIR}/Paperlogy-4Regular.ttf'))
pdfmetrics.registerFont(TTFont('PaperlogySB', f'{FONT_DIR}/Paperlogy-6SemiBold.ttf'))
pdfmetrics.registerFont(TTFont('PaperlogyBold', f'{FONT_DIR}/Paperlogy-7Bold.ttf'))
pdfmetrics.registerFont(TTFont('PaperlogyLight', f'{FONT_DIR}/Paperlogy-3Light.ttf'))
pdfmetrics.registerFont(TTFont('PaperlogyBlack', f'{FONT_DIR}/Paperlogy-9Black.ttf'))

BODY_FONT = 'Paperlogy'
SEMI_FONT = 'PaperlogySB'
BOLD_FONT = 'PaperlogyBold'
BLACK_FONT = 'PaperlogyBlack'
LIGHT_FONT = 'PaperlogyLight'
CODE_FONT = 'Courier'

# -- 색상 --
PRIMARY = HexColor('#111827')
ACCENT = HexColor('#1e40af')
BORDER = HexColor('#d1d5db')
CODE_BG = HexColor('#f3f4f6')
TH_BG = HexColor('#1e293b')
ALT_BG = HexColor('#f8fafc')

styles = getSampleStyleSheet()

s_title = ParagraphStyle('T', fontName=BLACK_FONT, fontSize=22, leading=30,
                         textColor=PRIMARY, spaceAfter=4*mm, alignment=TA_CENTER)
s_h2 = ParagraphStyle('H2', fontName=BOLD_FONT, fontSize=15, leading=21,
                       textColor=PRIMARY, spaceBefore=8*mm, spaceAfter=4*mm)
s_h3 = ParagraphStyle('H3', fontName=SEMI_FONT, fontSize=12, leading=17,
                       textColor=ACCENT, spaceBefore=5*mm, spaceAfter=2.5*mm)
s_h4 = ParagraphStyle('H4', fontName=SEMI_FONT, fontSize=10.5, leading=15,
                       textColor=HexColor('#374151'), spaceBefore=3*mm, spaceAfter=2*mm)
s_body = ParagraphStyle('B', fontName=BODY_FONT, fontSize=9.5, leading=15,
                         textColor=HexColor('#1f2937'), spaceAfter=2*mm, alignment=TA_JUSTIFY)
s_bullet = ParagraphStyle('BL', parent=s_body, leftIndent=8*mm, bulletIndent=3*mm,
                           spaceBefore=0.8*mm, spaceAfter=0.8*mm)
s_code = ParagraphStyle('CD', fontName=BODY_FONT, fontSize=7.8, leading=11.5,
                         textColor=HexColor('#1f2937'), backColor=CODE_BG,
                         borderPadding=(3*mm, 3*mm, 3*mm, 3*mm),
                         spaceBefore=2*mm, spaceAfter=2*mm)
s_toc = ParagraphStyle('TOC', fontName=BODY_FONT, fontSize=10, leading=19, leftIndent=5*mm)
s_meta = ParagraphStyle('M', fontName=BODY_FONT, fontSize=10, leading=18,
                         textColor=HexColor('#4b5563'), alignment=TA_CENTER)


class SectionBox(Flowable):
    def __init__(self, text, width):
        Flowable.__init__(self)
        self.text = text
        self.w = width
        self.height = 11*mm
    def wrap(self, aW, aH):
        return (self.w, self.height)
    def draw(self):
        self.canv.setFillColor(PRIMARY)
        self.canv.roundRect(0, 0, self.w, self.height, 2.5, fill=1, stroke=0)
        self.canv.setFillColor(white)
        self.canv.setFont(BOLD_FONT, 13)
        self.canv.drawString(4*mm, 3*mm, self.text)


def esc(text):
    return text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def fmt(text):
    text = re.sub(r'\*\*(.+?)\*\*', rf'<font name="{SEMI_FONT}">\1</font>', text)
    text = re.sub(r'`(.+?)`', r'<font name="Courier" size="8.5" color="#b91c1c">\1</font>', text)
    text = re.sub(r'\[(.+?)\]\(.+?\)', r'\1', text)
    return text


def make_table(header, rows, avail_w):
    th_s = ParagraphStyle('th', fontName=SEMI_FONT, fontSize=8, leading=11,
                           textColor=white, alignment=TA_CENTER)
    tc_s = ParagraphStyle('tc', fontName=BODY_FONT, fontSize=8, leading=11,
                           textColor=HexColor('#1f2937'))
    tcb = ParagraphStyle('tcb', fontName=SEMI_FONT, fontSize=8, leading=11,
                          textColor=HexColor('#1f2937'))

    data = []
    for i, row in enumerate([header] + rows):
        frow = []
        for j, c in enumerate(row):
            ct = fmt(esc(c.strip()))
            if i == 0:
                frow.append(Paragraph(ct, th_s))
            elif j == 0:
                frow.append(Paragraph(ct, tcb))
            else:
                frow.append(Paragraph(ct, tc_s))
        data.append(frow)

    nc = len(header)
    cw = [avail_w / nc] * nc

    t = Table(data, colWidths=cw, repeatRows=1)
    ts = [
        ('BACKGROUND', (0, 0), (-1, 0), TH_BG),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('GRID', (0, 0), (-1, -1), 0.4, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 2*mm),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2*mm),
        ('LEFTPADDING', (0, 0), (-1, -1), 2*mm),
        ('RIGHTPADDING', (0, 0), (-1, -1), 2*mm),
    ]
    for i in range(2, len(data), 2):
        ts.append(('BACKGROUND', (0, i), (-1, i), ALT_BG))
    t.setStyle(TableStyle(ts))
    return t


# 유니코드 치환 맵 (Courier 폰트에서 지원 안 되는 문자)
UNICODE_SUBS = {
    # 아래첨자 숫자
    '\u2080': '0', '\u2081': '1', '\u2082': '2', '\u2083': '3',
    '\u2084': '4', '\u2085': '5', '\u2086': '6', '\u2087': '7',
    '\u2088': '8', '\u2089': '9',
    # 아래첨자 문자
    '\u1d62': 'i', '\u2c7c': 'j', '\u2096': 'k', '\u209a': 'p',
    '\u209b': 's', '\u209c': 't', '\u1d63': 'r', '\u2099': 'n',
    '\u2098': 'm', '\u1d47': 'b', '\u1d48': 'd', '\u2071': 'i',
    '\u1d4f': 'k',
    # 위첨자
    '\u207b': '-', '\u207a': '+',
    '\u2070': '0', '\u00b9': '1', '\u00b2': '2', '\u00b3': '3',
    '\u2074': '4', '\u2075': '5', '\u2076': '6', '\u2077': '7',
    '\u2078': '8', '\u2079': '9',
    # 그리스 소문자
    '\u03b1': 'a', '\u03b2': 'B', '\u03b3': 'y', '\u03b4': 'd',
    '\u03b5': 'e', '\u03b8': 'O', '\u03c6': 'o', '\u03bb': 'A',
    '\u03bc': 'u', '\u03c3': 'o', '\u03c0': 'pi',
    # 그리스 대문자
    '\u0394': 'D', '\u03a3': 'E',
    # 수학 기호
    '\u2211': 'E', '\u221a': 'V',
    '\u2264': '<=', '\u2265': '>=', '\u2260': '!=',
    '\u2227': '&', '\u2228': '|',
    # 수식 기호
    '\u00d7': 'x', '\u00b7': '*', '\u2022': '*',
    # 꺾쇠
    '\u230a': '[', '\u230b': ']', '\u2308': '[', '\u2309': ']',
    '\u2190': '<-', '\u2192': '->', '\u2194': '<->',
    # hat/bar 문자들
    '\u0302': '', '\u0304': '', '\u0308': '',
    # 특수 수학 문자
    'ŷ': 'y^', 'P\u0302': 'P^', 'X\u0302': 'X^',
    '\u0177': 'y^',  # y with circumflex
    '\u015d': 's^',
    'ȳ': 'y_avg', '\u0233': 'y_avg',
    '\u1e8f': 'y^',
    # 참고: Courier 폰트에 없는 결합 문자 처리
    '\u0327': '', '\u0328': '', '\u0300': '', '\u0301': '',
    '\u0303': '', '\u030a': '', '\u030c': '',
    '\u230a': 'floor(', '\u230b': ')',
    '\u2308': 'ceil(', '\u2309': ')',
    '\u2022': '*',
    '\u00d7': 'x',
}


def sanitize_code(text):
    for old, new in UNICODE_SUBS.items():
        text = text.replace(old, new)
    # Courier에 없는 나머지 유니코드 문자를 ASCII로 대체
    result = []
    for ch in text:
        if ord(ch) < 128 or (0xAC00 <= ord(ch) <= 0xD7A3) or (0x3131 <= ord(ch) <= 0x318E):
            # ASCII 또는 한글은 그대로
            result.append(ch)
        elif ord(ch) in range(0x2500, 0x2580):
            # Box drawing - 대체
            result.append('#')
        elif ord(ch) in range(0x2580, 0x25A0):
            result.append('#')
        else:
            # 기타 유니코드 -> ? 로 대체하되 일부 허용
            result.append('?')
    return ''.join(result)


def parse_md(md_text, avail_w):
    lines = md_text.split('\n')
    story = []
    i = 0
    in_code = False
    code_buf = []

    while i < len(lines):
        line = lines[i]

        # 코드블록
        if line.strip().startswith('```'):
            if in_code:
                raw_code = '\n'.join(code_buf)
                code_text = sanitize_code(raw_code)
                # Paragraph에서 사용하므로 XML 이스케이프 필요
                code_text = esc(code_text)
                # 줄바꿈 -> <br/>
                code_text = code_text.replace('\n', '<br/>')
                # 공백 보존
                code_text = code_text.replace('  ', '&nbsp;&nbsp;')
                story.append(Paragraph(code_text, s_code))
                code_buf = []
                in_code = False
            else:
                in_code = True
            i += 1
            continue
        if in_code:
            code_buf.append(line)
            i += 1
            continue

        stripped = line.strip()
        if not stripped:
            i += 1
            continue

        if stripped == '---':
            story.append(Spacer(1, 2*mm))
            story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER))
            story.append(Spacer(1, 2*mm))
            i += 1
            continue

        # 헤딩
        if line.startswith('# ') and not line.startswith('## '):
            story.append(Paragraph(esc(line[2:].strip()), s_title))
            i += 1
            continue
        if line.startswith('## '):
            story.append(Spacer(1, 3*mm))
            story.append(SectionBox(line[3:].strip(), avail_w))
            story.append(Spacer(1, 3*mm))
            i += 1
            continue
        if line.startswith('### '):
            story.append(Paragraph(fmt(esc(line[4:].strip())), s_h3))
            i += 1
            continue
        if line.startswith('#### '):
            story.append(Paragraph(fmt(esc(line[5:].strip())), s_h4))
            i += 1
            continue

        # 테이블
        if '|' in stripped and stripped.startswith('|'):
            tlines = []
            while i < len(lines) and '|' in lines[i] and lines[i].strip().startswith('|'):
                tlines.append(lines[i])
                i += 1
            if len(tlines) >= 3:
                hdr = [c.strip() for c in tlines[0].split('|')[1:-1]]
                drows = []
                for tl in tlines[2:]:
                    cells = [c.strip() for c in tl.split('|')[1:-1]]
                    while len(cells) < len(hdr):
                        cells.append('')
                    drows.append(cells[:len(hdr)])
                story.append(make_table(hdr, drows, avail_w))
                story.append(Spacer(1, 2*mm))
            continue

        # 리스트
        if stripped.startswith('- '):
            t = fmt(esc(stripped[2:]))
            story.append(Paragraph(f'  \u2022  {t}', s_bullet))
            i += 1
            continue
        m = re.match(r'^(\d+)\.\s(.+)', stripped)
        if m:
            story.append(Paragraph(f'  {m.group(1)}.  {fmt(esc(m.group(2)))}', s_bullet))
            i += 1
            continue

        # 일반 텍스트
        t = fmt(esc(stripped))
        if t:
            story.append(Paragraph(t, s_body))
        i += 1

    return story


def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.4)
    # 상단
    canvas.line(15*mm, A4[1] - 12*mm, A4[0] - 15*mm, A4[1] - 12*mm)
    canvas.setFont(SEMI_FONT, 7.5)
    canvas.setFillColor(HexColor('#9ca3af'))
    canvas.drawString(15*mm, A4[1] - 10.5*mm, "VESTRA")
    canvas.drawRightString(A4[0] - 15*mm, A4[1] - 10.5*mm,
                           "주요기술 보고서 및 특허기술 설명서")
    # 하단
    canvas.line(15*mm, 14*mm, A4[0] - 15*mm, 14*mm)
    canvas.setFont(BODY_FONT, 7.5)
    canvas.setFillColor(HexColor('#6b7280'))
    canvas.drawCentredString(A4[0] / 2, 9*mm, f"- {doc.page} -")
    canvas.restoreState()


def build_pdf(md_path, out_path, title, subtitle, toc_items, header_right):
    """범용 마크다운 -> PDF 변환 함수"""

    def _hf(canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(BORDER)
        canvas.setLineWidth(0.4)
        canvas.line(15*mm, A4[1] - 12*mm, A4[0] - 15*mm, A4[1] - 12*mm)
        canvas.setFont(SEMI_FONT, 7.5)
        canvas.setFillColor(HexColor('#9ca3af'))
        canvas.drawString(15*mm, A4[1] - 10.5*mm, "VESTRA")
        canvas.drawRightString(A4[0] - 15*mm, A4[1] - 10.5*mm, header_right)
        canvas.line(15*mm, 14*mm, A4[0] - 15*mm, 14*mm)
        canvas.setFont(BODY_FONT, 7.5)
        canvas.setFillColor(HexColor('#6b7280'))
        canvas.drawCentredString(A4[0] / 2, 9*mm, f"- {doc.page} -")
        canvas.restoreState()

    doc = SimpleDocTemplate(out_path, pagesize=A4,
                            leftMargin=15*mm, rightMargin=15*mm,
                            topMargin=18*mm, bottomMargin=18*mm,
                            title=title, author='BMI C&S')
    avail_w = A4[0] - 30*mm

    with open(md_path, 'r', encoding='utf-8') as f:
        md = f.read()

    story = []

    # -- 표지 --
    story.append(Spacer(1, 55*mm))
    story.append(Paragraph("VESTRA", ParagraphStyle(
        'cv1', fontName=BLACK_FONT, fontSize=48, leading=56,
        textColor=PRIMARY, alignment=TA_CENTER)))
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph(subtitle, ParagraphStyle(
        'cv2', fontName=LIGHT_FONT, fontSize=14, leading=20,
        textColor=HexColor('#6b7280'), alignment=TA_CENTER)))
    story.append(Spacer(1, 18*mm))
    story.append(HRFlowable(width="50%", thickness=2, color=PRIMARY))
    story.append(Spacer(1, 18*mm))
    story.append(Paragraph(esc(title), ParagraphStyle(
        'cv3', fontName=BOLD_FONT, fontSize=18, leading=26,
        textColor=PRIMARY, alignment=TA_CENTER)))
    story.append(Spacer(1, 25*mm))
    story.append(Paragraph("문서 버전: v1.0.0  |  작성일: 2026-03-19", s_meta))
    story.append(Paragraph("플랫폼 버전: v2.3.2  |  BMI C&amp;S", s_meta))
    story.append(Spacer(1, 18*mm))
    story.append(Paragraph("BMI C&amp;S", ParagraphStyle(
        'cv4', fontName=BOLD_FONT, fontSize=13, leading=18,
        textColor=ACCENT, alignment=TA_CENTER)))
    story.append(PageBreak())

    # -- 목차 --
    if toc_items:
        story.append(Paragraph("목차", s_title))
        story.append(Spacer(1, 4*mm))
        for item in toc_items:
            story.append(Paragraph(item, s_toc))
        story.append(PageBreak())

    # -- 본문 --
    body_start = md.find('## 1.')
    if body_start > 0:
        md_body = md[body_start:]
    else:
        md_body = md
    story.extend(parse_md(md_body, avail_w))

    doc.build(story, onFirstPage=_hf, onLaterPages=_hf)
    print(f"PDF 생성 완료: {out_path}")


def main():
    base = '/Users/watchers/Desktop/vestra/docs'

    # 1. 기술보고서
    build_pdf(
        md_path=f'{base}/VESTRA-기술보고서-및-특허기술-설명서.md',
        out_path=f'{base}/VESTRA-기술보고서-및-특허기술-설명서.pdf',
        title='주요기술 보고서 및 특허기술 설명서',
        subtitle='AI 부동산 자산관리 플랫폼',
        header_right='주요기술 보고서 및 특허기술 설명서',
        toc_items=[
            "1.  기술 개요",
            "2.  특허기술 A: 등기부등본 기반 다차원 위험도 스코어링 시스템",
            "3.  특허기술 B: 5-모델 앙상블 부동산 시세 예측 엔진",
            "4.  특허기술 C: V-Score 이질 데이터 통합 위험 평가 시스템",
            "5.  특허기술 D: 전세사기 위험도 Gradient Boosting 시뮬레이션 모델",
            "6.  특허기술 E: 시계열 이상 패턴 탐지 엔진",
            "7.  특허기술 F: Thompson Sampling 기반 적응형 가중치 자동 튜닝",
            "8.  특허기술 G: 4단계 등기 데이터 자동 검증 엔진",
            "9.  특허기술 H: 부동산 세금 통합 시뮬레이션 엔진",
            "10. 선행기술 대비 차별성 종합 분석",
        ]
    )

    # 2. 플랫폼 완료보고서
    build_pdf(
        md_path=f'{base}/VESTRA-플랫폼-완료보고서.md',
        out_path=f'{base}/VESTRA-플랫폼-완료보고서.pdf',
        title='플랫폼 완료보고서',
        subtitle='AI 부동산 자산관리 플랫폼 v2.3.2',
        header_right='플랫폼 완료보고서',
        toc_items=[
            "1.  프로젝트 개요",
            "2.  기술 스택",
            "3.  구현 현황",
            "4.  데이터베이스 설계",
            "5.  외부 API 연동",
            "6.  AI/ML 엔진 구현 현황",
            "7.  요금제 및 비즈니스 모델",
            "8.  배포 및 운영",
            "9.  알려진 한계 및 향후 계획",
            "10. 결론",
        ]
    )


if __name__ == '__main__':
    main()
