/** 변호사 전용 대시보드 메뉴 정의 (2컬럼 사이드바) */

export type LawyerTabKey =
  | "notices"   // 내용증명
  | "consults"  // 상담문의
  | "visits"    // 방문예약
  | "bio"       // 내정보수정 > 약력
  | "career"    // 내정보수정 > 경력
  | "school"    // 내정보수정 > 학교
  | "etc"       // 내정보수정 > 기타정보
  | "profile"   // 내정보수정 > 프로필 사진·소개
  | "stamp";    // 내정보수정 > 전자직인

export interface MenuItem {
  key: LawyerTabKey;
  label: string;
}

/** 사이드바 상위 메뉴 */
export const MAIN_MENU: MenuItem[] = [
  { key: "notices", label: "내용증명" },
  { key: "consults", label: "상담신청현황" },
  { key: "visits", label: "방문예약" },
];

/** "내정보수정" 하위 메뉴 */
export const PROFILE_SUBMENU: MenuItem[] = [
  { key: "profile", label: "프로필·소개" },
  { key: "bio", label: "약력" },
  { key: "career", label: "경력" },
  { key: "school", label: "학교" },
  { key: "etc", label: "기타정보" },
  { key: "stamp", label: "전자직인" },
];

export const PROFILE_KEYS: LawyerTabKey[] = ["profile", "bio", "career", "school", "etc", "stamp"];

/** 텍스트형 편집(약력·기타정보) */
export const PROFILE_TEXT: Record<"bio" | "etc", { title: string; placeholder: string; desc: string }> = {
  bio: {
    title: "약력",
    placeholder: "예) 법무법인 율지 대표변호사. 임대차·부동산 분쟁 전문. 상담 1,200건 이상 진행.",
    desc: "미니홈페이지 상단에 노출되는 소개글입니다.",
  },
  etc: {
    title: "기타정보",
    placeholder: "예) 상담 가능 시간, 취급 분야, 수임료 안내, 사무실 위치 등 자유롭게 작성.",
    desc: "그 외 이용자에게 안내할 정보를 자유롭게 작성하세요.",
  },
};

/** 리스트형 편집(경력·학교 — 항목 추가/삭제) */
export const PROFILE_LIST: Record<"career" | "school", { title: string; itemPlaceholder: string; desc: string }> = {
  career: {
    title: "경력",
    itemPlaceholder: "예) 2018~ 법무법인 율지 파트너변호사",
    desc: "경력을 한 항목씩 추가하세요.",
  },
  school: {
    title: "학교",
    itemPlaceholder: "예) OO대학교 법학전문대학원 졸업",
    desc: "학력·자격 취득 이력을 한 항목씩 추가하세요.",
  },
};
