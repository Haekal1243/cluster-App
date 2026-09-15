"use client";

import { Megaphone, FileText, Calendar } from "lucide-react";
import { pengumumanApi } from "@/lib/api";

function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export default function PengumumanDetailModal({ pengumuman, onClose }) {
  if (!pengumuman) return null;

  return (
    <div className="ipl-modal-overlay" onClick={onClose}>
      <div className="ipl-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ipl-modal-header">
          <h3><Megaphone size={16} /> Detail Pengumuman</h3>
          <button className="ipl-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="ipl-modal-body">
          <h3 className="portal-info-card-title">{pengumuman.judul}</h3>

          <div className="portal-info-card-meta">
            <span className="meta-item"><Calendar size={12} /> {formatDate(pengumuman.createDate)}</span>
            {pengumuman.filePengumuman && (
              <a
                href={pengumumanApi.fileUrl?.(pengumuman.filePengumuman) || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="portal-download-link"
              >
                <FileText size={12} /> Lihat Lampiran
              </a>
            )}
          </div>

          {pengumuman.keteranganPengumuman && (
            <p className="portal-info-card-desc" style={{ whiteSpace: "pre-wrap" }}>
              {pengumuman.keteranganPengumuman}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
