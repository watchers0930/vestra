"use client";

import Link from "next/link";
import s from "../realtor-home.module.css";
import { REALTOR_QUICK } from "../../_shared/realtor-config";

export default function RealtorQuickMenu() {
  return (
    <div className={s.quickGrid}>
      {REALTOR_QUICK.map((q) => (
        <Link key={q.href} href={q.href} className={`${s.qcard}${q.hot ? " " + s.hot : ""}`}>
          <div className={s.qic} style={q.hot ? { color: "#fff" } : undefined}>{q.icon}</div>
          <div className={s.qlabel}>{q.label}</div>
          <div className={s.qsub}>{q.sub}</div>
        </Link>
      ))}
    </div>
  );
}
