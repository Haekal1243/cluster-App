"use client";

import PublikasiManager from "@/components/publikasi/PublikasiManager";
import PengumumanFormModal from "@/components/pengumuman/PengumumanFormModal";
import PengumumanDetailModal from "@/components/pengumuman/PengumumanDetailModal";
import { pengumumanApi } from "@/lib/api";

const SEARCH_FIELDS = ["judul", "keteranganPengumuman"];

export default function PengumumanPage() {
  return (
    <PublikasiManager
      menu="pengumuman"
      title="Pengumuman"
      subtitle="Pengumuman RT tampil untuk warga RT nya. Ajukan ke RW agar tampil ke seluruh warga."
      noun="Pengumuman"
      searchPlaceholder="Cari judul atau keterangan..."
      api={pengumumanApi}
      FormModal={PengumumanFormModal}
      DetailModal={PengumumanDetailModal}
      dateField="createDate"
      dateLabel="Tanggal Pengumuman"
      searchFields={SEARCH_FIELDS}
    />
  );
}
