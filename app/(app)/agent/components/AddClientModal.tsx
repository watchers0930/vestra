"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Search, User, MapPin, Eye, Check, UserPlus } from "lucide-react";
import { Button } from "@/components/common/Button";
import { FormInput, TextAreaInput } from "@/components/forms/FormInput";
import AddressAutocomplete from "@/components/common/AddressAutocomplete";

interface MonitoredProp {
  id: string;
  address: string;
  monitorMode: string;
}

interface SearchedUser {
  id: string;
  name: string | null;
  email: string | null;
  monitoredProperties: MonitoredProp[];
}

interface AddClientModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    clientName: string;
    clientEmail?: string;
    clientUserId?: string;
    memo?: string;
    propertyAddress?: string;
    monitoredPropertyIds?: string[];
  }) => Promise<void>;
}

export function AddClientModal({ open, onClose, onSubmit }: AddClientModalProps) {
  // 모드: "vestra" = VESTRA 회원 검색, "direct" = 미가입 고객 직접 등록
  const [mode, setMode] = useState<"vestra" | "direct">("vestra");

  // VESTRA 회원 검색 상태
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchedUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchedUser | null>(null);
  const [memo, setMemo] = useState("");

  // 미가입 고객 직접 등록 상태
  const [directName, setDirectName] = useState("");
  const [directPhone, setDirectPhone] = useState("");
  const [directEmail, setDirectEmail] = useState("");
  const [directBase, setDirectBase] = useState("");
  const [directDetail, setDirectDetail] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ESC 키로 닫기
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, handleKeyDown]);

  // 모달 닫힐 때 폼 초기화
  useEffect(() => {
    if (!open) {
      setMode("vestra");
      setQuery("");
      setResults([]);
      setSelected(null);
      setMemo("");
      setDirectName("");
      setDirectPhone("");
      setDirectEmail("");
      setDirectBase("");
      setDirectDetail("");
      setError("");
    }
  }, [open]);

  // 디바운스 검색
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/agent/user-search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.users || []);
        }
      } catch {
        /* 무시 */
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  if (!open) return null;

  async function handleSubmit() {
    setSubmitting(true);
    setError("");

    try {
      if (mode === "direct") {
        if (!directName.trim() || directName.trim().length < 2) {
          setError("고객명을 2자 이상 입력해주세요.");
          return;
        }
        const fullAddress = directBase.trim()
          ? directDetail.trim()
            ? `${directBase.trim()} ${directDetail.trim()}`
            : directBase.trim()
          : undefined;

        await onSubmit({
          clientName: directName.trim(),
          ...(directPhone.trim() ? { clientPhone: directPhone.trim() } : {}),
          ...(directEmail.trim() ? { clientEmail: directEmail.trim() } : {}),
          ...(fullAddress ? { propertyAddress: fullAddress } : {}),
        });
      } else {
        if (!selected) return;
        await onSubmit({
          clientName: selected.name || "미입력",
          ...(selected.email ? { clientEmail: selected.email } : {}),
          clientUserId: selected.id,
          ...(memo.trim() ? { memo: memo.trim() } : {}),
          ...(selected.monitoredProperties.length > 0
            ? {
                propertyAddress: selected.monitoredProperties[0].address,
                monitoredPropertyIds: selected.monitoredProperties.map((p) => p.id),
              }
            : {}),
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "고객 추가에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-[#1d1d1f]">고객 추가</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#f5f5f7] transition-colors"
          >
            <X size={18} className="text-[#86868b]" />
          </button>
        </div>

        {/* 모드 전환 탭 */}
        <div className="flex px-6 pt-4 gap-2">
          <button
            onClick={() => { setMode("vestra"); setError(""); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              mode === "vestra"
                ? "bg-primary/10 text-primary"
                : "text-[#86868b] hover:bg-[#f5f5f7]"
            }`}
          >
            <User size={12} />
            VESTRA 회원
          </button>
          <button
            onClick={() => { setMode("direct"); setSelected(null); setError(""); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              mode === "direct"
                ? "bg-[#ff9500]/10 text-[#b86f00]"
                : "text-[#86868b] hover:bg-[#f5f5f7]"
            }`}
          >
            <UserPlus size={12} />
            미가입 고객
          </button>
        </div>

        {/* 본문 */}
        <div className="px-6 py-5 overflow-y-auto flex-1 space-y-5">
          {/* 미가입 고객 직접 등록 폼 */}
          {mode === "direct" ? (
            <>
              <FormInput
                label="고객명 *"
                placeholder="이름 입력 (2자 이상)"
                value={directName}
                onChange={(e) => setDirectName(e.target.value)}
              />
              <FormInput
                label="연락처"
                placeholder="010-0000-0000"
                value={directPhone}
                onChange={(e) => setDirectPhone(e.target.value)}
              />
              <FormInput
                label="이메일"
                placeholder="example@email.com"
                value={directEmail}
                onChange={(e) => setDirectEmail(e.target.value)}
              />
              <div>
                <label className="block text-[11px] font-600 text-[#6e6e73] mb-1">
                  물건 주소 (등기감시 시작)
                </label>
                <AddressAutocomplete
                  value={directBase}
                  onChange={setDirectBase}
                  onSelect={(result) => setDirectBase(result.roadAddress || result.address)}
                  placeholder="도로명 주소 검색"
                />
              </div>
              <FormInput
                label="상세 주소"
                placeholder="예: 108동 1403호"
                value={directDetail}
                onChange={(e) => setDirectDetail(e.target.value)}
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
            </>
          ) : (
          /* 회원 검색 */
          !selected ? (
            <>
              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">
                  회원 검색
                </label>
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b] pointer-events-none"
                  />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="이름 또는 이메일로 검색"
                    autoFocus
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#e5e5e7] text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                {searching && (
                  <p className="mt-1.5 text-xs text-[#86868b]">검색 중...</p>
                )}
              </div>

              {/* 검색 결과 */}
              {results.length > 0 && (
                <div className="border border-[#e5e5e7] rounded-xl divide-y divide-gray-100 max-h-60 overflow-y-auto">
                  {results.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => setSelected(user)}
                      className="w-full text-left px-4 py-3 hover:bg-[#f5f5f7] transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f5f5f7] shrink-0">
                          <User size={14} className="text-[#6e6e73]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-[#1d1d1f] truncate">
                            {user.name || "이름 없음"}
                          </p>
                          <p className="text-xs text-[#86868b] truncate">
                            {user.email}
                          </p>
                        </div>
                        {user.monitoredProperties.length > 0 && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-[11px] text-blue-600 font-medium shrink-0">
                            <Eye size={11} />
                            감시 {user.monitoredProperties.length}건
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {query.trim().length >= 2 && !searching && results.length === 0 && (
                <p className="text-sm text-[#86868b] text-center py-4">
                  검색 결과가 없습니다
                </p>
              )}
            </>
          ) : (
            /* 선택된 회원 확인 */
            <>
              {/* 선택 해제 */}
              <button
                onClick={() => setSelected(null)}
                className="text-xs text-primary hover:underline"
              >
                &larr; 다른 회원 검색
              </button>

              {/* 회원 정보 */}
              <div className="p-4 rounded-xl bg-[#f5f5f7] space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white">
                    <User size={16} className="text-[#6e6e73]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1d1d1f]">
                      {selected.name || "이름 없음"}
                    </p>
                    <p className="text-xs text-[#86868b]">{selected.email}</p>
                  </div>
                </div>
              </div>

              {/* 감시 물건 목록 */}
              {selected.monitoredProperties.length > 0 ? (
                <div>
                  <p className="text-sm font-medium text-[#1d1d1f] mb-2">
                    등기감시 물건 ({selected.monitoredProperties.length}건)
                  </p>
                  <div className="space-y-2">
                    {selected.monitoredProperties.map((prop) => (
                      <div
                        key={prop.id}
                        className="flex items-center gap-2.5 p-3 rounded-lg border border-[#e5e5e7] bg-white"
                      >
                        <MapPin size={14} className="text-[#86868b] shrink-0" />
                        <span className="text-sm text-[#1d1d1f] flex-1 truncate">
                          {prop.address}
                        </span>
                        <div className="flex items-center gap-1">
                          {prop.monitorMode === "contract_gap" && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-[10px] text-amber-700 font-medium">
                              계약감시
                            </span>
                          )}
                          <Check size={14} className="text-emerald-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[11px] text-[#86868b]">
                    위 물건이 고객에 자동 연결됩니다
                  </p>
                </div>
              ) : (
                <div className="text-center py-3">
                  <p className="text-sm text-[#86868b]">
                    등기감시 중인 물건이 없습니다
                  </p>
                </div>
              )}

              {/* 메모 */}
              <TextAreaInput
                label="메모 (선택)"
                placeholder="고객 관련 메모를 입력하세요"
                rows={2}
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
              />

              {error && <p className="text-xs text-red-500">{error}</p>}
            </>
          )
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <Button variant="ghost" size="sm" onClick={onClose}>
            취소
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={mode === "vestra" ? !selected : !directName.trim()}
            loading={submitting}
            onClick={handleSubmit}
          >
            등록
          </Button>
        </div>
      </div>
    </div>
  );
}
