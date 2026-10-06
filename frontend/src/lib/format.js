/** Format rupiah lengkap: "Rp 12.450.000". */
export function formatRupiah(n) {
  if (n !== 0 && !n) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
}

/**
 * Format rupiah ringkas untuk sub-teks: "Rp 750rb", "Rp 1,2jt", "Rp 0".
 * Desimal memakai koma Indonesia (12 → "1,2jt", bukan "1.2jt").
 */
export function formatRupiahShort(n) {
  if (n !== 0 && !n) return "-";
  const neg = n < 0;
  const a = Math.abs(n);
  let s;
  if (a >= 1_000_000) {
    const v = a / 1_000_000;
    s = `${Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/0$/, "").replace(".", ",")}jt`;
  } else if (a >= 1_000) {
    s = `${Math.round(a / 1_000)}rb`;
  } else {
    s = `${a}`;
  }
  return `${neg ? "-" : ""}Rp ${s}`;
}

/** Alias: sebagian halaman mengimpor nama `formatRupiahSingkat`. */
export const formatRupiahSingkat = formatRupiahShort;

/** Nama bulan pendek Indonesia: "Jan".."Des". Dipakai semua label bulan. */
export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

/** Peta "01".."12" -> nama pendek. Key string karena `bulanPeriode` = "10". */
export const BULAN_PENDEK = Object.fromEntries(
  MONTHS.map((label, i) => [String(i + 1).padStart(2, "0"), label]),
);

/**
 * Tetap diekspor agar import lama lolos build, tapi isinya = pendek
 * (keputusan: semua label bulan pakai pendek).
 */
export const BULAN_PANJANG = { ...BULAN_PENDEK };

/** Opsi dropdown filter: [{ val: "01", label: "Jan" }, ...]. */
export const BULAN_OPTIONS = MONTHS.map((label, i) => ({
  val: String(i + 1).padStart(2, "0"),
  label,
}));

/** Periode berjalan: "YYYY-MM", mis. "2026-10". */
export function getCurrentYm() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}

function ymToLabel(ym) {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return ym || "-";
  const [y, m] = ym.split("-");
  return `${MONTHS[parseInt(m, 10) - 1] || m} ${y}`;
}

/** "2026-10" -> "Okt 2026". */
export function formatYmPendek(ym) {
  return ymToLabel(ym);
}

/** Disamakan ke pendek (keputusan: semua label bulan pakai pendek). */
export function formatYmPanjang(ym) {
  return ymToLabel(ym);
}

/** ("10", "2026") -> "Okt 2026". Menerima "10"/10/"2026-10". */
export function getMonthLabel(bulan, tahun) {
  if (tahun === undefined && typeof bulan === "string" && /^\d{4}-\d{2}$/.test(bulan)) {
    return ymToLabel(bulan);
  }
  const num = parseInt(bulan, 10);
  if (!Number.isFinite(num) || num < 1 || num > 12) {
    return [bulan, tahun].filter((v) => v !== undefined && v !== "").join(" ") || "-";
  }
  return tahun ? `${MONTHS[num - 1]} ${tahun}` : MONTHS[num - 1];
}

/** Format tanggal pendek: "05 Okt 2026". Invalid/kosong -> "". */
export function formatTanggalPendek(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

/** Disamakan ke pendek (keputusan: semua tanggal pakai pendek). */
export function formatTanggalPanjang(value) {
  return formatTanggalPendek(value);
}

/** Disamakan ke pendek (keputusan: semua tanggal pakai pendek). */
export function formatTanggalLengkap(value) {
  return formatTanggalPendek(value);
}

/**
 * Link WhatsApp: "0812..." -> "https://wa.me/62812...".
 * Kosong/invalid -> "" (string kosong).
 */
export function waLink(noTelp) {
  const digits = String(noTelp ?? "").replace(/\D/g, "");
  if (!digits) return "";
  const normalized = digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
  return `https://wa.me/${normalized}`;
}
