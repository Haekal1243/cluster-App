"use client";

import DetailModal from "@/components/ui/DetailModal";
import { kegiatanApi } from "@/lib/api";
import { formatTanggalLengkap as formatDate } from "@/lib/format";
import BeriMasukan from "./BeriMasukan";
import { can } from "@/lib/session";
import { useUser } from "@/lib/useUser";

export default function KegiatanDetailModal({ kegiatan, onClose, tampilMasukan = false }) {
  const { user } = useUser();
  if (!kegiatan) return null;
  const bolehLihatAlasan = !!user && can(user, "kegiatan.update");

  return (
    <DetailModal
      title="Detail Kegiatan"
      onClose={onClose}
      foto={kegiatan.gambarUrl ? kegiatanApi.imageUrl(kegiatan.gambarUrl) : null}
      fotoAlt={kegiatan.judul}
      judul={kegiatan.judul}
      info={[{ label: "Tanggal Acara", value: formatDate(kegiatan.tanggalAcara), penuh: true }]}
      deskripsi={kegiatan.deskripsi}
    >
      {bolehLihatAlasan && kegiatan.statusPengajuan === "DITOLAK" && kegiatan.alasanTolak && (
        <div className="review-desc-card">
          <span className="review-info-label">Alasan Ditolak</span>
          <p className="review-desc-text">{kegiatan.alasanTolak}</p>
        </div>
      )}

      {tampilMasukan && <BeriMasukan kegiatan={kegiatan} />}
    </DetailModal>
  );
}
