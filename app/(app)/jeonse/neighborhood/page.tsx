"use client";

import { useState } from "react";
import {
  MapPin,
  ChevronDown,
  GraduationCap,
  Bus,
  ShoppingBag,
  Shield,
  TrendingUp,
  ExternalLink,
  Search,
} from "lucide-react";

interface CategoryCard {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  items: {
    label: string;
    detail: string;
    link: { url: string; text: string };
  }[];
  tip?: string;
}

const categories: CategoryCard[] = [
  {
    id: "school",
    icon: <GraduationCap className="h-5 w-5 text-blue-600" />,
    title: "학군 정보",
    description: "초·중·고등학교 배정 및 학업 성취도를 확인합니다",
    items: [
      {
        label: "학군 배정 조회",
        detail: "초등학교/중학교/고등학교 통학구역 및 배정 학교 확인",
        link: {
          url: "https://schoolzone.emac.kr",
          text: "학군 조회 바로가기",
        },
      },
      {
        label: "학업성취도 확인",
        detail: "학교별 학업성취도, 학생 수, 교원 현황 등 상세 정보",
        link: {
          url: "https://www.schoolinfo.go.kr",
          text: "학교알리미 바로가기",
        },
      },
    ],
    tip: "학교알리미(schoolinfo.go.kr)에서 학업성취도와 학교 평가 결과를 반드시 확인하세요.",
  },
  {
    id: "transport",
    icon: <Bus className="h-5 w-5 text-green-600" />,
    title: "교통",
    description: "지하철, 버스 노선 및 출퇴근 소요시간을 확인합니다",
    items: [
      {
        label: "지하철역 도보 거리",
        detail: "가장 가까운 지하철역까지 도보 소요시간 확인",
        link: {
          url: "https://map.kakao.com",
          text: "카카오맵에서 확인",
        },
      },
      {
        label: "버스 노선 확인",
        detail: "주변 버스 정류장 및 운행 노선 검색",
        link: {
          url: "https://map.kakao.com",
          text: "카카오맵 버스 검색",
        },
      },
      {
        label: "출퇴근 소요시간",
        detail: "직장까지 대중교통/자가용 소요시간 비교",
        link: {
          url: "https://map.naver.com/p/directions",
          text: "네이버 지도 길찾기",
        },
      },
    ],
  },
  {
    id: "amenities",
    icon: <ShoppingBag className="h-5 w-5 text-orange-600" />,
    title: "편의시설",
    description: "대형마트, 병원, 공원 등 생활 편의시설을 확인합니다",
    items: [
      {
        label: "대형마트·편의점",
        detail: "주변 대형마트, 편의점, 전통시장 위치 확인",
        link: {
          url: "https://map.kakao.com/?q=마트",
          text: "카카오맵 마트 검색",
        },
      },
      {
        label: "병원·약국",
        detail: "종합병원, 의원, 약국 근접도 확인",
        link: {
          url: "https://map.kakao.com/?q=병원",
          text: "카카오맵 병원 검색",
        },
      },
      {
        label: "공원·체육시설",
        detail: "근린공원, 체육관, 산책로 등 여가시설 확인",
        link: {
          url: "https://map.kakao.com/?q=공원",
          text: "카카오맵 공원 검색",
        },
      },
    ],
  },
  {
    id: "safety",
    icon: <Shield className="h-5 w-5 text-red-600" />,
    title: "안전",
    description: "범죄 통계, CCTV 현황 등 안전 정보를 확인합니다",
    items: [
      {
        label: "범죄발생 통계",
        detail: "지역별 범죄 발생 현황 및 치안 수준 확인",
        link: {
          url: "https://www.safe-map.go.kr",
          text: "경찰청 범죄지도 바로가기",
        },
      },
      {
        label: "CCTV 설치 현황",
        detail: "방범용 CCTV 설치 위치 및 밀도 확인",
        link: {
          url: "https://www.safe182.go.kr",
          text: "안전드림 바로가기",
        },
      },
    ],
  },
  {
    id: "development",
    icon: <TrendingUp className="h-5 w-5 text-purple-600" />,
    title: "개발 호재",
    description: "도시개발, 재건축/재개발 사업 현황을 확인합니다",
    items: [
      {
        label: "도시개발 사업",
        detail: "주변 개발계획, 신도시, 교통 인프라 사업 확인",
        link: {
          url: "https://rt.molit.go.kr",
          text: "국토부 실거래가 공개시스템",
        },
      },
      {
        label: "재건축·재개발",
        detail: "정비구역 지정, 사업 진행 단계, 조합 설립 현황",
        link: {
          url: "https://citybuild.seoul.go.kr",
          text: "서울시 정비사업 현황",
        },
      },
    ],
  },
];

export default function NeighborhoodPage() {
  const [address, setAddress] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [openCards, setOpenCards] = useState<Set<string>>(new Set());

  const handleSubmit = () => {
    if (!address.trim()) return;
    setSubmitted(true);
    setOpenCards(new Set(categories.map((c) => c.id)));
  };

  const toggleCard = (id: string) => {
    setOpenCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      {/* 헤더 */}
      <div>
        <div className="flex items-center gap-2">
          <MapPin className="h-6 w-6 text-indigo-600" />
          <h1 className="text-xl font-bold text-gray-900">주변 환경 분석</h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          학군, 교통, 편의시설 정보를 한눈에 확인합니다
        </p>
      </div>

      {/* 입력 폼 */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-bold text-gray-900">주소 입력</h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="예: 서울시 강남구 역삼동"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={!address.trim()}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Search className="h-4 w-4" />
            분석 시작
          </button>
        </div>
      </div>

      {/* 결과 카드 */}
      {submitted && (
        <>
          <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 p-5">
            <p className="text-sm font-medium text-indigo-600">분석 대상 주소</p>
            <p className="text-lg font-bold text-gray-900">{address}</p>
            <p className="mt-1 text-xs text-gray-500">
              아래 카테고리별 외부 서비스 링크를 통해 상세 정보를 확인하세요.
            </p>
          </div>

          <div className="space-y-3">
            {categories.map((cat) => {
              const isOpen = openCards.has(cat.id);
              return (
                <div
                  key={cat.id}
                  className="rounded-xl border border-gray-200 bg-white"
                >
                  {/* 카드 헤더 */}
                  <button
                    onClick={() => toggleCard(cat.id)}
                    className="flex w-full items-center justify-between p-4 text-left"
                  >
                    <div className="flex items-center gap-3">
                      {cat.icon}
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          {cat.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {cat.description}
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 text-gray-400 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* 카드 내용 */}
                  {isOpen && (
                    <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3">
                      {cat.items.map((item, i) => (
                        <div
                          key={i}
                          className="flex flex-col gap-2 rounded-lg bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="text-sm font-semibold text-gray-800">
                              {item.label}
                            </p>
                            <p className="text-xs text-gray-500">
                              {item.detail}
                            </p>
                          </div>
                          <a
                            href={item.link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 whitespace-nowrap rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                          >
                            {item.link.text}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      ))}

                      {cat.tip && (
                        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                          <p className="text-xs text-amber-700">
                            <span className="font-semibold">TIP:</span>{" "}
                            {cat.tip}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-center text-xs text-gray-400">
            외부 사이트의 정보는 해당 기관에서 제공하며, 정확성을 보장하지 않습니다.
          </p>
        </>
      )}
    </div>
  );
}
