"use client";

import { useSession } from "next-auth/react";
import s from "@/app/(biz)/realtor/realtor-home.module.css";
import { useRealtorHomeData } from "@/app/(biz)/realtor/hooks/useRealtorHomeData";
import RealtorKpiStrip from "@/app/(biz)/realtor/components/RealtorKpiStrip";
import RealtorTaskPanel from "@/app/(biz)/realtor/components/RealtorTaskPanel";
import RealtorNotiPanel from "@/app/(biz)/realtor/components/RealtorNotiPanel";
import { LANDLORD_ROUTES } from "@/app/(biz)/_shared/landlord-config";
import LandlordHero from "./components/LandlordHero";
import LandlordQuickMenu from "./components/LandlordQuickMenu";

/**
 * 임대사업자 홈 — 중개사 홈과 동일한 대시보드 UI(Hero·KPI·상시업무·자주 쓰는 기능).
 * 데이터 훅·KPI/상시업무 패널은 중개사 것을 재사용하고, Hero·자주쓰는기능만 임대사업자용으로 구성한다.
 */
export default function LandlordHomeClient() {
  const { data: session } = useSession();
  const userName = session?.user?.name || "임대사업자";
  const { loading, kpi, tasks, notis, todoCount, signCount } = useRealtorHomeData();

  return (
    <div className={s.page}>
      <LandlordHero
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
            <RealtorTaskPanel tasks={tasks} loading={loading} moreHref={LANDLORD_ROUTES.listings} moreLabel="매물 관리 전체 →" />
            <RealtorNotiPanel notis={notis} loading={loading} />
          </div>
        </div>
      </div>

      <div className={s.bandWhite}>
        <div className={s.section}>
          <h2 className={s.sectionHeading}>자주 쓰는 기능</h2>
          <LandlordQuickMenu />
        </div>
      </div>
    </div>
  );
}
