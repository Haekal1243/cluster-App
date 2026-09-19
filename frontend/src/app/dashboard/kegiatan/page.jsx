"use client";

import PublikasiManager from "@/components/publikasi/PublikasiManager";
import KegiatanFormModal from "@/components/kegiatan/KegiatanFormModal";
import { kegiatanApi } from "@/lib/api";

const SEARCH_FIELDS = ["judul", "deskripsi"];

export default function KegiatanPage() {
  return (
    <PublikasiManager
      menu="kegiatan"
      title="Kegiatan"
      subtitle="Kegiatan RT tampil untuk warga RT-nya. Ajukan ke RW agar tampil ke seluruh warga."
      noun="Kegiatan"
      addLabel="Tambah Kegiatan"
      searchPlaceholder="Cari judul atau deskripsi..."
      api={kegiatanApi}
      FormModal={KegiatanFormModal}
      dateField="tanggalAcara"
      dateLabel="Acara"
      searchFields={SEARCH_FIELDS}
    />
  );
}
