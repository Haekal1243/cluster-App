"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { areaLabel } from "@/lib/session";
import { formatSingkat } from "./format";

/** Log setoran terbaru (maks 5), derive dari tabel setoran. */
export default function AktivitasSetoranList({ items }) {
  const rows = (items ?? []).slice(0, 5);
  return (
    <section className="content-card rw-panel rw-aktivitas" aria-label="Aktivitas setoran">
      <div className="rw-panel-head">
        <h3>Aktivitas setoran</h3>
        <Link href="/dashboard/kelola-ipl/setoran" className="rw-mini-link">
          Lihat semua <ArrowRight size={13} />
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="rw-empty">Belum ada aktivitas setoran periode ini.</p>
      ) : (
        <ul className="rw-aktivitas-list">
          {rows.map((a) => {
            const dot =
              a.status === "DIKONFIRMASI"
                ? "is-ok"
                : a.status === "DITOLAK"
                  ? "is-no"
                  : "is-wait";
            const ket =
              a.status === "DIKONFIRMASI"
                ? "masuk kas RW"
                : a.status === "DITOLAK"
                  ? `oleh ${a.oleh || "-"}`
                  : "dikirim";
            return (
              <li key={a.id}>
                <span className={`rw-tindak-dot ${dot}`} aria-hidden="true" />
                <span className="rw-akt-rt">{areaLabel(a.rt)}</span>
                <span className="rw-akt-ket">{ket}</span>
                <span className="rw-akt-waktu">
                  {a.waktu
                    ? new Date(a.waktu).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                      })
                    : "-"}
                </span>
                <span className="rw-akt-nominal">{formatSingkat(a.nominal)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
