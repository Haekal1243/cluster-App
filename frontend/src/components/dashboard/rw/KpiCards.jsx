"use client";

import { ArrowDown, ArrowUp, Clock, FileX, Landmark, Wallet } from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import { formatRupiah, formatRupiahShort } from "@/lib/format";

/** 1. Setoran IPL diterima + strip progress vs IPL tertagih. */
export function KpiDiterima({ data = {} }) {
  const { nominal = 0, persen = null, iplTertagih = 0, rtSudahSetor = 0, totalRt = 0 } = data;
  const subTitle =
    persen === null
      ? "Belum ada tagihan periode ini"
      : `${persen}% dari ${formatRupiah(iplTertagih)} — ${rtSudahSetor} dari ${totalRt} RT sudah setor`;
  return (
    <StatCard
      tone="green"
      icon={<Landmark size={22} strokeWidth={2} />}
      label="Setoran IPL diterima"
      value={formatRupiah(nominal)}
      sub={
        persen === null ? (
          "Belum ada tagihan periode ini"
        ) : (
          <>
            <span className="sub-row">
              <b className="rw-persen">{persen}%</b> dari{" "}
              <span className="amt-full">{formatRupiah(iplTertagih)}</span>
              <span className="amt-short">{formatRupiahShort(iplTertagih)}</span>
            </span>
            <span className="sub-row">
              {rtSudahSetor} dari {totalRt} RT sudah setor
            </span>
          </>
        )
      }
      subTitle={subTitle}
      href="/dashboard/kelola-ipl/setoran"
      progress={persen}
    />
  );
}

/** 2. Menunggu konfirmasi — amber bila ada antrean, abu bila kosong. */
export function KpiMenunggu({ data = {}, rtNames = [] }) {
  const { nominal = 0, count = 0, rtCount = 0 } = data;
  const sub =
    count === 0
      ? "Tidak ada antrean"
      : rtCount === 1
        ? `${count} setoran · ${rtNames[0] || ""}`
        : `${count} setoran · ${rtCount} RT`;
  return (
    <StatCard
      tone={count > 0 ? "amber" : "muted"}
      icon={<Clock size={22} strokeWidth={2} />}
      label="Menunggu konfirmasi"
      value={formatRupiah(nominal)}
      sub={sub}
      subTitle={sub}
      href="/dashboard/kelola-ipl/setoran?status=MENUNGGU_KONFIRMASI"
    />
  );
}

/** 3. Belum disetor RT — ikon FileX sama seperti card "Belum Lunas". */
export function KpiBelumDisetor({ data = {} }) {
  const { total = 0, rtCount = 0 } = data;
  const sub = total === 0 ? "Semua IPL sudah sampai ke RW" : `Masih dipegang ${rtCount} RT`;
  return (
    <StatCard
      tone="red"
      icon={<FileX size={22} strokeWidth={2} />}
      label="Belum disetor RT"
      value={formatRupiah(total)}
      sub={sub}
      subTitle={sub}
      href="/dashboard/kelola-ipl/tagihan"
    />
  );
}

/** 4. Saldo kas RW = setoran IPL DIKONFIRMASI + manual RW (tanpa kas RT). */
export function KpiKasRw({ data = {}, periodeLabel = "" }) {
  const { saldo = 0, masuk = 0, keluar = 0 } = data;
  const subTitle =
    `Masuk ${formatRupiah(masuk)} · Keluar ${formatRupiah(keluar)}` +
    (periodeLabel ? ` · periode ${periodeLabel}` : "");
  return (
    <StatCard
      tone="teal"
      icon={<Wallet size={22} strokeWidth={2} />}
      label="Saldo kas RW"
      value={formatRupiah(saldo)}
      sub={
        <div
          className="flex items-center gap-3 text-[13px] text-slate-600 whitespace-nowrap"
          title={subTitle}
        >
          <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
            <ArrowUp className="h-3.5 w-3.5 shrink-0 text-green-700" />
            {formatRupiahShort(masuk)}
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
            <ArrowDown className="h-3.5 w-3.5 shrink-0 text-red-700" />
            {formatRupiahShort(keluar)}
          </span>
        </div>
      }
      subTitle={subTitle}
      href="/dashboard/keuangan?area=RW"
    />
  );
}
