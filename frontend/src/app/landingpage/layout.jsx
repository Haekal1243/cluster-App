import "./globals.css";
import ScrollFx from "@/components/landing/ScrollFx";

export const metadata = {
  title: "Portal Warga RW 21 - Cluster Topaz",
  description: "Portal resmi administrasi warga RW 21 Cluster Topaz, Kota Depok.",
};

export default function LandingpageLayout({ children }) {
  return (
    <>
      <ScrollFx />
      {children}
    </>
  );
}
