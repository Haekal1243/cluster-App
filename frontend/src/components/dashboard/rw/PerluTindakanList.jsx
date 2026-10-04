"use client";

import { CircleAlert } from "lucide-react";
import { areaLabel } from "@/lib/session";
import { formatSingkat } from "./format";

function waktuRelatif(iso) {
  if (!iso) return "-";
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const menit = Math.floor(diff / 60000);
  if (menit < 1) return "baru saja";
  if (menit < 60) return `${menit} mnt lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Daftar hal yang perlu ditindaklanjuti bendahara RW. */
export default function PerluTindakanList({ data, onTinjau }) {
  const menunggu = data?.menunggu ?? [];
  const ditolak = data?.ditolak ?? [];
  const rtKosong = data?.rtKosong ?? [];
  const total = data?.total ?? 0;

  return (
    <section className="content-card rw-panel rw-tindak" aria-label="Perlu tindakan">
      <div className="rw-panel-head">
        <h3>
          Perlu tindakan{" "}
          {total > 0 && <span className="rw-count-badge">{total}</span>}
        </h3>
      </div>
      {total === 0 ? (
        <p className="rw-empty">Tidak ada yang perlu ditindaklanjuti.</p>
      ) : (
        <ul className="rw-tindak-list">
          {menunggu.map((s) => (
            <li key={`tunggu-${s.id}`} className="rw-tindak-item is-menunggu">
              <span className="rw-tindak-dot" aria-hidden="true" />
              <div className="rw-tindak-body">
                <b>
                  {areaLabel(s.rt)} · {formatSingkat(s.nominal)}
                </b>
                <span>
                  {s.penyetor || "-"} · {s.jumlahTagihan} tagihan · {waktuRelatif(s.waktuKirim)}
                </span>
                <button
                  type="button"
                  className="btn-ipl-review"
                  onClick={() => onTinjau(s.id)}
                >
                  Tinjau &amp; konfirmasi
                </button>
              </div>
            </li>
          ))}
          {ditolak.map((s) => (
            <li key={`tolak-${s.id}`} className="rw-tindak-item is-ditolak">
              <span className="rw-tindak-dot" aria-hidden="true" />
              <div className="rw-tindak-body">
                <b>
                  {areaLabel(s.rt)} · <span className="rw-mini-status is-ditolak">Ditolak</span>
                </b>
                <span>
                  {waktuRelatif(s.tanggalDitolak)}
                  {s.alasan ? ` · ${s.alasan}` : ""}
                </span>
              </div>
            </li>
          ))}
          {rtKosong.map((r) => (
            <li key={`rt-${r.rt}`} className="rw-tindak-item is-info">
              <CircleAlert size={14} aria-hidden="true" />
              <div className="rw-tindak-body">
                <b>{areaLabel(r.rt)}</b>
                <span>
                  {r.alasan === "belum-buat"
                    ? "Belum membuat tagihan periode ini"
                    : "Belum ada IPL terkumpul periode ini"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
