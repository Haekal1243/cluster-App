"use client";

import { formatJam, formatRupiah, formatTanggal } from "@/lib/useSetoranDetail";

export default function SetoranSummary({ data, derived, isMobile }) {
  if (isMobile) {
    return (
      <div className="sd-summary-m">
        <span className="sd-summary-label">Total Setoran</span>
        <span className="sd-summary-total-m">{formatRupiah(derived.totalSetoran)}</span>
        <div className="sd-summary-cols">
          <span>
            <em>Tagihan</em>
            <b>{derived.count}</b>
          </span>
          <span>
            <em>Periode</em>
            <b>{derived.rangeLabel}</b>
          </span>
          <span>
            <em>Disetor</em>
            <b>{formatTanggal(data.createDate)}</b>
          </span>
        </div>
        <span className="sd-summary-by">
          oleh {data.createBy || "-"} · {formatJam(data.createDate)}
        </span>
      </div>
    );
  }
  return (
    <div className="sd-summary">
      <span className="sd-summary-label">Total IPL</span>
      <span className="sd-summary-total">{formatRupiah(derived.totalSetoran)}</span>
      <dl className="sd-summary-rows">
        <div>
          <dt>Jumlah tagihan</dt>
          <dd>{derived.count} tagihan</dd>
        </div>
        <div>
          <dt>Periode</dt>
          <dd>{derived.rangeLabel}</dd>
        </div>
      </dl>
    </div>
  );
}
