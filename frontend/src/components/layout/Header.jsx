"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Bell, CheckCheck, Inbox } from "lucide-react";
import { notifikasiApi } from "@/lib/api";

const PAGE_TITLES = {
  "/dashboard": "Dashboard",
  "/dashboard/warga": "Data Warga",
  "/dashboard/iuran": "Tagihan IPL",
  "/dashboard/pengaduan": "Pengaduan Lingkungan",
  "/dashboard/kegiatan": "Kegiatan",
  "/dashboard/pengumuman": "Pengumuman",
};

const POLL_INTERVAL_MS = 45 * 1000;

function formatRelativeTime(dateStr) {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} hari lalu`;
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Header({ onMenuClick }) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) setCurrentUser(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      notifikasiApi.getAll()
        .then((data) => { if (!cancelled) setNotifications(data || []); })
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  useEffect(() => {
    if (!isPanelOpen) return;
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsPanelOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isPanelOpen]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleNotifClick = async (notif) => {
    setIsPanelOpen(false);
    if (!notif.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
      notifikasiApi.markRead(notif.id).catch(() => {});
    }
    if (notif.link) router.push(notif.link);
  };

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await notifikasiApi.markAllRead();
    } catch {
      // ignore
    }
  };

  const displayName = currentUser?.nama || currentUser?.name || "Admin";
  const ROLE_LABELS = { ADMIN: "Admin", PENGURUS: "Pengurus", WARGA: "Warga" };
  const displayRole = ROLE_LABELS[currentUser?.role] || currentUser?.role || "Staff";
  const avatarInitial = displayName.charAt(0).toUpperCase();

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
        <div className="notif-wrap" ref={panelRef}>
          <button
            type="button"
            className="header-icon-btn"
            aria-label="Notifikasi"
            onClick={() => setIsPanelOpen((prev) => !prev)}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="notif-badge-count">{unreadCount > 9 ? "9+" : unreadCount}</span>
            )}
          </button>

          {isPanelOpen && (
            <div className="notif-panel">
              <div className="notif-panel-header">
                <span>Notifikasi</span>
                {unreadCount > 0 && (
                  <button type="button" onClick={handleMarkAllRead}>
                    <CheckCheck size={13} /> Tandai semua dibaca
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="notif-empty">
                  <Inbox size={28} strokeWidth={1.2} />
                  <p>Belum ada notifikasi.</p>
                </div>
              ) : (
                <div className="notif-list">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`notif-item ${!n.isRead ? "unread" : ""}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleNotifClick(n)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleNotifClick(n); }}
                    >
                      <span className="notif-item-dot" />
                      <div className="notif-item-body">
                        <span className="notif-item-title">{n.judul}</span>
                        <span className="notif-item-msg">{n.pesan}</span>
                        <span className="notif-item-time">{formatRelativeTime(n.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="header-user">
          <div className="header-avatar">{avatarInitial}</div>
          <div className="header-user-info">
            <span className="header-user-name">{displayName}</span>
            <span className="header-user-role">{displayRole}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
