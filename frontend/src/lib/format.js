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
