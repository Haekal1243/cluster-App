"use client";

import { useEffect, useState } from "react";
import { iplApi } from "@/lib/api";
import { areaLabel } from "@/lib/session";
import { formatRupiah, formatYmPanjang } from "@/lib/format";

// ── Rekap per RT (tampilan RW): tracking per RT, ikut filter aktif (periode/status/RT, tanpa search) ──
export function RekapRtPanel({ dari, sampai, status, rt, refreshKey }) {
  const [rekap, setRekap] = useState(null);

  useEffect(() => {
    let cancelled = false;
    iplApi
      .getRekapRt({ dari, sampai, status, rt })
      .then((r) => { if (!cancelled) setRekap(r); })
      .catch(() => { if (!cancelled) setRekap(null); });
    return () => { cancelled = true; };
  }, [dari, sampai, status, rt, refreshKey]);

  if (!rekap) return null;

  const formatPeriode = formatYmPanjang;
  const periodeLabel = dari === sampai ? formatPeriode(dari) : `${formatPeriode(dari)} - ${formatPeriode(sampai)}`;

  return (
    <div className="content-card" style={{ padding: 0, overflow: "hidden" }}>
      <div className="ipl-table-header">
        <span className="ipl-table-title">Rekap per RT ({periodeLabel})</span>
        <span className="ipl-table-count">IPL disetor RT ke RW; kas tetap di RT</span>
      </div>
      <div className="ipl-table-wrapper">
        <table className="ipl-table">
          <thead>
            <tr>
              <th>No</th>
              <th>RT</th>
              <th>Lunas / Tagihan</th>
              <th>Menunggu</th>
              <th>IPL Terkumpul</th>
              <th>Kas RT</th>
              <th>Rumah Kosong</th>
              <th>Sudah Disetor</th>
              <th>Belum Disetor</th>
            </tr>
          </thead>
          <tbody>
            {rekap.perRt.map((r, index) => (
              <tr key={r.rt}>
                <td>{index + 1}</td>
                <td><span className="rt-badge">{areaLabel(r.rt)}</span></td>
                <td>{r.lunas} / {r.totalTagihan}</td>
                <td>
                  {r.menungguKonfirmasi > 0
                    ? <span className="ipl-badge badge-menunggu">{r.menungguKonfirmasi}</span>
                    : <span className="text-muted">0</span>}
                </td>
                <td className="ipl-nominal">{formatRupiah(r.terkumpulIpl)}</td>
                <td>{formatRupiah(r.terkumpulKas)}</td>
                <td>
                  {r.terkumpulRumahKosong?.jumlahTagihan > 0
                    ? `${r.terkumpulRumahKosong.jumlahTagihan} tagihan`
                    : <span className="text-muted">—</span>}
                </td>
                <td>{formatRupiah(r.sudahDisetor)}</td>
                <td>
                  <span className={r.belumDisetor > 0 ? "ipl-badge badge-menunggu" : ""}>
                    {formatRupiah(r.belumDisetor)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
