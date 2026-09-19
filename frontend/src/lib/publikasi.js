import { scopeOf } from "./session";

// Alur kegiatan/pengumuman: dibuat untuk RT-nya sendiri; sekre RT dapat mengajukan agar
// tampil ke seluruh RW, lalu ketua/sekre RW menyetujui atau menolak.
export const PENGAJUAN = {
  TIDAK: { label: "Hanya RT ini", cls: "muted" },
  DIAJUKAN: { label: "Menunggu ACC RW", cls: "menunggu" },
  DISETUJUI: { label: "Tampil ke semua warga", cls: "lunas" },
  DITOLAK: { label: "Ditolak RW", cls: "belum" },
};

/** Boleh mengubah/menghapus item ini? Scope ALL = semua; AREA = hanya item wilayahnya. */
export function bolehTulis(user, kode, item) {
  const scope = scopeOf(user, kode);
  if (scope === "ALL") return true;
  if (scope === "AREA") return !!user?.area && item.area === user.area;
  return false;
}

/** Konten level RW sudah tampil ke semua; hanya konten RT yang belum/ditolak yang bisa diajukan. */
export function bolehAjukan(user, menu, item) {
  return (
    bolehTulis(user, `${menu}.ajukan`, item) &&
    item.area !== "RW" &&
    (item.statusPengajuan === "TIDAK" || item.statusPengajuan === "DITOLAK")
  );
}

export function bolehPutuskan(user, menu, item) {
  return scopeOf(user, `${menu}.approve`) !== null && item.statusPengajuan === "DIAJUKAN";
}

export function formatTanggalPendek(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}
