import { NextResponse } from "next/server";

/**
 * 표준 API 응답 타입
 */
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

/**
 * 성공 응답 헬퍼
 */
export function apiSuccess<T>(data: T, meta?: ApiResponse["meta"], status = 200) {
  const body: ApiResponse<T> = { data };
  if (meta) body.meta = meta;
  return NextResponse.json(body, { status });
}

/**
 * 에러 응답 헬퍼
 */
export function apiError(error: string, status = 400) {
  return NextResponse.json({ error } satisfies ApiResponse, { status });
}
