"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Loader2 } from "lucide-react";

export interface AddressResult {
  address: string;
  roadAddress: string;
  buildingName: string;
  lat: number;
  lng: number;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect: (result: AddressResult) => void;
  onSubmit?: () => void;
  placeholder?: string;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  onSubmit,
  placeholder = "주소 입력 (예: 서울 강남구 역삼동)",
}: Props) {
  const [results, setResults] = useState<AddressResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 디바운스 검색
  const search = useCallback((q: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/address-search?q=${encodeURIComponent(q.trim())}`);
        const json = await res.json();
        const items: AddressResult[] = json.results ?? [];
        setResults(items);
        setOpen(items.length > 0);
        setActiveIdx(-1);
      } catch {
        setResults([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  // value 변경 시 검색
  const handleChange = (val: string) => {
    onChange(val);
    search(val);
  };

  // 항목 선택
  const handleSelect = (item: AddressResult) => {
    const display = item.roadAddress || item.address;
    onChange(display);
    setOpen(false);
    setResults([]);
    onSelect(item);
  };

  // 키보드 네비게이션
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault();
        onSubmit?.();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIdx((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIdx((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIdx >= 0 && activeIdx < results.length) {
          handleSelect(results[activeIdx]);
        } else {
          setOpen(false);
          onSubmit?.();
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setActiveIdx(-1);
        break;
    }
  };

  // 외부 클릭 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div ref={wrapperRef} style={{ position: "relative", flex: 1 }}>
      {/* 검색 아이콘 */}
      <Search
        size={13}
        strokeWidth={1.5}
        style={{
          position: "absolute",
          left: "11px",
          top: "50%",
          transform: "translateY(-50%)",
          color: "#aeaeb2",
          zIndex: 1,
        }}
      />

      {/* 로딩 인디케이터 */}
      {loading && (
        <Loader2
          size={12}
          className="animate-spin"
          style={{
            position: "absolute",
            right: "10px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "#aeaeb2",
            zIndex: 1,
          }}
        />
      )}

      {/* 입력 필드 */}
      <input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (results.length > 0) setOpen(true); }}
        placeholder={placeholder}
        autoComplete="off"
        style={{
          width: "100%",
          paddingLeft: "32px",
          paddingRight: loading ? "30px" : "12px",
          paddingTop: "9px",
          paddingBottom: "9px",
          borderRadius: open ? "10px 10px 0 0" : "10px",
          border: "1px solid rgba(0,0,0,0.12)",
          fontSize: "12.5px",
          outline: "none",
          background: "#f5f5f7",
          color: "#1d1d1f",
          boxSizing: "border-box" as const,
        }}
      />

      {/* 드롭다운 */}
      {open && results.length > 0 && (
        <ul
          role="listbox"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 50,
            margin: 0,
            padding: "4px 0",
            listStyle: "none",
            background: "#fff",
            border: "1px solid rgba(0,0,0,0.12)",
            borderTop: "none",
            borderRadius: "0 0 10px 10px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
            maxHeight: "220px",
            overflowY: "auto",
          }}
        >
          {results.map((item, i) => {
            const display = item.roadAddress || item.address;
            const isActive = i === activeIdx;
            return (
              <li
                key={`${display}-${i}`}
                role="option"
                aria-selected={isActive}
                onMouseEnter={() => setActiveIdx(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(item);
                }}
                style={{
                  padding: "8px 12px",
                  cursor: "pointer",
                  background: isActive ? "#f0f0f5" : "transparent",
                  transition: "background 0.1s",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "#1d1d1f",
                    lineHeight: 1.4,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap" as const,
                  }}
                >
                  {display}
                </div>
                {item.buildingName && (
                  <div
                    style={{
                      fontSize: "10.5px",
                      color: "#aeaeb2",
                      marginTop: "2px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap" as const,
                    }}
                  >
                    {item.buildingName}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
