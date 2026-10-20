"use client";

/**
 * 역할 설정·사업자 접수 전담 훅(설계 renewal.design §1.1·§5.1, AC-02).
 *
 * `POST /api/user/setup-role` 호출·중복 제출 잠금·오류 상태만 책임진다(단일 책임, 플랫폼 폴더 역할 분리).
 * 라우팅(개인 성공 후 이동)·접수 UI(ReceivedPanel) 같은 표현/흐름 책임은 호출부(page/form)가 가진다.
 * 이렇게 분리해야 접수 성공·세션 갱신 실패·재시도를 호출부가 독립적으로 검증·조립할 수 있다(§7 회귀 분리).
 *
 * ⚠️ HTTP 200은 **접수/설정 성공**이지 승인/인증 완료가 아니다. 성공 여부만 반환하고, 그 해석(개인=다음 단계,
 * 사업자=승인 대기 접수 패널)은 호출부가 담당한다. API 계약은 변경하지 않는다.
 */

import { useCallback, useRef, useState } from "react";

const ENDPOINT = "/api/user/setup-role";

export interface RoleSetupResult {
  ok: boolean;
  error: string | null;
}

export interface UseRoleSetup {
  /** 요청 진행 중(버튼 로딩/중복 차단 표시용). */
  submitting: boolean;
  /** 마지막 실패 메시지. 성공/초기화 시 null. */
  error: string | null;
  /** 개인 세부유형 설정(role=PERSONAL). */
  setupPersonal: (userType: "TENANT" | "LANDLORD") => Promise<RoleSetupResult>;
  /** 사업자 정보 접수(role=사업자). 서버는 requestedRole+verifyStatus=pending만 기록. */
  submitBusiness: (input: {
    role: string;
    companyName: string;
    representName: string;
    businessNumber: string;
  }) => Promise<RoleSetupResult>;
  /** 오류 표시 해제(입력 변경 시). */
  clearError: () => void;
}

const NETWORK_ERROR = "네트워크 오류가 발생했습니다. 다시 시도해 주세요.";

export function useRoleSetup(): UseRoleSetup {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 진행 중 중복 제출을 막는다(더블클릭·effect 재실행·strict mode 이중 호출 방어).
  const lockRef = useRef(false);

  const post = useCallback(
    async (body: Record<string, unknown>, fallbackError: string): Promise<RoleSetupResult> => {
      if (lockRef.current) return { ok: false, error: null };
      lockRef.current = true;
      setSubmitting(true);
      setError(null);
      try {
        const res = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(body),
        });
        if (res.ok) return { ok: true, error: null };
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        const msg = data?.error || fallbackError;
        setError(msg);
        return { ok: false, error: msg };
      } catch {
        setError(NETWORK_ERROR);
        return { ok: false, error: NETWORK_ERROR };
      } finally {
        setSubmitting(false);
        lockRef.current = false;
      }
    },
    []
  );

  const setupPersonal = useCallback(
    (userType: "TENANT" | "LANDLORD") =>
      post({ role: "PERSONAL", userType }, "역할 설정에 실패했습니다. 잠시 후 다시 시도해 주세요."),
    [post]
  );

  const submitBusiness = useCallback(
    (input: { role: string; companyName: string; representName: string; businessNumber: string }) =>
      post(
        {
          role: input.role,
          companyName: input.companyName,
          representName: input.representName,
          businessNumber: input.businessNumber,
        },
        "접수에 실패했습니다. 다시 시도해 주세요."
      ),
    [post]
  );

  const clearError = useCallback(() => setError(null), []);

  return { submitting, error, setupPersonal, submitBusiness, clearError };
}
