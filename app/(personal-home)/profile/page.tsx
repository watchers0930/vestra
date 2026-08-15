import ProfileClient from "./ProfileClient";

export const metadata = {
  title: "마이페이지 - VESTRA",
  description: "내 자산 현황과 등급·구독·알림 등 계정 정보를 관리합니다.",
};

export default function ProfilePage() {
  return <ProfileClient />;
}
