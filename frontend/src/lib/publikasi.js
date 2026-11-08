import { scopeOf } from "./session";

export const PENGAJUAN = {
  TIDAK: { label: "Hanya RT ini", cls: "muted" },
  DIAJUKAN: { label: "Menunggu ACC RW", cls: "menunggu" },
  DISETUJUI: { label: "Semua warga", cls: "lunas" },
  DITOLAK: { label: "Ditolak RW", cls: "belum" },
};

export function bolehTulis(user, kode, item) {
  const scope = scopeOf(user, kode);
  const hanyaRt = item.area !== "RW" && (item.statusPengajuan === "TIDAK" || item.statusPengajuan === "DITOLAK");
  if (hanyaRt && user?.area && user.area !== item.area) return false;
  if (scope === "ALL") return true;
  if (scope === "AREA") return !!user?.area && item.area === user.area;
  return false;
}

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
