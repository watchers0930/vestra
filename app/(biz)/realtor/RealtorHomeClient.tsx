"use client";

import { useSession } from "next-auth/react";
import s from "./realtor-home.module.css";
import { useRealtorHomeData } from "./hooks/useRealtorHomeData";
import RealtorHero from "./components/RealtorHero";
import RealtorKpiStrip from "./components/RealtorKpiStrip";
import RealtorTaskPanel from "./components/RealtorTaskPanel";
import RealtorNotiPanel from "./components/RealtorNotiPanel";
import RealtorQuickMenu from "./components/RealtorQuickMenu";

export default function RealtorHomeClient() {
  const { data: session } = useSession();
  const userName = session?.user?.name || "중개사";
  const { loading, kpi, tasks, notis, todoCount, signCount } = useRealtorHomeData();

  return (
    <div className={s.page}>
      <RealtorHero
        userName={userName}
        todoCount={todoCount}
        signCount={signCount}
        newCount={kpi.pendingApps}
      />

      <div className={s.bandSoft}>
        <div className={s.section}>
          <RealtorKpiStrip kpi={kpi} loading={loading} />
          <h2 className={s.sectionHeading}>
            상시 업무{!loading && todoCount > 0 && <span className={s.cnt}>진행 {todoCount}</span>}
          </h2>
          <div className={s.cols}>
            <RealtorTaskPanel tasks={tasks} loading={loading} />
            <RealtorNotiPanel notis={notis} loading={loading} />
          </div>
        </div>
      </div>

      <div className={s.bandWhite}>
        <div className={s.section}>
          <h2 className={s.sectionHeading}>자주 쓰는 기능</h2>
          <RealtorQuickMenu />
        </div>
      </div>
    </div>
  );
}
