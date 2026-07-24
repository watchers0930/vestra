"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { ChatContent } from "./components/ChatContent";

interface AppInfo {
  id: string;
  applicantId: string;
  listing: { address: string; owner: { id: string; name: string | null } };
  applicant: { id: string; name: string | null };
}

export default function ChatPage() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const { data: session } = useSession();
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    fetch(`/api/contract-applications/${applicationId}`)
      .then((r) => {
        if (r.status === 403 || r.status === 404) { setForbidden(true); return null; }
        return r.json();
      })
      .then((data) => { if (data) setAppInfo(data); })
      .finally(() => setLoading(false));
  }, [applicationId]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}>
        <Loader2 size={24} strokeWidth={1.5} style={{ animation: "spin 1s linear infinite", color: "#aeaeb2" }} />
      </div>
    );
  }

  if (forbidden || !appInfo) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0", color: "#aeaeb2" }}>
        <p style={{ fontSize: 16, fontWeight: 600 }}>접근할 수 없는 채팅방입니다</p>
      </div>
    );
  }

  const isOwner = session?.user?.id === appInfo.listing.owner.id;
  const partnerName = isOwner
    ? (appInfo.applicant.name ?? "신청자")
    : (appInfo.listing.owner.name ?? "임대인");

  return (
    <ChatContent
      applicationId={applicationId}
      partnerName={partnerName}
      address={appInfo.listing.address}
    />
  );
}
