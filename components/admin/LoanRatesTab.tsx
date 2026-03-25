"use client";

import { useState, useEffect } from "react";
import { RefreshCw, CheckCircle, AlertCircle } from "lucide-react";

interface FSSProduct {
  bankName: string;
  productName: string;
  rateMin: number;
  rateMax: number;
  loanLimit: string;
  updatedAt: string;
}

interface RatesData {
  rates: {
    products: FSSProduct[];
    fetchedAt: string;
    dataSource: "fss" | "fallback";
  } | null;
  hasCachedData: boolean;
}

export function LoanRatesTab() {
  const [data, setData] = useState<RatesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/loan-rates");
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/loan-rates", { method: "POST" });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" /></div>;
  }

  const rates = data?.rates;
  const products = rates?.products || [];

  // 은행별 그룹핑
  const bankGroups = new Map<string, FSSProduct[]>();
  products.forEach((p) => {
    if (!bankGroups.has(p.bankName)) bankGroups.set(p.bankName, []);
    bankGroups.get(p.bankName)!.push(p);
  });

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">전세대출 금리 관리</h2>
          <p className="text-sm text-gray-500">FSS 금융상품 통합비교공시 API 연동 (10일 자동 갱신)</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "갱신 중..." : "FSS 금리 즉시 갱신"}
        </button>
      </div>

      {/* 상태 */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-3">
          {rates?.dataSource === "fss" ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-yellow-500" />
          )}
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {rates ? `${products.length}개 상품 금리 적용 중` : "캐시된 데이터 없음"}
            </p>
            {rates?.fetchedAt && (
              <p className="text-xs text-gray-500">
                마지막 갱신: {new Date(rates.fetchedAt).toLocaleString("ko-KR")} ({rates.dataSource === "fss" ? "FSS API" : "폴백"})
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 은행별 금리 테이블 */}
      {products.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">은행</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">상품명</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">최저금리</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">최고금리</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">한도</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">공시일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((p, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-900">{p.bankName}</td>
                  <td className="px-4 py-2.5 text-gray-700">{p.productName}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-green-600">{p.rateMin}%</td>
                  <td className="px-4 py-2.5 text-right text-gray-600">{p.rateMax}%</td>
                  <td className="px-4 py-2.5 text-right text-gray-600 text-xs">{p.loanLimit}</td>
                  <td className="px-4 py-2.5 text-right text-gray-400 text-xs">{p.updatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 안내 */}
      <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
        <p className="text-sm text-yellow-800">
          <span className="font-semibold">참고:</span> 금리는 FSS API로 자동 갱신됩니다. LTV, DTI, 소득 상한 등 심사 조건은 공개 API가 없어 분기 1회 수동 확인이 필요합니다.
          <code className="ml-1 text-xs bg-yellow-100 px-1 py-0.5 rounded">lib/loan-simulator.ts</code>의 <code className="text-xs bg-yellow-100 px-1 py-0.5 rounded">LOAN_PRODUCTS</code>에서 수정하세요.
        </p>
      </div>
    </div>
  );
}
