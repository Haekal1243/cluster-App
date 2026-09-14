"use client";

import { useEffect, useState } from "react";
import { Megaphone, FileText, Calendar } from "lucide-react";
import { pengumumanApi } from "@/lib/api";

function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export default function PortalPengumumanPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pengumumanApi.getActive()
      .then((res) => setData(res || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-stack">
      {loading ? (
        <div className="portal-loading">
          <div className="portal-spinner" />
          <p>Memuat pengumuman...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="portal-empty-notice">
          <Megaphone size={40} />
          <p>Belum ada pengumuman aktif saat ini.</p>
        </div>
      ) : (
        <div className="portal-card-list">
          {data.map((p) => (
            <div key={p.id} className="portal-info-card">
              <div className="portal-info-card-icon">
                <Megaphone size={18} />
              </div>
              <div className="portal-info-card-body">
                <h3 className="portal-info-card-title">{p.judul}</h3>
                {p.keteranganPengumuman && (
                  <p className="portal-info-card-desc">{p.keteranganPengumuman}</p>
                )}
                <div className="portal-info-card-meta">
                  <span><Calendar size={12} /> {formatDate(p.createDate)}</span>
                  {p.filePengumuman && (
                    <a
                      href={pengumumanApi.fileUrl?.(p.filePengumuman) || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="portal-download-link"
                    >
                      <FileText size={12} /> Lihat Lampiran
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
