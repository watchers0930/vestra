"use client";

import Link from "next/link";
import { FolderKanban, PenLine, Building2, FileSearch, Map, type LucideIcon } from "lucide-react";
import s from "../realtor-home.module.css";
import { REALTOR_QUICK, type QuickIconKey } from "../../_shared/realtor-config";

const ICONS: Record<QuickIconKey, LucideIcon> = {
  agent: FolderKanban,
  eContract: PenLine,
  listings: Building2,
  rights: FileSearch,
  priceMap: Map,
};

export default function RealtorQuickMenu() {
  return (
    <div className={s.quickGrid}>
      {REALTOR_QUICK.map((q) => {
        const Icon = ICONS[q.icon];
        return (
          <Link key={q.href} href={q.href} className={`${s.qcard}${q.hot ? " " + s.hot : ""}`}>
            <div className={s.qic}><Icon size={22} strokeWidth={1.75} /></div>
            <div className={s.qlabel}>{q.label}</div>
            <div className={s.qsub}>{q.sub}</div>
          </Link>
        );
      })}
    </div>
  );
}
