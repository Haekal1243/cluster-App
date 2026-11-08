"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Bell, CheckCheck, Inbox, Download } from "lucide-react";
import { notifikasiApi } from "@/lib/api";
import { EVENT_NOTIF_BERUBAH, formatRelativeTime, kabarkanNotifBerubah } from "@/lib/notifikasi";
import { areaLabel } from "@/lib/session";
import { pageTitle } from "@/lib/nav";
import { useUser } from "@/lib/useUser";
import { aktifkanBunyiNotif, bunyiNotif } from "@/lib/notifSound";

const POLL_INTERVAL_MS = 45 * 1000;

const JUMLAH_DI_PANEL = 3;

export default function Header({ onMenuClick }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user: currentUser } = useUser();
  const [notifications, setNotifications] = useState([]);
  const [belumDibaca, setBelumDibaca] = useState(0);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const panelRef = useRef(null);
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(display-mode: standalone)").matches) return;

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    const handleInstalled = () => setInstallPrompt(null);

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  useEffect(() => {
    let cancelled = false;
    let sudahMuat = false;
    const dilihat = new Set();
    const load = () => {
      if (document.hidden) return;
      notifikasiApi.getAll()
        .then((data) => {
          if (cancelled) return;
          const list = data?.items || [];
          const baru = list.some((n) => !n.isRead && !dilihat.has(n.id));
          list.forEach((n) => dilihat.add(n.id));
          if (sudahMuat && baru) bunyiNotif();
          sudahMuat = true;
          setNotifications(list);
          setBelumDibaca(data?.belumDibaca ?? list.length);
        })
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    const onPesanSw = (e) => {
      if (e.data?.type === "push-masuk") {
        bunyiNotif();
        load();
      }
    };
    const onTampil = () => { if (!document.hidden) load(); };
    document.addEventListener("visibilitychange", onTampil);
    navigator.serviceWorker?.addEventListener("message", onPesanSw);
    const lepasBunyi = aktifkanBunyiNotif();
    window.addEventListener(EVENT_NOTIF_BERUBAH, load);
    return () => {
      window.removeEventListener(EVENT_NOTIF_BERUBAH, load);
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onTampil);
      navigator.serviceWorker?.removeEventListener("message", onPesanSw);
      lepasBunyi();
    };
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

  const unreadCount = belumDibaca;
  const terbaru = notifications.slice(0, JUMLAH_DI_PANEL);

  const handleNotifClick = (notif) => {
    setIsPanelOpen(false);
    setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    setBelumDibaca((c) => Math.max(0, c - 1));
    notifikasiApi.markRead(notif.id).then(kabarkanNotifBerubah).catch(() => {});
    if (notif.link) router.push(notif.link);
  };

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    setNotifications([]);
    setBelumDibaca(0);
    try {
      await notifikasiApi.markAllRead();
    } catch {
    }
    kabarkanNotifBerubah();
  };

  const lihatSemua = () => {
    setIsPanelOpen(false);
    router.push("/dashboard/notifikasi");
  };

  const displayName = currentUser?.nama || currentUser?.name || "Pengguna";
  const displayRole = currentUser?.roleNama
    ? `${currentUser.roleNama}${currentUser.area ? ` · ${areaLabel(currentUser.area)}` : ""}`
    : "Pengguna";

  return (
    <header className="dashboard-header">
      <div className="header-left">
        <button
          type="button"
          className="header-menu-btn"
          onClick={onMenuClick}
          aria-label="Buka/tutup menu"
          title="Buka/tutup menu"
        >
          <Menu size={20} />
        </button>
        <h1>{pageTitle(pathname, currentUser)}</h1>
      </div>

      <div className="header-actions">
        {installPrompt && (
          <button
            type="button"
            className="header-install-btn"
            onClick={handleInstallClick}
            title="Install aplikasi ke perangkat"
          >
            <Download size={15} />
            <span>Install App</span>
          </button>
        )}

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
                  {terbaru.map((n) => (
                    <div
                      key={n.id}
                      className="notif-item unread"
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

              <button type="button" className="notif-lihat-semua" onClick={lihatSemua}>
                Lihat semua notifikasi
              </button>
            </div>
          )}
        </div>

        <div className="header-user">
          <div className="header-user-info">
            <span className="header-user-name">{displayName}</span>
            <span className="header-user-role">{displayRole}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
