"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Menu, Bell, ChevronDown, LogOut } from "lucide-react";
import { showConfirm } from "@/lib/message";

const PAGE_TITLES = {
  "/dashboard": "Dashboard",
  "/dashboard/warga": "Data Warga",
  "/dashboard/iuran": "Tagihan IPL",
  "/dashboard/kegiatan": "Kegiatan",
};

export default function Header({ onMenuClick }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    setIsMenuOpen(false);
    const ok = await showConfirm(
      "Keluar dari akun?",
      "Kamu akan kembali ke halaman login.",
      "warning",
      "Ya, keluar",
      "Batal",
    );
    if (ok) {
      router.push("/");
    }
  };

  return (
    <header className="dashboard-header">
      <div className="header-left">
        <button
          type="button"
          className="header-menu-btn"
          onClick={onMenuClick}
          aria-label="Buka menu"
        >
          <Menu size={20} />
        </button>
        <h1>{PAGE_TITLES[pathname] ?? "Dashboard"}</h1>
      </div>

      <div className="header-actions">
        <button
          type="button"
          className="header-icon-btn"
          aria-label="Notifikasi"
        >
          <Bell size={18} />
          <span className="badge-dot" />
        </button>

        <div
          className="header-user"
          onClick={() => setIsMenuOpen((prev) => !prev)}
        >
          <div className="header-avatar">A</div>
          <div className="header-user-info">
            <span className="header-user-name">Admin</span>
            <span className="header-user-role">Pengurus</span>
          </div>
          <ChevronDown size={16} />

          {isMenuOpen && (
            <div className="header-dropdown animate-pop">
              <button type="button" onClick={handleLogout}>
                <LogOut size={16} />
                Keluar
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
