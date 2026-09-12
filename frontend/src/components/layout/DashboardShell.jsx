"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Footer from "./Footer";

export default function DashboardShell({ children }) {
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const rawUser = localStorage.getItem("user");
    if (!rawUser) {
      router.replace("/login");
      return;
    }

    try {
      const user = JSON.parse(rawUser);
      // Validasi Role: Hanya ADMIN dan PENGURUS yang boleh berada di dashboard
      if (user?.role !== "ADMIN" && user?.role !== "PENGURUS") {
        localStorage.removeItem("user");
        router.replace("/login");
        return;
      }
      setIsAuthorized(true);
    } catch {
      localStorage.removeItem("user");
      router.replace("/login");
    }
  }, [router]);

  // Hindari rendering tampilan dashboard sebelum otorisasi terkonfirmasi
  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="dashboard-shell">
      <Sidebar
        isOpen={isMobileOpen}
        onClose={() => setIsMobileOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
      />

      <div className="dashboard-main">
        <Header onMenuClick={() => setIsMobileOpen((prev) => !prev)} />
        <main className="dashboard-content">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
