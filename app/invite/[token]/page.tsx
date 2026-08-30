import { SessionProvider } from "next-auth/react";
import InviteClient from "./InviteClient";

export const metadata = {
  title: "고객 초대 · VESTRA",
  robots: { index: false, follow: false },
};

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <SessionProvider>
      <InviteClient token={token} />
    </SessionProvider>
  );
}
