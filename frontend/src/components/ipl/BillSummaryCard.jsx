"use client";

import { Calendar, CircleCheck, Clock, Home, Info, Wallet } from "lucide-react";
import { formatRupiah as rupiahPenuh } from "@/lib/format";

// Kelas Tailwind ditulis statis (object map) agar tidak kena purge.
const TONE = {
  lunas: {
    tile: "bg-gradient-to-br from-emerald-500 to-teal-600",
    amount: "text-emerald-600",
    bar: "bg-emerald-500",
    blob: "bg-emerald-200",
    hint: "Semua tagihan sudah lunas",
  },
  tunggakan: {
    tile: "bg-gradient-to-br from-violet-500 to-purple-600",
    amount: "text-slate-900",
    bar: "bg-amber-500",
    blob: "bg-amber-200",
    hint: "Ada tagihan yang perlu dibayar",
  },
};

/**
 * Card ringkasan tagihan warga. Murni presentational: kalkulasi outstanding
 * tetap milik pemanggil (useMemo ringkasan di halaman).
 */
export function BillSummaryCard({
  unitLabel,
  periodLabel,
  outstanding,
  paidCount,
  unpaidCount,
  loading = false,
}) {
  const paid = Number(paidCount) || 0;
  const unpaid = Number(unpaidCount) || 0;
  const total = paid + unpaid;
  const isLunas = total > 0 && unpaid === 0;
  const tone = TONE[isLunas ? "lunas" : "tunggakan"];
  const percent = total > 0 ? Math.round((paid / total) * 100) : 0;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white p-5 sm:p-7">
      {/* Blob dekoratif */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-40 blur-3xl ${tone.blob}`}
      />

      <div className="relative">
        {/* Chip row */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
            <Home size={13} />
            {unitLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
            <Calendar size={13} />
            {periodLabel}
          </span>
        </div>

        {/* Main row */}
        <div className="mt-4 flex items-center gap-4">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white ${tone.tile}`}
          >
            <Wallet size={26} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-slate-500">Total tagihan belum lunas</p>
            {loading ? (
              <div className="mt-2 h-9 w-44 animate-pulse rounded-lg bg-slate-100" />
            ) : (
              <p
                className={`truncate text-3xl font-bold tracking-tight sm:text-4xl ${tone.amount}`}
              >
                {rupiahPenuh(outstanding)}
              </p>
            )}
          </div>
        </div>

        {/* Progress section */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              {paid} dari {total} tagihan lunas
            </span>
            <span>{percent}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all ${tone.bar}`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              <CircleCheck size={13} />
              {paid} lunas
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
              <Clock size={13} />
              {unpaid} belum lunas
            </span>
            <span className="ml-auto hidden items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500 sm:inline-flex">
              <Info size={13} />
              {tone.hint}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
