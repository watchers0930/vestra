import type { PropertyType } from "./types";

export const SIDO_MAP: Record<string, string[]> = {
  "서울": ["강남구", "서초구", "송파구", "강동구", "마포구", "용산구", "성동구", "광진구", "영등포구", "동작구", "양천구", "강서구", "구로구", "금천구", "관악구", "노원구", "도봉구", "강북구", "성북구", "동대문구", "중랑구", "종로구", "은평구", "서대문구", "중구"],
  "경기": ["분당구", "수원영통구", "용인수지구", "화성동탄", "고양일산동구", "하남시", "과천시"],
  "부산": ["해운대구", "수영구", "부산진구", "동래구"],
  "대구": ["수성구", "달서구"],
  "인천": ["연수구", "부평구", "남동구"],
  "대전": ["유성구", "서구(대전)"],
  "광주": ["광산구", "남구(광주)"],
  "울산": ["남구(울산)", "울주군"],
};

const NON_APT_SIDO_MAP: Record<string, string[]> = {
  "서울": ["강남구", "강동구", "강북구", "강서구", "관악구", "광진구", "구로구", "금천구", "노원구", "도봉구", "동대문구", "동작구", "마포구", "서대문구", "서초구", "성동구", "성북구", "송파구", "양천구", "영등포구", "용산구", "은평구", "종로구", "중구", "중랑구"],
  "경기": ["가평군", "광명시", "광주시", "김포시", "성남시수정구", "수원시권선구", "수원시영통구", "수원시장안구", "수원시팔달구", "양주시", "여주시", "연천군", "포천시"],
  "부산": ["금정구", "기장군", "동래구", "부산강서구", "부산남구", "부산동구", "부산북구", "부산서구", "부산중구", "부산진구", "사상구", "사하구", "수영구", "연제구", "영도구", "해운대구"],
  "대구": ["군위군", "달서구", "달성군", "대구남구", "대구동구", "대구북구", "대구서구", "대구중구", "수성구"],
  "인천": ["강화군", "계양구", "남동구", "미추홀구", "부평구", "연수구", "옹진군", "인천서구", "인천중구"],
  "대전": ["대덕구", "대전동구", "대전서구", "대전중구", "유성구"],
  "광주": ["광산구", "광주남구", "광주동구", "광주북구", "광주서구"],
  "울산": ["울산남구", "울산동구", "울산북구", "울산중구", "울주군"],
  "세종": ["세종시"],
  "충북": ["청주시상당구", "청주시서원구", "청주시흥덕구"],
  "충남": ["예산군", "청양군", "태안군", "홍성군"],
  "전남": ["강진군", "나주시", "목포시", "무안군", "보성군", "순천시", "신안군", "여수시", "영광군", "영암군", "완도군", "장성군", "장흥군", "해남군"],
  "경북": ["경산시", "경주시", "구미시", "김천시", "문경시", "안동시", "영주시", "영천시", "포항시남구", "포항시북구"],
  "경남": ["거제시", "거창군", "경상남도고성", "김해시", "남해군", "밀양시", "사천시", "산청군", "양산시", "의령군", "진주시", "창녕군", "창원시마산합포구", "창원시마산회원구", "창원시진해구", "통영시", "하동군", "함안군", "함양군", "합천군"],
  "제주": ["서귀포시", "제주시"],
};

function sortKorean(values: string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b, "ko-KR"));
}

export function getSelectableSidoMap(propertyType: PropertyType): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(propertyType === "아파트" ? SIDO_MAP : NON_APT_SIDO_MAP)
      .map(([sido, gus]) => [sido, sortKorean(gus)])
      .filter(([, gus]) => gus.length > 0)
  );
}

export function getFirstSelectableGu(propertyType: PropertyType): string {
  const map = getSelectableSidoMap(propertyType);
  return Object.values(map)[0]?.[0] || "강남구";
}

export function findSidoForGu(gu: string, propertyType: PropertyType): string {
  const map = getSelectableSidoMap(propertyType);
  return Object.entries(map).find(([, gus]) => gus.includes(gu))?.[0] || Object.keys(map)[0] || "서울";
}

export function isGuSelectable(gu: string, propertyType: PropertyType): boolean {
  return Object.values(getSelectableSidoMap(propertyType)).some((gus) => gus.includes(gu));
}
