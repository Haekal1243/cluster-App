"use client";

import { useEffect, useState } from "react";
import { CalendarDays, MapPin, Calendar } from "lucide-react";
import { kegiatanApi } from "@/lib/api";

function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

export default function PortalKegiatanPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    kegiatanApi.getActive()
      .then((res) => setData(res || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-stack">
      {loading ? (
        <div className="portal-loading">
          <div className="portal-spinner" />
          <p>Memuat kegiatan...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="portal-empty-notice">
          <CalendarDays size={40} />
          <p>Belum ada kegiatan aktif saat ini.</p>
        </div>
      ) : (
        <div className="portal-kegiatan-grid">
          {data.map((k) => (
            <div key={k.id} className="portal-kegiatan-card">
              {k.gambarUrl && (
                <div className="portal-kegiatan-img-wrap">
                  <img
                    src={kegiatanApi.imageUrl(k.gambarUrl)}
                    alt={k.judul}
                    className="portal-kegiatan-img"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                </div>
              )}
              <div className="portal-kegiatan-body">
                <h3 className="portal-kegiatan-title">{k.judul}</h3>
                {k.deskripsi && (
                  <p className="portal-kegiatan-desc">{k.deskripsi}</p>
                )}
                <div className="portal-kegiatan-meta">
                  <span><Calendar size={13} /> {formatDate(k.tanggalAcara)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
