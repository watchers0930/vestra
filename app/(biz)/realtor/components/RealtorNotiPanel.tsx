"use client";

import Link from "next/link";
import s from "../realtor-home.module.css";
import { REALTOR_ROUTES } from "../../_shared/realtor-config";
import type { NotiItem } from "../hooks/useRealtorHomeData";

const ICON: Record<NotiItem["kind"], { cls: string; emoji: string }> = {
  alert: { cls: s.alert, emoji: "⚠️" },
  msg: { cls: s.msg, emoji: "💬" },
  doc: { cls: s.doc, emoji: "📄" },
};

export default function RealtorNotiPanel({ notis, loading }: { notis: NotiItem[]; loading: boolean }) {
  return (
    <div className={s.card}>
      <div className={s.cardHead}>
        <h3>알림{!loading && notis.length > 0 && <span className={s.cnt}>{notis.length}</span>}</h3>
        <Link href={REALTOR_ROUTES.monitoring}>모두 보기</Link>
      </div>
      <div className={s.nlist}>
        {loading ? (
          [0, 1, 2].map((i) => (
            <div key={i} className={s.nitem}>
              <div className={s.skel} style={{ height: 34, width: 34, borderRadius: 9 }} />
              <div style={{ flex: 1 }}><div className={s.skel} style={{ height: 14, width: "60%", marginBottom: 6 }} /><div className={s.skel} style={{ height: 12, width: "40%" }} /></div>
            </div>
          ))
        ) : notis.length === 0 ? (
          <div className={s.empty}>새로운 알림이 없습니다.</div>
        ) : (
          notis.map((n, i) => {
            const ic = ICON[n.kind];
            return (
              <div key={i} className={s.nitem}>
                <span className={`${s.nic} ${ic.cls}`}>{ic.emoji}</span>
                <div>
                  <div className={s.ntitle}>
                    {n.highlight ? <span className={s.hl}>{n.highlight}</span> : n.title}
                  </div>
                  <div className={s.nsub}>{n.sub}</div>
                  <div className={s.ntime}>{n.time}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
