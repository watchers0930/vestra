"use client";

import Link from "next/link";
import s from "../realtor-home.module.css";
import { REALTOR_ROUTES } from "../../_shared/realtor-config";
import type { TaskItem } from "../hooks/useRealtorHomeData";

const CHIP_CLASS: Record<TaskItem["kind"], string> = {
  sign: s.sign, new: s.new, talk: s.talk, due: s.due,
};

export default function RealtorTaskPanel({ tasks, loading }: { tasks: TaskItem[]; loading: boolean }) {
  return (
    <div className={s.card}>
      <div className={s.cardHead}>
        <h3>처리 대기</h3>
        <Link href={REALTOR_ROUTES.agent}>중개관리 전체 →</Link>
      </div>
      <div className={s.tlist}>
        {loading ? (
          [0, 1, 2].map((i) => (
            <div key={i} className={s.titem}>
              <div className={s.skel} style={{ height: 22, width: 60 }} />
              <div className={s.tbody}><div className={s.skel} style={{ height: 16, width: "70%", marginBottom: 6 }} /><div className={s.skel} style={{ height: 12, width: "45%" }} /></div>
            </div>
          ))
        ) : tasks.length === 0 ? (
          <div className={s.empty}>대기 중인 업무가 없습니다.</div>
        ) : (
          tasks.map((t, i) => (
            <div key={i} className={s.titem}>
              <span className={`${s.chip} ${CHIP_CLASS[t.kind]}`}>{t.label}</span>
              <div className={s.tbody}>
                <div className={s.ttitle}>{t.title}</div>
                <div className={s.tsub}>{t.sub}</div>
              </div>
              <span className={s.ttime}>{t.time}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
