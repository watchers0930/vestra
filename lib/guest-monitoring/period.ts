const KST = 9 * 60 * 60_000;
export function addKstMonth(date: Date): Date {
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid date");
  const local = new Date(date.getTime() + KST);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth();
  const day = Math.min(local.getUTCDate(), new Date(Date.UTC(year, month + 2, 0)).getUTCDate());
  return new Date(Date.UTC(year, month + 1, day, local.getUTCHours(),
    local.getUTCMinutes(), local.getUTCSeconds(), local.getUTCMilliseconds()) - KST);
}
export function paidPeriod(now: Date, paidUntil: Date | null) {
  const start = paidUntil && paidUntil > now ? paidUntil : now;
  return { start, end: addKstMonth(start) };
}
export function kstMonth(now = new Date()) {
  return new Date(now.getTime() + KST).toISOString().slice(0, 7);
}
export function monthBounds(month: string) {
  const [y, m] = month.split("-").map(Number);
  return { start: new Date(Date.UTC(y, m - 1, 1) - KST), end: new Date(Date.UTC(y, m, 1) - KST) };
}
