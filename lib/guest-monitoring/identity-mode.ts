export const OTP_TTL = 5 * 60_000;

export function resolveIdentityMode(): "sms_otp" | "danal" {
  return process.env.GUEST_IDENTITY_MODE === "sms_otp" ? "sms_otp" : "danal";
}
