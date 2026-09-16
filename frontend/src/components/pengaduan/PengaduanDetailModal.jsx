"use client";

import { Calendar, MessageCircle } from "lucide-react";
import { pengaduanApi } from "@/lib/api";

const KATEGORI_LABELS = {
  KEBERSIHAN: "Kebersihan",
  KEAMANAN: "Keamanan",
  INFRASTRUKTUR: "Infrastruktur",
  LAINNYA: "Lainnya",
};

const STATUS_LABELS = {
  MENUNGGU: { label: "Menunggu", cls: "status-menunggu" },
  DIPROSES: { label: "Diproses", cls: "status-diproses" },
  SELESAI: { label: "Selesai", cls: "status-selesai" },
  DITOLAK: { label: "Ditolak", cls: "status-ditolak" },
};

function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export default function PengaduanDetailModal({ pengaduan, onClose }) {
  if (!pengaduan) return null;
  const status = STATUS_LABELS[pengaduan.status] || STATUS_LABELS.MENUNGGU;

  return (
    <div className="ipl-modal-overlay" onClick={onClose}>
      <div className="ipl-modal ipl-modal-review pengaduan-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ipl-modal-header">
          <h3>Detail Pengaduan</h3>
          <button className="ipl-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="ipl-modal-body">
          {pengaduan.fotoUrl && (
            <img
              src={pengaduanApi.imageUrl(pengaduan.fotoUrl)}
              alt={pengaduan.judul}
              style={{ width: "100%", borderRadius: 12, maxHeight: 260, objectFit: "cover" }}
            />
          )}

          <div className="review-info-grid">
            <div className="review-info-item">
              <span className="review-info-label">Judul</span>
              <span className="review-info-value">{pengaduan.judul}</span>
            </div>
            <div className="review-info-item">
              <span className="review-info-label">Kategori</span>
              <span className="review-info-value">{KATEGORI_LABELS[pengaduan.kategori] || pengaduan.kategori}</span>
            </div>
            <div className="review-info-item">
              <span className="review-info-label">Tanggal Lapor</span>
              <span className="review-info-value">{formatDate(pengaduan.createdAt)}</span>
            </div>
            <div className="review-info-item">
              <span className="review-info-label">Status</span>
              <span className={`ipl-status-badge ${status.cls}`}>{status.label}</span>
            </div>
          </div>

          <div className="review-desc-card">
            <p className="review-bukti-label">Deskripsi</p>
            <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{pengaduan.deskripsi}</p>
          </div>

          {pengaduan.tanggapan && (
            <div className="ipl-summary-card tone-info" style={{ alignItems: "flex-start" }}>
              <div className="ipl-summary-icon"><MessageCircle size={20} /></div>
              <div className="ipl-summary-body">
                <span className="ipl-summary-label">
                  Tanggapan{pengaduan.tanggapanBy ? ` dari ${pengaduan.tanggapanBy}` : ""}
                </span>
                <span style={{ fontSize: "0.9rem", fontWeight: 500, whiteSpace: "pre-wrap" }}>
                  {pengaduan.tanggapan}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
