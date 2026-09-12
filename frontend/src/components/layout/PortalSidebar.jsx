"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CreditCard,
  Megaphone,
  CalendarDays,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Home,
} from "lucide-react";
import { showConfirm } from "@/lib/message";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/portal", icon: LayoutDashboard },
  { label: "Tagihan IPL", href: "/portal/tagihan", icon: CreditCard },
  { label: "Pengumuman", href: "/portal/pengumuman", icon: Megaphone },
  { label: "Kegiatan", href: "/portal/kegiatan", icon: CalendarDays },
];

export default function PortalSidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  const handleLogout = async () => {
    const ok = await showConfirm(
      "Keluar dari akun?",
      "Kamu akan kembali ke halaman login.",
      "warning",
      "Ya, keluar",
      "Batal"
    );
    if (ok) {
      localStorage.removeItem("user");
      router.replace("/login");
    }
  };

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}

      <aside className={`portal-sidebar ${isOpen ? "is-open" : ""} ${isCollapsed ? "collapsed" : ""}`}>
        <button
          type="button"
          className="sidebar-toggle-btn"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? "Buka sidebar" : "Ciutkan sidebar"}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Brand */}
        <div className="portal-sidebar-brand">
          <div className="portal-brand-icon">
            <Home size={20} />
          </div>
          <span className="sidebar-brand-text">Portal Warga</span>
          <button
            type="button"
            className="sidebar-close"
            onClick={onClose}
            aria-label="Tutup menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* User info card */}
        {user && (
          <div className="portal-user-card">
            <div className="portal-user-avatar">
              {user.nama?.charAt(0)?.toUpperCase() || "W"}
            </div>
            <div className="portal-user-info">
              <span className="portal-user-name">{user.nama || user.name}</span>
              <span className="portal-user-role">Warga</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const isActive = pathname === href || (href !== "/portal" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`sidebar-link ${isActive ? "active" : ""}`}
                onClick={onClose}
                title={isCollapsed ? label : undefined}
              >
                <span className="sidebar-link-icon">
                  <Icon size={17} />
                </span>
                <span className="sidebar-link-label">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="sidebar-footer">
          <button
            type="button"
            className="sidebar-logout-btn"
            onClick={handleLogout}
            title={isCollapsed ? "Logout" : undefined}
          >
            <span className="sidebar-link-icon">
              <LogOut size={17} />
            </span>
            <span className="sidebar-link-label">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
