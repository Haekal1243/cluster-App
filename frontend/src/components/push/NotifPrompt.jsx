"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { pushApi } from "@/lib/api";

const DISMISS_KEY = "notif-prompt-dismissed";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function subscribeToPush(registration) {
  const { publicKey } = await pushApi.getVapidKey();
  if (!publicKey) return;
  const existing = await registration.pushManager.getSubscription();
  const sub =
    existing ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));
  await pushApi.subscribe(sub.toJSON());
}

/** Banner kecil dismissible nawarin aktifkan push notification. Hanya tampil kalau
 * browser support (Chrome Android, dkk), izin belum pernah diputuskan ("default"),
 * dan belum pernah ditutup manual (localStorage). Kalau izin sudah "granted" dari
 * sebelumnya, diam-diam memastikan subscription masih aktif tanpa nge-nag. */
export default function NotifPrompt() {
  const [show, setShow] = useState(false);
  const [registration, setRegistration] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    let cancelled = false;
    navigator.serviceWorker
      .register("/sw.js")
      .then(async (reg) => {
        if (cancelled) return;
        setRegistration(reg);
        if (Notification.permission === "granted") {
          subscribeToPush(reg).catch(() => {});
        } else if (Notification.permission === "default" && !localStorage.getItem(DISMISS_KEY)) {
          setShow(true);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const handleAktifkan = async () => {
    if (!registration) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        await subscribeToPush(registration);
      }
    } catch {
      // Push bukan fitur kritikal — gagal diam-diam, tidak perlu ganggu user dengan error.
    } finally {
      setBusy(false);
      setShow(false);
    }
  };

  const handleTutup = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="notif-prompt" role="status">
      <div className="notif-prompt-icon">
        <Bell size={18} />
      </div>
      <div className="notif-prompt-body">
        <p className="notif-prompt-title">Aktifkan notifikasi?</p>
        <p className="notif-prompt-sub">Dapat kabar langsung soal pengaduan, tagihan, dan pengumuman terbaru.</p>
      </div>
      <div className="notif-prompt-actions">
        <button type="button" className="btn-ipl-primary" onClick={handleAktifkan} disabled={busy}>
          {busy ? "Memproses..." : "Aktifkan"}
        </button>
        <button type="button" className="notif-prompt-close" onClick={handleTutup} aria-label="Tutup">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
