"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { X, LogOut, KeyRound } from "lucide-react";
import { showConfirm } from "@/lib/message";
import GantiPasswordModal from "@/components/auth/GantiPasswordModal";
import { clearSession } from "@/lib/session";
import { NAV_ITEMS, navItemFor, resolveLabel } from "@/lib/nav";
import { useUser } from "@/lib/useUser";

export default function Sidebar({
  isOpen,
  onClose,
  isCollapsed,
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const [showGantiPassword, setShowGantiPassword] = useState(false);

  // Menu mengikuti hak akses (permission) user dari database, bukan nama role.
  const navItems = user ? NAV_ITEMS.filter((item) => item.allow(user)) : [];

  // Menu aktif mengikuti prefix path (mis. /dashboard/kelola-ipl/tagihan-warga membuat
  // menu Pengelolaan IPL aktif), konsisten dengan judul halaman & guard akses.
  // Beranda ditangani khusus karena navItemFor() mengembalikannya null.
  const activeHref = pathname === "/dashboard" ? "/dashboard" : navItemFor(pathname)?.href;

  const handleLogout = async () => {
    const confirmed = await showConfirm(
      "Keluar dari akun?",
      "Kamu akan kembali ke halaman masuk.",
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
            const isActive = href === activeHref;
            const resolvedLabel = resolveLabel(label, user);
            return (
              <Link
                key={href}
                href={href}
                className={`sidebar-link ${isActive ? "active" : ""}`}
                onClick={onClose}
                title={isCollapsed ? resolvedLabel : undefined}
              >
                <span className="sidebar-link-icon">
                  <Icon size={17} />
                </span>
                <span className="sidebar-link-label">{resolvedLabel}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          {/* Hak dasar akun: tampil untuk semua user login, tidak lewat permission menu */}
          <button
            type="button"
            className="sidebar-logout-btn sidebar-password-btn"
            onClick={() => setShowGantiPassword(true)}
            title={isCollapsed ? "Ganti Password" : undefined}
          >
            <span className="sidebar-link-icon">
              <KeyRound size={17} />
            </span>
            <span className="sidebar-link-label">Ganti Password</span>
          </button>
          <button
            type="button"
            className="sidebar-logout-btn"
            onClick={handleLogout}
            title={isCollapsed ? "Keluar" : undefined}
          >
            <span className="sidebar-link-icon">
              <LogOut size={17} />
            </span>
            <span className="sidebar-link-label">Keluar</span>
          </button>
        </div>
      </aside>

      {showGantiPassword && (
        <GantiPasswordModal
          onClose={() => {
            setShowGantiPassword(false);
            onClose();
          }}
        />
      )}
    </>
  );
}
