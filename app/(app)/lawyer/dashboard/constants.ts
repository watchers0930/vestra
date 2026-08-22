/** 변호사 전용 대시보드 탭 정의 (설계서 §4 lawyer/dashboard) */

export type LawyerTabKey =
  | "notices"   // 내용증명 (승인 대기 사건)
  | "consults"  // 상담문의
  | "bio"       // 변호사약력
  | "career"    // 주요경력
  | "school"    // 출신학교
  | "etc"       // 기타정보
  | "visits";   // 방문예약

export interface LawyerTab {
  key: LawyerTabKey;
  label: string;
}

export const LAWYER_TABS: LawyerTab[] = [
  { key: "notices", label: "내용증명" },
  { key: "consults", label: "상담문의" },
  { key: "bio", label: "변호사약력" },
  { key: "career", label: "주요경력" },
  { key: "school", label: "출신학교" },
  { key: "etc", label: "기타정보" },
  { key: "visits", label: "방문예약" },
];

/** 프로필 편집형 탭(약력·경력·학교·기타)의 라벨·안내 */
export const PROFILE_FIELDS: Record<
  "bio" | "career" | "school" | "etc",
  { title: string; placeholder: string; desc: string }
> = {
  bio: {
    title: "변호사 약력",
    placeholder: "예) 법무법인 율지 대표변호사. 임대차·부동산 분쟁 전문. 상담 1,200건 이상 진행.",
    desc: "미니홈페이지 상단에 노출되는 소개글입니다.",
  },
  career: {
    title: "주요 경력",
    placeholder: "예)\n- 2018~ 법무법인 율지 파트너변호사\n- 2015~2018 서울중앙지법 국선변호\n- 대한변협 부동산분쟁 위원",
    desc: "한 줄에 하나씩 경력을 입력하세요.",
  },
  school: {
    title: "출신 학교",
    placeholder: "예)\n- OO대학교 법학과 졸업\n- OO대학교 법학전문대학원 졸업\n- 제OO회 변호사시험 합격",
    desc: "학력·자격 취득 이력을 입력하세요.",
  },
  etc: {
    title: "기타 정보",
    placeholder: "예) 상담 가능 시간, 취급 분야, 수임료 안내, 사무실 위치 등 자유롭게 작성.",
    desc: "그 외 이용자에게 안내할 정보를 자유롭게 작성하세요.",
  },
};
