"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, CheckCheck, Inbox } from "lucide-react";
import { notifikasiApi } from "@/lib/api";
import { EVENT_NOTIF_BERUBAH, formatRelativeTime, kabarkanNotifBerubah } from "@/lib/notifikasi";

export default function NotifikasiPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [terbukaId, setTerbukaId] = useState(null);

  const muat = useCallback(() => {
    notifikasiApi
      .getAll()
      .then((data) => setItems(data?.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    muat();
    const interval = setInterval(() => { if (!document.hidden) muat(); }, 45 * 1000);
    window.addEventListener(EVENT_NOTIF_BERUBAH, muat);
    return () => {
      clearInterval(interval);
      window.removeEventListener(EVENT_NOTIF_BERUBAH, muat);
    };
  }, [muat]);

  const kembali = () => {
    if (window.history.length > 1) router.back();
    else router.push("/dashboard");
  };

  const tandaiDibaca = (n, pindah = false) => {
    setItems((prev) => prev.filter((x) => x.id !== n.id));
    setTerbukaId(null);
    notifikasiApi.markRead(n.id).then(kabarkanNotifBerubah).catch(() => {});
    if (pindah && n.link) router.push(n.link);
  };

  const bacaSemua = async () => {
    setItems([]);
    try {
      await notifikasiApi.markAllRead();
    } catch {
      muat();
    }
    kabarkanNotifBerubah();
  };

  return (
    <div className="page-stack">
      <div className="table-card notif-page-card">
        <div className="notif-page-head">
          <button type="button" className="notif-back-btn" onClick={kembali} aria-label="Kembali" title="Kembali">
            <ArrowLeft size={18} />
          </button>
          <div className="notif-page-judul">
            <h2>Notifikasi</h2>
            <p>Notifikasi yang sudah dibaca otomatis dihapus.</p>
          </div>
          {items.length > 0 && (
            <button type="button" className="btn-secondary" onClick={bacaSemua}>
              <CheckCheck size={15} /> Tandai semua dibaca
            </button>
          )}
        </div>

        {loading ? (
          <div className="notif-empty"><p>Memuat…</p></div>
        ) : items.length === 0 ? (
          <div className="notif-empty">
            <Inbox size={32} strokeWidth={1.2} />
            <p>Belum ada notifikasi.</p>
          </div>
        ) : (
          <div className="notif-page-list">
            {items.map((n) => (
              <div
                key={n.id}
                className={`notif-item unread${terbukaId === n.id ? " terbuka" : ""}`}
                role="button"
                tabIndex={0}
                aria-expanded={terbukaId === n.id}
                onClick={() => setTerbukaId((cur) => (cur === n.id ? null : n.id))}
                onKeyDown={(e) => { if (e.key === "Enter") setTerbukaId((cur) => (cur === n.id ? null : n.id)); }}
              >
                <span className="notif-item-dot" />
                <div className="notif-item-body">
                  <span className="notif-item-title">{n.judul}</span>
                  <span className="notif-item-msg">{n.pesan}</span>
                  <span className="notif-item-time">{formatRelativeTime(n.createdAt)}</span>
                  {terbukaId === n.id && (
                    <div className="notif-item-aksi" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                      <button type="button" className="notif-aksi-btn utama" onClick={() => tandaiDibaca(n)}>
                        <Check size={14} /> Tandai sudah dibaca
                      </button>
                      {n.link && (
                        <button type="button" className="notif-aksi-btn" onClick={() => tandaiDibaca(n, true)}>
                          Buka
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
