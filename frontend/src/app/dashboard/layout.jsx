import DashboardShell from "@/components/layout/DashboardShell";
import ProtectedFileViewer from "@/components/ui/ProtectedFileViewer";
import PickerKlikPenuh from "@/components/ui/PickerKlikPenuh";

export default function DashboardLayout({ children }) {
  return (
    <>
      <DashboardShell>{children}</DashboardShell>
      <ProtectedFileViewer />
      <PickerKlikPenuh />
    </>
  );
}
