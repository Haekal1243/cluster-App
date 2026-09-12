"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, Bell } from "lucide-react";

const PAGE_TITLES = {
  "/portal": "Dashboard",
  "/portal/tagihan": "Tagihan IPL",
  "/portal/pengumuman": "Pengumuman",
  "/portal/kegiatan": "Kegiatan",
};

export default function PortalHeader({ onMenuClick }) {
  const pathname = usePathname();
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  const title = Object.entries(PAGE_TITLES)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([path]) => pathname === path || pathname.startsWith(`${path}/`))?.[1] ?? "Portal";

  return (
    <header className="portal-header">
      <div className="header-left">
        <button
          type="button"
          className="header-menu-btn"
          onClick={onMenuClick}
          aria-label="Buka menu"
        >
          <Menu size={20} />
        </button>
        <h1>{title}</h1>
      </div>

      <div className="header-actions">
        <button type="button" className="header-icon-btn" aria-label="Notifikasi">
          <Bell size={18} />
        </button>

        <div className="portal-header-user">
          <div className="header-avatar portal-avatar">
            {user?.nama?.charAt(0)?.toUpperCase() || "W"}
          </div>
          <span className="portal-header-name">{user?.nama || user?.name || "Warga"}</span>
        </div>
      </div>
    </header>
  );
}
