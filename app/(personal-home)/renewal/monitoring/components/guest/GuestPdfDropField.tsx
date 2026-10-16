"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import g from "../../guest/guest.module.css";

interface Props {
  file: File | null;
  disabled: boolean;
  onFile: (file: File | null) => void;
}

/**
 * 비회원 신청 PDF 업로드 영역 (설계 §4.3 / §1.2).
 * 클릭·키보드(네이티브 button)·드래그앤드롭을 동일한 단일 파일 정책으로 처리한다.
 * 신규 업로드 라이브러리 없이 브라우저 기본 drag/drop API만 사용한다.
 * 파일 형식·크기·매직바이트 등 실제 검증은 서버(parse-pdf)가 최종 수행한다(클라이언트는 선택·전달만).
 */
export default function GuestPdfDropField({ file, disabled, onFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const pick = (list: FileList | null) => {
    // 단일 파일 정책: 여러 개가 들어와도 첫 번째만 사용한다.
    onFile(list && list.length > 0 ? list[0] : null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    pick(e.dataTransfer?.files ?? null);
  };

  const stateClass = dragOver ? g.dropZoneActive : file ? g.dropZoneSet : "";

  return (
    <button
      type="button"
      className={`${g.dropZone} ${stateClass}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        if (disabled) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      disabled={disabled}
      aria-labelledby="guest-apply-pdf-label"
      aria-describedby="guest-apply-pdf-name"
    >
      <div className={g.dropIco}>
        <Upload size={26} />
      </div>
      <div className={g.dropName} id="guest-apply-pdf-name">
        {file ? file.name : "등기부등본 PDF를 선택하거나 끌어다 놓으세요"}
      </div>
      <div className={g.dropHint}>인터넷등기소(iros.go.kr) 발급 PDF · 최대 10MB</div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        style={{ display: "none" }}
        tabIndex={-1}
        onChange={(e) => pick(e.target.files)}
        disabled={disabled}
      />
    </button>
  );
}
