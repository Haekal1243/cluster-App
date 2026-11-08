"use client";

import { MessageCircle, Forward } from "lucide-react";
import DetailModal from "@/components/ui/DetailModal";
import { pengaduanApi } from "@/lib/api";
import { areaLabel } from "@/lib/session";
import { formatTanggalPanjang as formatDate, formatTanggalPendek } from "@/lib/format";

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

export default function PengaduanDetailModal({ pengaduan, onClose }) {
  if (!pengaduan) return null;
  const status = STATUS_LABELS[pengaduan.status] || STATUS_LABELS.MENUNGGU;

  return (
    <DetailModal
      title="Detail Pengaduan"
      onClose={onClose}
      foto={pengaduan.fotoUrl ? pengaduanApi.imageUrl(pengaduan.fotoUrl) : null}
      fotoAlt={pengaduan.judul}
      judul={pengaduan.judul}
      badge={<span className={`ipl-status-badge ${status.cls}`}>{status.label}</span>}
      kolomInfo={3}
      info={[
        { label: "Kategori", value: KATEGORI_LABELS[pengaduan.kategori] || pengaduan.kategori },
        { label: "Tujuan", value: areaLabel(pengaduan.tujuan) },
        { label: "Tgl Lapor", value: formatTanggalPendek(pengaduan.createdAt) },
      ]}
      deskripsi={pengaduan.deskripsi}
    >
      {pengaduan.diteruskanAt && (
        <div className="ipl-summary-card tone-warning" style={{ alignItems: "flex-start" }}>
          <div className="ipl-summary-icon"><Forward size={20} /></div>
          <div className="ipl-summary-body">
            <span className="ipl-summary-label">Diteruskan ke RW</span>
            <span style={{ fontSize: "0.78rem", fontWeight: 500, lineHeight: 1.5, color: "var(--db-slate-700)" }}>
              Belum ditanggapi pengurus RT sejak {formatDate(pengaduan.createdAt)}, sudah
              diteruskan ke pengurus RW pada {formatDate(pengaduan.diteruskanAt)}.
            </span>
          </div>
        </div>
      )}

      {pengaduan.tanggapan && (
        <div className="ipl-summary-card tone-info" style={{ alignItems: "flex-start" }}>
          <div className="ipl-summary-icon"><MessageCircle size={20} /></div>
          <div className="ipl-summary-body">
            <span className="ipl-summary-label">
              Tanggapan{pengaduan.tanggapanBy ? ` dari ${pengaduan.tanggapanBy}` : ""}
            </span>
            <span style={{ fontSize: "0.8rem", fontWeight: 500, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
              {pengaduan.tanggapan}
            </span>
          </div>
        </div>
      )}
    </DetailModal>
  );
}
