"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowDown,
  ArrowUp,
  Clock,
  FileX,
  Landmark,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { areaLabel } from "@/lib/session";
import { formatRupiah, formatSingkat } from "./format";

/** 1. Setoran IPL diterima + progress vs IPL tertagih. */
export function KpiDiterima({ data }) {
  const { nominal, persen, iplTertagih, rtSudahSetor, totalRt } = data;
  return (
    <div className="ipl-summary-card keu-card keu-green">
      <div className="keu-icon-circle">
        <Landmark size={22} strokeWidth={2} />
      </div>
      <div className="keu-card-text">
        <span className="ipl-summary-label">Setoran IPL diterima</span>
        <span className="ipl-summary-value">{formatRupiah(nominal)}</span>
        {persen === null ? (
          <span className="ipl-summary-sub">Belum ada tagihan periode ini</span>
        ) : (
          <>
            <span className="rw-progress" aria-hidden="true">
              <span className="rw-progress-fill" style={{ width: `${persen}%` }} />
            </span>
            <span className="ipl-summary-sub">
              <b className="rw-persen">{persen}%</b> dari IPL tertagih {formatRupiah(iplTertagih)}
            </span>
            <span className="ipl-summary-sub">
              {rtSudahSetor} dari {totalRt} RT sudah setor
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/** 2. Menunggu konfirmasi — amber bila ada antrean. */
export function KpiMenunggu({ data, rtNames }) {
  const { nominal, count, rtCount } = data;
  const sub =
    count === 0
      ? "Tidak ada antrean"
      : rtCount === 1
        ? `${count} setoran · ${rtNames[0] || ""}`
        : `${count} setoran · ${rtCount} RT`;
  return (
    <Link
      href="/dashboard/kelola-ipl/setoran"
      className={`ipl-summary-card keu-card ${count > 0 ? "keu-amber" : "keu-muted"}`}
    >
      <div className="keu-icon-circle">
        <Clock size={22} strokeWidth={2} />
      </div>
      <div className="keu-card-text">
        <span className="ipl-summary-label">Menunggu konfirmasi</span>
        <span className="ipl-summary-value">{formatRupiah(nominal)}</span>
        <span className="ipl-summary-sub">{sub}</span>
      </div>
    </Link>
  );
}

/** 3. Belum disetor RT — palet merah reuse card Belum Lunas. */
export function KpiBelumDisetor({ data }) {
  const { total, rtCount, items, sisa } = data;
  return (
    <div className="ipl-summary-card keu-card keu-red">
      <div className="keu-icon-circle">
        <FileX size={22} strokeWidth={2} />
      </div>
      <div className="keu-card-text">
        <span className="ipl-summary-label">Belum disetor RT</span>
        <span className="ipl-summary-value">{formatRupiah(total)}</span>
        {total === 0 ? (
          <span className="ipl-summary-sub">Semua IPL sudah sampai ke RW</span>
        ) : (
          <>
            <span className="ipl-summary-sub">Masih dipegang {rtCount} RT</span>
            <ul className="rw-mini-list">
              {items.map((r) => (
                <li key={r.rt}>
                  <span className="rt-badge">{areaLabel(r.rt)}</span>
                  <span className={`ipl-badge ${r.status === "Ditolak" ? "badge-belum" : "badge-menunggu"}`}>
                    {r.status}
                  </span>
                  <span className="rw-mini-nominal">{formatSingkat(r.nominal)}</span>
                </li>
              ))}
              {sisa > 0 && <li className="rw-mini-more">+{sisa} RT lainnya</li>}
            </ul>
            <Link href="/dashboard/kelola-ipl/setoran" className="rw-mini-link">
              Lihat di Setoran IPL <ArrowRight size={13} />
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

/** 4. Saldo kas RW — header/badge/divider/grid 2 kolom/footer. */
export function KpiKasRw({ data }) {
  const { saldo, masuk, masukCount, keluar, keluarCount, net } = data;
  const naik = net > 0;
  const turun = net < 0;
  return (
    <div className="ipl-summary-card keu-card keu-teal rw-kas-card">
      <div className="rw-kas-head">
        <div className="keu-icon-circle">
          <Landmark size={22} strokeWidth={2} />
        </div>
        <div className="keu-card-text">
          <span className="ipl-summary-label">Saldo kas RW</span>
          <span className="ipl-summary-value">{formatRupiah(saldo)}</span>
        </div>
        {naik ? (
          <span className="rw-net-badge is-naik">
            <TrendingUp size={12} />+{formatSingkat(net)}
          </span>
        ) : turun ? (
          <span className="rw-net-badge is-turun">
            <TrendingDown size={12} />−{formatSingkat(net).replace(/^-/, "")}
          </span>
        ) : (
          <span className="rw-net-badge is-nol">Rp 0</span>
        )}
      </div>
      <hr className="rw-divider" />
      <div className="rw-kas-flow">
        <span className="rw-flow-col">
          <span className="rw-flow-label">
            <ArrowUp size={14} color="#15803d" /> Masuk
          </span>
          <b className="rw-flow-nominal">{formatRupiah(masuk)}</b>
          <i>{masukCount > 0 ? `${masukCount} transaksi` : "Belum ada transaksi"}</i>
        </span>
        <span className="rw-flow-col">
          <span className="rw-flow-label">
            <ArrowDown size={14} color="#b91c1c" /> Keluar
          </span>
          <b className="rw-flow-nominal">{formatRupiah(keluar)}</b>
          <i>{keluarCount > 0 ? `${keluarCount} transaksi` : "Belum ada transaksi"}</i>
        </span>
      </div>
      <Link href="/dashboard/keuangan" className="rw-mini-link rw-kas-link">
        Lihat di Keuangan <ArrowRight size={13} />
      </Link>
    </div>
  );
}
