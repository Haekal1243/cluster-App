"use client";

import { Calendar } from "lucide-react";
import { kegiatanApi } from "@/lib/api";
import { formatTanggalLengkap as formatDate } from "@/lib/format";

export default function KegiatanDetailModal({ kegiatan, onClose }) {
  if (!kegiatan) return null;

  return (
    <div className="ipl-modal-overlay" onClick={onClose}>
      <div className="ipl-modal ipl-modal-review" onClick={(e) => e.stopPropagation()}>
        <div className="ipl-modal-header">
          <h3>Detail Kegiatan</h3>
          <button className="ipl-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="ipl-modal-body">
          {kegiatan.gambarUrl && (
            <div className="portal-kegiatan-img-wrap">
              <img
                src={kegiatanApi.imageUrl(kegiatan.gambarUrl)}
                alt={kegiatan.judul}
                className="portal-kegiatan-img"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            </div>
          )}

          <h3 className="portal-kegiatan-title">{kegiatan.judul}</h3>

          <div className="portal-kegiatan-meta">
            <span className="meta-item"><Calendar size={13} /> {formatDate(kegiatan.tanggalAcara)}</span>
          </div>

          {kegiatan.deskripsi && (
            <p className="portal-kegiatan-desc" style={{ whiteSpace: "pre-wrap" }}>
              {kegiatan.deskripsi}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
