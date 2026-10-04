"use client";

import { formatRupiah, formatSingkat } from "./format";

/** Bar chart 6 periode: setoran IPL diterima per periode tagihan. */
export default function TrenSetoranChart({ tren }) {
  if (!tren || tren.length === 0) return null;
  const max = Math.max(...tren.map((t) => t.diterima), 1);
  return (
    <section className="content-card rw-panel" aria-label="Tren setoran IPL ke RW">
      <div className="rw-panel-head">
        <h3>Tren setoran IPL ke RW</h3>
      </div>
      <p
        className="rw-chart-hint"
        title="Dikelompokkan per periode tagihan. Untuk arus kas per tanggal transaksi, lihat menu Keuangan."
      >
        Per periode tagihan · lihat Keuangan untuk per tanggal transaksi
      </p>
      <div className="rw-tren-bars">
        {tren.map((t) => {
          const barPct = Math.max((t.diterima / max) * 100, 4);
          return (
            <div
              key={t.ym}
              className="rw-tren-col"
              title={`${t.label}: ${formatRupiah(t.diterima)}`}
            >
              <div className="rw-tren-track">
                <span
                  className={`rw-tren-bar ${t.berjalan ? "is-berjalan" : ""}`}
                  style={{ height: `${barPct}%` }}
                />
              </div>
              <span className="rw-tren-label">
                {t.label}
                {t.berjalan ? " · berjalan" : ""}
              </span>
              <span className="rw-tren-nominal">{formatSingkat(t.diterima)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
