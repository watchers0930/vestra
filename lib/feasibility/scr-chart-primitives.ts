/**
 * SCR 차트 SVG 기본 유틸 + 라인/바/영역/파이 차트 생성기
 *
 * 순수 SVG 문자열 반환 — React/DOM 미의존.
 *
 * @module lib/feasibility/scr-chart-primitives
 */

// ─── 상수 ───

export const COLORS = {
  primary: "#0071e3",
  secondary: "#34c759",
  tertiary: "#ff9500",
  danger: "#ff3b30",
  muted: "#86868b",
  gridLine: "#e5e5e7",
  text: "#6e6e73",
  darkText: "#1d1d1f",
} as const;

export const PALETTE = [COLORS.primary, COLORS.secondary, COLORS.tertiary, COLORS.danger, "#af52de", "#5ac8fa", "#ff2d55", "#a2845e"];

/** 기본 viewBox */
export const W = 600;
export const H = 300;
export const PAD = { top: 30, right: 30, bottom: 50, left: 70 };
export const CW = W - PAD.left - PAD.right;
export const CH = H - PAD.top - PAD.bottom;

// ─── SVG 유틸 ───

export function svgOpen(width = W, height = H): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="font-family:'Malgun Gothic','맑은 고딕',sans-serif;">`;
}
export function svgClose(): string { return "</svg>"; }

/** 그림 래퍼 */
export function figureWrap(chartNo: number, title: string, svg: string): string {
  return `<div class="scr-figure avoid-break">${svg}<p class="scr-figure-caption">그림${chartNo}: ${title}</p></div>`;
}

/** 축 숫자 포맷 */
export function fmtAxis(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}억`;
  if (abs >= 10_000) return `${(v / 10_000).toFixed(0)}만`;
  if (abs >= 1_000) return `${(v / 1_000).toFixed(0)}천`;
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(1);
}

/** nice tick step */
export function niceStep(range: number, ticks: number): number {
  const raw = range / ticks;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const residual = raw / magnitude;
  let nice: number;
  if (residual <= 1.5) nice = 1;
  else if (residual <= 3) nice = 2;
  else if (residual <= 7) nice = 5;
  else nice = 10;
  return nice * magnitude;
}

/** 배열 min/max */
export function minMax(arr: number[]): [number, number] {
  if (arr.length === 0) return [0, 100];
  return [Math.min(...arr), Math.max(...arr)];
}

/** 축 그리드 + 라벨 (Y축) */
export function yAxisGrid(minVal: number, maxVal: number, ticks = 5): { lines: string; scale: (v: number) => number; tickValues: number[] } {
  const range = maxVal - minVal || 1;
  const step = niceStep(range, ticks);
  const adjMin = Math.floor(minVal / step) * step;
  const adjMax = Math.ceil(maxVal / step) * step;
  const adjRange = adjMax - adjMin || 1;
  const tickValues: number[] = [];
  let lines = "";
  for (let v = adjMin; v <= adjMax + step * 0.01; v += step) {
    tickValues.push(v);
    const y = PAD.top + CH - ((v - adjMin) / adjRange) * CH;
    lines += `<line x1="${PAD.left}" y1="${y}" x2="${W - PAD.right}" y2="${y}" stroke="${COLORS.gridLine}" stroke-width="0.5"/>`;
    lines += `<text x="${PAD.left - 8}" y="${y + 3}" text-anchor="end" font-size="8" fill="${COLORS.text}">${fmtAxis(v)}</text>`;
  }
  const scale = (v: number) => PAD.top + CH - ((v - adjMin) / adjRange) * CH;
  return { lines, scale, tickValues };
}

/** X축 라벨 */
export function xAxisLabels(labels: string[], rotate = false): string {
  const step = Math.max(1, Math.ceil(labels.length / 12));
  return labels.map((l, i) => {
    if (i % step !== 0 && i !== labels.length - 1) return "";
    const x = PAD.left + (i / Math.max(labels.length - 1, 1)) * CW;
    if (rotate) {
      return `<text x="${x}" y="${H - PAD.bottom + 14}" font-size="7.5" fill="${COLORS.text}" text-anchor="end" transform="rotate(-35 ${x} ${H - PAD.bottom + 14})">${l}</text>`;
    }
    return `<text x="${x}" y="${H - PAD.bottom + 16}" text-anchor="middle" font-size="8" fill="${COLORS.text}">${l}</text>`;
  }).join("");
}

/** 범례 */
export function legend(items: { label: string; color: string }[], y = 12): string {
  let x = PAD.left;
  return items.map((item) => {
    const g = `<rect x="${x}" y="${y - 6}" width="10" height="10" rx="2" fill="${item.color}"/>` +
      `<text x="${x + 14}" y="${y + 3}" font-size="8" fill="${COLORS.darkText}">${item.label}</text>`;
    x += 14 + item.label.length * 7 + 12;
    return g;
  }).join("");
}

// ─── 차트 유형별 생성 ───

/** 라인차트 */
export function lineChart(
  labels: string[],
  series: { name: string; values: number[]; color: string }[],
  opts?: { chartNo?: number; title?: string },
): string {
  const allVals = series.flatMap((s) => s.values.filter((v) => v != null));
  const [mn, mx] = minMax(allVals);
  const { lines: grid, scale: yScale } = yAxisGrid(Math.min(mn, 0), mx);

  let paths = "";
  series.forEach((s) => {
    const points = s.values.map((v, i) => {
      const x = PAD.left + (i / Math.max(labels.length - 1, 1)) * CW;
      const y = yScale(v);
      return `${x},${y}`;
    });
    paths += `<polyline fill="none" stroke="${s.color}" stroke-width="2" points="${points.join(" ")}"/>`;
    s.values.forEach((v, i) => {
      const x = PAD.left + (i / Math.max(labels.length - 1, 1)) * CW;
      paths += `<circle cx="${x}" cy="${yScale(v)}" r="3" fill="${s.color}"/>`;
    });
  });

  const svg = svgOpen() + grid + paths + xAxisLabels(labels, labels.length > 8) +
    legend(series.map((s) => ({ label: s.name, color: s.color }))) + svgClose();
  return opts?.chartNo ? figureWrap(opts.chartNo, opts.title || "", svg) : svg;
}

/** 바차트 (수직) */
export function barChart(
  labels: string[],
  series: { name: string; values: number[]; color: string }[],
  opts?: { chartNo?: number; title?: string; stacked?: boolean },
): string {
  const stacked = opts?.stacked ?? false;
  const groupCount = series.length;
  const n = labels.length;
  const groupWidth = CW / n;
  const barWidth = stacked ? groupWidth * 0.6 : (groupWidth * 0.7) / groupCount;

  let allVals: number[];
  if (stacked) {
    allVals = labels.map((_, i) => series.reduce((sum, s) => sum + (s.values[i] || 0), 0));
  } else {
    allVals = series.flatMap((s) => s.values);
  }
  const [, mx] = minMax(allVals);
  const { lines: grid, scale: yScale } = yAxisGrid(0, mx);
  const baseY = yScale(0);

  let bars = "";
  if (stacked) {
    labels.forEach((_, i) => {
      let cumY = baseY;
      series.forEach((s) => {
        const val = s.values[i] || 0;
        const h = baseY - yScale(val);
        const x = PAD.left + i * groupWidth + groupWidth * 0.2;
        cumY -= h;
        bars += `<rect x="${x}" y="${cumY}" width="${barWidth}" height="${h}" fill="${s.color}" rx="1"/>`;
      });
    });
  } else {
    labels.forEach((_, i) => {
      series.forEach((s, si) => {
        const val = s.values[i] || 0;
        const h = baseY - yScale(val);
        const x = PAD.left + i * groupWidth + (groupWidth - barWidth * groupCount) / 2 + si * barWidth;
        bars += `<rect x="${x}" y="${baseY - h}" width="${barWidth}" height="${h}" fill="${s.color}" rx="1"/>`;
      });
    });
  }

  const svg = svgOpen() + grid + bars + xAxisLabels(labels, labels.length > 8) +
    legend(series.map((s) => ({ label: s.name, color: s.color }))) + svgClose();
  return opts?.chartNo ? figureWrap(opts.chartNo, opts.title || "", svg) : svg;
}

/** 영역차트 */
export function areaChart(
  labels: string[],
  series: { name: string; values: number[]; color: string }[],
  opts?: { chartNo?: number; title?: string },
): string {
  const allVals = series.flatMap((s) => s.values);
  const [mn, mx] = minMax(allVals);
  const { lines: grid, scale: yScale } = yAxisGrid(Math.min(mn, 0), mx);
  const baseY = yScale(0);

  let areas = "";
  series.forEach((s) => {
    const points = s.values.map((v, i) => {
      const x = PAD.left + (i / Math.max(labels.length - 1, 1)) * CW;
      return `${x},${yScale(v)}`;
    });
    const firstX = PAD.left;
    const lastX = PAD.left + CW;
    areas += `<polygon fill="${s.color}" fill-opacity="0.15" stroke="${s.color}" stroke-width="1.5" points="${firstX},${baseY} ${points.join(" ")} ${lastX},${baseY}"/>`;
  });

  const svg = svgOpen() + grid + areas + xAxisLabels(labels, labels.length > 8) +
    legend(series.map((s) => ({ label: s.name, color: s.color }))) + svgClose();
  return opts?.chartNo ? figureWrap(opts.chartNo, opts.title || "", svg) : svg;
}

/** 파이차트 */
export function pieChart(
  slices: { label: string; value: number; color: string }[],
  opts?: { chartNo?: number; title?: string },
): string {
  const total = slices.reduce((s, d) => s + d.value, 0) || 1;
  const cx = W / 2;
  const cy = H / 2 + 10;
  const r = Math.min(CW, CH) / 2 - 20;
  let startAngle = -Math.PI / 2;
  let paths = "";

  slices.forEach((slice) => {
    const angle = (slice.value / total) * Math.PI * 2;
    const endAngle = startAngle + angle;
    const largeArc = angle > Math.PI ? 1 : 0;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    paths += `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc} 1 ${x2},${y2} Z" fill="${slice.color}" stroke="#fff" stroke-width="1.5"/>`;
    const midAngle = startAngle + angle / 2;
    const lx = cx + (r * 0.65) * Math.cos(midAngle);
    const ly = cy + (r * 0.65) * Math.sin(midAngle);
    const pctVal = ((slice.value / total) * 100).toFixed(1);
    if (parseFloat(pctVal) > 3) {
      paths += `<text x="${lx}" y="${ly}" text-anchor="middle" font-size="8" font-weight="600" fill="#fff">${pctVal}%</text>`;
    }
    startAngle = endAngle;
  });

  const svg = svgOpen() + paths +
    legend(slices.map((s) => ({ label: s.label, color: s.color })), H - 10) + svgClose();
  return opts?.chartNo ? figureWrap(opts.chartNo, opts.title || "", svg) : svg;
}
