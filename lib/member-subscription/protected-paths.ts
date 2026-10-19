// Pure path classification for the onboarding gate. No prisma/server imports so
// the Edge middleware (proxy.ts) can import it without pulling the DB layer into
// the Edge bundle. onboarding-access.ts re-exports this for server use.

// Protect app features only. Authentication, billing, support, personal data,
// APIs (including payment callbacks), and guest monitoring remain reachable.
const PROTECTED_ROOTS = [
  "/home", "/dashboard", "/realtor", "/landlord", "/rights", "/contract",
  "/tax", "/assistant", "/monitoring", "/official-price", "/loan-check",
  "/decision-report", "/jeonse", "/price-map", "/feasibility", "/agent",
  "/report", "/e-contract", "/registry", "/prediction", "/listings/new",
  "/renewal/rights", "/renewal/contract", "/renewal/tax", "/renewal/assistant",
  "/renewal/monitoring", "/renewal/official-price", "/renewal/loan-check",
  "/renewal/decision-report", "/renewal/jeonse", "/renewal/price-map",
  "/renewal/listing-new",
];

function within(pathname: string, root: string) {
  return pathname === root || pathname.startsWith(`${root}/`);
}

export function isOnboardingProtectedPath(pathname: string): boolean {
  if (within(pathname, "/renewal/monitoring/guest")) return false;
  return PROTECTED_ROOTS.some(root => within(pathname, root));
}
