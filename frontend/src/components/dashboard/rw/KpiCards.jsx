"use client";

import { Clock, FileX, Landmark, Wallet } from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import { formatRupiah } from "@/lib/format";

/** 1. Setoran IPL diterima + strip progress vs IPL tertagih. */
export function KpiDiterima({ data = {} }) {
  const { nominal = 0, persen = null } = data;
  return (
    <StatCard
      tone="green"
      icon={<Landmark size={22} strokeWidth={2} />}
      label="Setoran IPL diterima"
      value={formatRupiah(nominal)}
      href="/dashboard/kelola-ipl/setoran"
      progress={persen}
    />
  );
}

/** 2. Menunggu konfirmasi — amber bila ada antrean, abu bila kosong. */
export function KpiMenunggu({ data = {} }) {
  const { nominal = 0, count = 0 } = data;
  return (
    <StatCard
      tone={count > 0 ? "amber" : "muted"}
      icon={<Clock size={22} strokeWidth={2} />}
      label="Menunggu konfirmasi"
      value={formatRupiah(nominal)}
      href="/dashboard/kelola-ipl/setoran?status=MENUNGGU_KONFIRMASI"
    />
  );
}

/** 3. Belum disetor RT — ikon FileX sama seperti card "Belum Lunas". */
export function KpiBelumDisetor({ data = {} }) {
  const { total = 0 } = data;
  return (
    <StatCard
      tone="red"
      icon={<FileX size={22} strokeWidth={2} />}
      label="Belum disetor RT"
      value={formatRupiah(total)}
      href="/dashboard/kelola-ipl/tagihan"
    />
  );
}

/** 4. Saldo kas RW = setoran IPL DIKONFIRMASI + manual RW (tanpa kas RT). */
export function KpiKasRw({ data = {} }) {
  const { saldo = 0 } = data;
  return (
    <StatCard
      tone="teal"
      icon={<Wallet size={22} strokeWidth={2} />}
      label="Saldo kas RW"
      value={formatRupiah(saldo)}
      href="/dashboard/keuangan?area=RW"
    />
  );
}
