"use client";

import Link from "next/link";
import { Building2, Eye, FileSearch, Map, Calculator, type LucideIcon } from "lucide-react";
import s from "@/app/(biz)/realtor/realtor-home.module.css";
import { LANDLORD_QUICK, type LandlordQuickIconKey } from "@/app/(biz)/_shared/landlord-config";

const ICONS: Record<LandlordQuickIconKey, LucideIcon> = {
  listings: Building2,
  monitoring: Eye,
  rights: FileSearch,
  priceMap: Map,
  tax: Calculator,
};

export default function LandlordQuickMenu() {
  return (
    <div className={s.quickGrid}>
      {LANDLORD_QUICK.map((q) => {
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
