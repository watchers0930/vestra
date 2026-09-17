import "./landing.css";
import { LandingNav } from "./components/LandingNav";
import SiteFooter from "@/components/layout/SiteFooter";

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LandingNav />
      <main>{children}</main>
      <SiteFooter />
    </>
  );
}
