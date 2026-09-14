"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Wallet,
  CalendarDays,
  Megaphone,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Data Warga", href: "/dashboard/warga", icon: Users },
  { label: "Tagihan IPL", href: "/dashboard/iuran", icon: Wallet },
  { label: "Kegiatan", href: "/dashboard/kegiatan", icon: CalendarDays },
  { label: "Pengumuman", href: "/dashboard/pengumuman", icon: Megaphone },
];

export default function Sidebar({
  isOpen,
  onClose,
  isCollapsed,
  onToggleCollapse,
}) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.replace("/login");
  };

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}

      <aside
        className={`dashboard-sidebar ${isOpen ? "is-open" : ""} ${isCollapsed ? "collapsed" : ""}`}
      >
        <button
          type="button"
          className="sidebar-toggle-btn"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? "Buka sidebar" : "Ciutkan sidebar"}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="sidebar-brand">
          <img src="/LogoTopaz.svg" alt="Topaz Cluster" />
          <span className="sidebar-brand-text">Topaz</span>
          <button
            type="button"
            className="sidebar-close"
            onClick={onClose}
            aria-label="Tutup menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const isActive = pathname === href;
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

        <div className="sidebar-footer">
          <button
            type="button"
            className="sidebar-logout-btn"
            onClick={handleLogout}
            title={isCollapsed ? " Logout" : undefined}
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
