"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Footer from "./Footer";
import { getToken, clearSession } from "@/lib/session";
import { showMessage } from "@/lib/message";

const KNOWN_ROLES = ["ADMIN", "PENGURUS", "WARGA"];
// Warga hanya boleh mengakses Dashboard, Tagihan IPL, dan Pengaduan — halaman
// kelola (Data Warga, Kegiatan, Pengumuman) tetap khusus ADMIN/PENGURUS.
const WARGA_ALLOWED_PATHS = ["/dashboard", "/dashboard/iuran", "/dashboard/pengaduan"];

// Otomatis logout kalau tidak ada aktivitas sama sekali selama 15 menit.
const IDLE_LIMIT_MS = 15 * 60 * 1000;
const IDLE_EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"];

function isPathAllowedForWarga(pathname) {
  return WARGA_ALLOWED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export default function DashboardShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const rawUser = localStorage.getItem("user");
    if (!rawUser || !getToken()) {
      clearSession();
      router.replace("/login");
      return;
    }

    try {
      const user = JSON.parse(rawUser);
      if (!KNOWN_ROLES.includes(user?.role)) {
        clearSession();
        router.replace("/login");
        return;
      }
      if (user.role === "WARGA" && !isPathAllowedForWarga(pathname)) {
        setIsAuthorized(false);
        router.replace("/dashboard");
        return;
      }
      setIsAuthorized(true);
    } catch {
      clearSession();
      router.replace("/login");
    }
  }, [router, pathname]);

  // Auto-logout kalau tidak ada aktivitas (mouse/keyboard/klik/scroll) selama 15 menit.
  const idleTimerRef = useRef(null);

  const handleIdleTimeout = useCallback(async () => {
    clearSession();
    await showMessage(
      "Sesi Berakhir",
      "Kamu logout otomatis karena tidak ada aktivitas selama 15 menit.",
      "info"
    );
    router.replace("/login");
  }, [router]);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(handleIdleTimeout, IDLE_LIMIT_MS);
  }, [handleIdleTimeout]);

  useEffect(() => {
    if (!isAuthorized) return;

    resetIdleTimer();
    IDLE_EVENTS.forEach((event) =>
      window.addEventListener(event, resetIdleTimer, { passive: true })
    );

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      IDLE_EVENTS.forEach((event) =>
        window.removeEventListener(event, resetIdleTimer)
      );
    };
  }, [isAuthorized, resetIdleTimer]);

  // Hindari rendering tampilan dashboard sebelum otorisasi terkonfirmasi
  if (!isAuthorized) {
    return null;
  }

  // Di layar sempit (mobile), tombol hamburger buka/tutup sidebar overlay.
  // Di layar lebar (desktop), tombol yang sama menciutkan/melebarkan sidebar.
  const handleMenuClick = () => {
    if (typeof window !== "undefined" && window.innerWidth < 900) {
      setIsMobileOpen((prev) => !prev);
    } else {
      setIsCollapsed((prev) => !prev);
    }
  };

  return (
    <div className="dashboard-shell">
      <Sidebar
        isOpen={isMobileOpen}
        onClose={() => setIsMobileOpen(false)}
        isCollapsed={isCollapsed}
      />

      <div className="dashboard-main">
        <Header onMenuClick={handleMenuClick} />
        <main className="dashboard-content">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
