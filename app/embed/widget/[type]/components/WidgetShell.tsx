"use client";

import { SITE_URL } from "@/lib/site";
import styles from "../embed.module.css";

/** 위젯 종류별 "자세히 보기" 유입 경로 */
const MORE_PATH: Record<string, string> = {
  price: "/prediction",
  "jeonse-safety": "/jeonse/analysis",
  tax: "/tax",
  rights: "/rights",
};

interface Props {
  type: string;
  title: string;
  theme: "light" | "dark";
  accent: string;
  /** 하단 데이터 출처 문구 */
  source: string;
  children: React.ReactNode;
}

/** 모든 임베드 위젯의 공통 외곽(헤더·브랜드·푸터·테마/accent 적용) */
export function WidgetShell({ type, title, theme, accent, source, children }: Props) {
  const moreUrl = `${SITE_URL}${MORE_PATH[type] ?? ""}`;
  return (
    <div
      className={styles.widget}
      data-theme={theme}
      style={{ ["--accent" as string]: accent }}
    >
      <div className={styles.head}>
        <h1 className={styles.title}>{title}</h1>
        <a className={styles.brand} href={SITE_URL} target="_blank" rel="noopener noreferrer">
          <span className={styles.brandDot} />
          VESTRA
        </a>
      </div>

      {children}

      <div className={styles.foot}>
        <span className={styles.source}>{source}</span>
        <a className={styles.more} href={moreUrl} target="_blank" rel="noopener noreferrer">
          VESTRA에서 자세히 보기 →
        </a>
      </div>
    </div>
  );
}
