"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Footer from "./Footer";
import GantiPasswordModal from "@/components/auth/GantiPasswordModal";
import { authApi } from "@/lib/api";
import { getToken, getUser, saveUser, clearSession } from "@/lib/session";
import { isPathAllowed } from "@/lib/nav";
import { useUser } from "@/lib/useUser";
import { showMessage } from "@/lib/message";

// Otomatis logout kalau tidak ada aktivitas sama sekali selama 15 menit.
const IDLE_LIMIT_MS = 15 * 60 * 1000;
const IDLE_EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"];

export default function DashboardShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Sekali per pemuatan: ambil hak akses terbaru dari server. Kalau admin baru saja
  // mengubah jabatan/matriks, menu dan tombol ikut berubah tanpa harus login ulang.
  useEffect(() => {
    if (!getToken() || !getUser()) {
      clearSession();
      router.replace("/login");
      return;
    }
    let cancelled = false;
    authApi
      .me()
      .then((fresh) => {
        if (!cancelled) saveUser(fresh);
      })
      .catch(() => {
        // 401 sudah membersihkan sesi di request(); arahkan ke login.
        if (!cancelled && !getToken()) router.replace("/login");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Guard halaman: berdasarkan permission, bukan nama role.
  useEffect(() => {
    if (!user) return;
    if (!isPathAllowed(user, pathname)) {
      setIsAuthorized(false);
      router.replace("/dashboard");
      return;
    }
    setIsAuthorized(true);
  }, [user, pathname, router]);

  // Auto-logout kalau tidak ada aktivitas (mouse/keyboard/klik/scroll) selama 15 menit.
  const idleTimerRef = useRef(null);

  const handleIdleTimeout = useCallback(async () => {
    clearSession();
    await showMessage(
      "Sesi Berakhir",
      "Kamu keluar otomatis karena tidak ada aktivitas selama 15 menit.",
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

      {/* Login pertama dengan password sementara dari pengurus RT: wajib ganti dulu */}
      {user?.wajibGantiPassword && <GantiPasswordModal wajib />}
    </div>
  );
}
