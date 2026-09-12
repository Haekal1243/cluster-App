import PortalShell from "@/components/layout/PortalShell";

export const metadata = {
  title: "Portal Warga - Cluster Topaz",
  description: "Portal warga untuk melihat tagihan IPL, pengumuman, dan informasi cluster.",
};

export default function PortalLayout({ children }) {
  return <PortalShell>{children}</PortalShell>;
}
