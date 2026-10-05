"use client";

import { Check, TriangleAlert } from "lucide-react";
import { SD_BULAN, formatRupiah } from "@/lib/useSetoranDetail";

function periodeLabel(t) {
  return `${SD_BULAN[Number(t.bulanPeriode) - 1] || t.bulanPeriode} ${t.tahunPeriode}`;
}

function TotalFooter({ derived }) {
  return (
    <div className="sd-total">
      <span className="sd-total-label">Total {derived.count} tagihan</span>
      <span className="sd-total-nominal">{formatRupiah(derived.totalSetoran)}</span>
      {derived.cocok ? (
        <span className="sd-cocok">
          <Check size={14} /> Sesuai total setoran
        </span>
      ) : (
        <span className="sd-selisih" role="alert">
          <TriangleAlert size={14} /> Selisih {formatRupiah(Math.abs(derived.selisih))}
        </span>
      )}
    </div>
  );
}

function TagihanTable({ rows }) {
  return (
    <table className="sd-table">
      <thead>
        <tr>
          <th>Unit</th>
          <th>Nama Warga</th>
          <th>Periode</th>
          <th className="sd-col-nominal">Nominal</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((t) => (
          <tr key={t.id}>
            <td className="sd-unit">{t.rumah?.blokRumah || "-"}</td>
            <td className="sd-nama">{t.rumah?.penghuni?.namaUser || "-"}</td>
            <td>{periodeLabel(t)}</td>
            <td className="sd-col-nominal">{formatRupiah(t.nominalIpl)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TagihanCards({ rows }) {
  return (
    <ul className="sd-cards">
      {rows.map((t) => (
        <li key={t.id} className="sd-card">
          <span className="sd-card-unit">{t.rumah?.blokRumah || "-"}</span>
          <span className="sd-card-mid">
            <span className="sd-card-nama">{t.rumah?.penghuni?.namaUser || "-"}</span>
            <span className="sd-card-periode">{periodeLabel(t)}</span>
          </span>
          <span className="sd-card-nominal">{formatRupiah(t.nominalIpl)}</span>
        </li>
      ))}
    </ul>
  );
}

function periodeLabelMenunggu(p) {
  const ipl = p?.ipl;
  if (!ipl?.bulanPeriode || !ipl?.tahunPeriode) return "-";
  return `${SD_BULAN[Number(ipl.bulanPeriode) - 1] || ipl.bulanPeriode} ${ipl.tahunPeriode}`;
}

/** Blok konteks collapsed (info tambahan, bukan konten utama). */
export function SetoranKonteks({ konteks }) {
  if (!konteks) return null;
  const kosong = konteks.kosongDikecualikan ?? [];
  const menunggu = konteks.menunggu ?? [];
  const belumBayar = konteks.belumBayar ?? [];
  if (kosong.length === 0 && menunggu.length === 0 && belumBayar.length === 0) return null;
  return (
    <details className="sd-konteks">
      <summary>Tidak ikut setoran ini</summary>
      <div className="sd-konteks-body">
        {kosong.length > 0 && (
          <>
            <p className="sd-konteks-label">Rumah kosong — masuk kas RT ({kosong.length})</p>
            <ul className="sd-konteks-list">
              {kosong.map((t) => (
                <li key={t.id}>
                  {t.rumah?.blokRumah} · {periodeLabel(t)} · {formatRupiah((t.nominalIpl || 0) + (t.nominalKas || 0))}{" "}
                  {t.statusPembayaran === "MENUNGGU_KONFIRMASI" ? (
                    <span className="sd-status sd-status-wait" style={{ marginLeft: 6 }}>
                      Menunggu konfirmasi
                    </span>
                  ) : t.statusPembayaran === "BELUM_LUNAS" ? (
                    <span className="sd-status sd-status-no" style={{ marginLeft: 6 }}>
                      Belum bayar
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        )}
        {menunggu.length > 0 && (
          <>
            <p className="sd-konteks-label">Menunggu konfirmasi RT ({menunggu.length})</p>
            <ul className="sd-konteks-list">
              {menunggu.map((p) => (
                <li key={p.idPembayaran}>
                  {p.ipl?.rumah?.blokRumah} · {p.user?.namaUser || "—"} · {periodeLabelMenunggu(p)} ·{" "}
                  {formatRupiah(p.nominal)}{" "}
                  <span className="sd-status sd-status-wait" style={{ marginLeft: 6 }}>
                    Menunggu konfirmasi RT
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
        {belumBayar.length > 0 && (
          <>
            <p className="sd-konteks-label">Belum bayar ({belumBayar.length})</p>
            <ul className="sd-konteks-list">
              {belumBayar.map((t) => (
                <li key={t.id}>
                  {t.rumah?.blokRumah} · {t.rumah?.penghuni?.namaUser || "—"} · {periodeLabel(t)} ·{" "}
                  {formatRupiah((t.nominalIpl || 0) + (t.nominalKas || 0))}{" "}
                  <span className="sd-status sd-status-no" style={{ marginLeft: 6 }}>
                    Belum bayar
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </details>
  );
}

export default function SetoranTagihanSection({ derived, isMobile }) {
  return (
    <section aria-label="Rincian Tagihan">
      <div className="sd-section-head">
        <h4>Rincian Tagihan</h4>
        <span className="sd-section-sub">
          {derived.count} tagihan · {derived.unitCount} unit
        </span>
      </div>
      {isMobile ? <TagihanCards rows={derived.rows} /> : <TagihanTable rows={derived.rows} />}
      <TotalFooter derived={derived} />
    </section>
  );
}
