"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Wallet,
  ReceiptText,
  CalendarDays,
  Megaphone,
  MessageSquareWarning,
  X,
  LogOut,
} from "lucide-react";
import { showConfirm } from "@/lib/message";
import { clearSession } from "@/lib/session";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["ADMIN", "PENGURUS", "WARGA"] },
  { label: "Data Warga", href: "/dashboard/warga", icon: Users, roles: ["ADMIN", "PENGURUS"] },
  { label: "Tagihan IPL", href: "/dashboard/iuran", icon: Wallet, roles: ["ADMIN", "PENGURUS", "WARGA"] },
  { label: "Keuangan", href: "/dashboard/keuangan", icon: ReceiptText, roles: ["ADMIN", "PENGURUS"] },
  { label: "Pengaduan", href: "/dashboard/pengaduan", icon: MessageSquareWarning, roles: ["ADMIN", "PENGURUS", "WARGA"] },
  { label: "Kegiatan", href: "/dashboard/kegiatan", icon: CalendarDays, roles: ["ADMIN", "PENGURUS"] },
  { label: "Pengumuman", href: "/dashboard/pengumuman", icon: Megaphone, roles: ["ADMIN", "PENGURUS"] },
];

export default function Sidebar({
  isOpen,
  onClose,
  isCollapsed,
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState(null);

  useEffect(() => {
    try {
      const rawUser = localStorage.getItem("user");
      setRole(rawUser ? JSON.parse(rawUser)?.role : null);
    } catch {
      setRole(null);
    }
  }, []);

  const navItems = NAV_ITEMS.filter((item) => !role || item.roles.includes(role));

  const handleLogout = async () => {
    const confirmed = await showConfirm(
      "Keluar dari akun?",
      "Kamu akan kembali ke halaman login.",
      "warning",
      "Ya, keluar",
      "Batal"
    );
    if (!confirmed) return;
    clearSession();
    router.replace("/login");
  };

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}

      <aside
        className={`dashboard-sidebar ${isOpen ? "is-open" : ""} ${isCollapsed ? "collapsed" : ""}`}
      >
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
          {navItems.map(({ label, href, icon: Icon }) => {
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
