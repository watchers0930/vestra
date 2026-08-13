import SessionGuard from "@/components/auth/session-guard";

export default function PersonalHomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionGuard>{children}</SessionGuard>;
}
