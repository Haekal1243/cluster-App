import DashboardShell from "@/components/layout/DashboardShell";
import ProtectedFileViewer from "@/components/ui/ProtectedFileViewer";

// Auth-check (token + role + path allowlist warga) sepenuhnya ditangani oleh
// DashboardShell — jadi layout ini cukup merender shell-nya saja.
export default function DashboardLayout({ children }) {
  return (
    <>
      <DashboardShell>{children}</DashboardShell>
      <ProtectedFileViewer />
    </>
  );
}
