"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PortalSidebar from "./PortalSidebar";
import PortalHeader from "./PortalHeader";

export default function PortalShell({ children }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (!raw) {
        router.replace("/login");
        return;
      }
      const user = JSON.parse(raw);
      // Hanya WARGA yang boleh akses portal
      if (user?.role !== "WARGA") {
        router.replace("/login");
        return;
      }
      setIsAuthorized(true);
    } catch {
      localStorage.removeItem("user");
      router.replace("/login");
    }
  }, [router]);

  if (!isAuthorized) return null;

  return (
    <div className="portal-shell">
      <PortalSidebar
        isOpen={isMobileOpen}
        onClose={() => setIsMobileOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
      />
      <div className="portal-main">
        <PortalHeader onMenuClick={() => setIsMobileOpen((prev) => !prev)} />
        <main className="portal-content">{children}</main>
        <footer className="portal-footer">
          <p>© 2026 Cluster Topaz &mdash; Portal Warga</p>
        </footer>
      </div>
    </div>
  );
}
