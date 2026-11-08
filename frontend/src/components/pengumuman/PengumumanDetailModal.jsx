"use client";

import { Megaphone, FileText } from "lucide-react";
import DetailModal from "@/components/ui/DetailModal";
import { pengumumanApi } from "@/lib/api";
import { formatTanggalPanjang as formatDate } from "@/lib/format";
import { can } from "@/lib/session";
import { useUser } from "@/lib/useUser";

export default function PengumumanDetailModal({ pengumuman, onClose }) {
  const { user } = useUser();
  if (!pengumuman) return null;
  const bolehLihatAlasan = !!user && can(user, "pengumuman.update");

  const info = [{ label: "Tanggal", value: formatDate(pengumuman.createDate), penuh: !pengumuman.filePengumuman }];
  if (pengumuman.filePengumuman) {
    info.push({
      label: "Lampiran",
      value: (
        <a
          href={pengumumanApi.fileUrl?.(pengumuman.filePengumuman) || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="portal-download-link"
        >
          <FileText size={12} /> Lihat Lampiran
        </a>
      ),
    });
  }

  return (
    <DetailModal
      title="Detail Pengumuman"
      icon={Megaphone}
      onClose={onClose}
      judul={pengumuman.judul}
      info={info}
      deskripsi={pengumuman.keteranganPengumuman}
    >
      {bolehLihatAlasan && pengumuman.statusPengajuan === "DITOLAK" && pengumuman.alasanTolak && (
        <div className="review-desc-card">
          <span className="review-info-label">Alasan Ditolak</span>
          <p className="review-desc-text">{pengumuman.alasanTolak}</p>
        </div>
      )}
    </DetailModal>
  );
}
