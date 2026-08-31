/**
 * 회원가입 의도 쿠키
 *
 * 소셜 OAuth 로그인은 서버(NextAuth signIn 콜백) 입장에서 "로그인"과 "가입"이
 * 동일하게 보인다. PrismaAdapter는 계정이 없으면 무조건 새로 만들어버리므로,
 * 미가입 소셜 계정이 "로그인" 버튼으로 들어와도 자동 가입되는 문제가 있다.
 *
 * 이를 막기 위해 회원가입 버튼을 누를 때만 이 쿠키를 심고, 서버 signIn 콜백은
 * "신규 소셜 계정 + 이 쿠키 없음"이면 계정 생성을 차단한다.
 *
 * OAuth 왕복(수 초) 동안만 유효하면 되므로 10분 후 자동 만료된다.
 */
export const SIGNUP_INTENT_COOKIE = "signup_intent";

/**
 * 선택한 회원유형(intendedRole) 보관 키.
 * `/signup/complete`가 OAuth 리다이렉트 후 URL 쿼리에서 intendedRole을 못 읽으면
 * 이 sessionStorage 값을 폴백으로 사용한다.
 */
export const INTENDED_ROLE_KEY = "intendedRole";

/**
 * 회원가입 버튼 클릭 시점에 호출 (소셜 signIn 직전).
 *
 * @param intendedRole 선택한 회원유형(PERSONAL/RENTAL_BIZ/REALESTATE/BUSINESS).
 *   OAuth 왕복 중 redirectTo URL 쿼리가 유실돼도 역할을 복구할 수 있도록 sessionStorage에 저장한다.
 *   (같은 탭에서 동일 origin으로 복귀하므로 sessionStorage가 유지된다.)
 */
export function markSignupIntent(intendedRole?: string) {
  if (typeof document === "undefined") return;
  const secure = location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${SIGNUP_INTENT_COOKIE}=1; path=/; max-age=600; samesite=lax${secure}`;
  if (intendedRole && typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.setItem(INTENDED_ROLE_KEY, intendedRole);
    } catch {
      // 프라이빗 모드 등 sessionStorage 불가 시 URL 쿼리 경로로 폴백
    }
  }
}
