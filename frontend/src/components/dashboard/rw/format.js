export function formatRupiah(n) {
  if (n !== 0 && !n) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
}

export function formatSingkat(n) {
  if (n !== 0 && !n) return "-";
  const neg = n < 0;
  const a = Math.abs(n);
  let s;
  if (a >= 1_000_000) s = `${(a / 1_000_000).toFixed(1)}jt`;
  else if (a >= 1_000) s = `${Math.round(a / 1_000)}rb`;
  else s = `${a}`;
  return `${neg ? "-" : ""}Rp ${s}`;
}
