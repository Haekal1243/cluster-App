"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Calendar, Eye, EyeOff, MessageSquare, UserRound } from "lucide-react";
import { kegiatanApi } from "@/lib/api";
import { can, areaLabel } from "@/lib/session";
import { formatTanggalLengkap, formatTanggalPendek } from "@/lib/format";
import { showMessage } from "@/lib/message";
import { BintangTampil } from "./Bintang";

const URUTAN = [
  { value: "terbaru", label: "Terbaru" },
  { value: "tertinggi", label: "Rating tertinggi" },
  { value: "terendah", label: "Rating terendah" },
];

const namaTampil = (f) => f.nama || "Anonim";

/** Modal detail satu masukan; dipakai untuk tabel (desktop) dan kartu (HP). */
function DetailFeedback({ item, bolehModerasi, onClose, onToggle, sibuk }) {
  if (!item) return null;
  const diedit = item.updatedAt && new Date(item.updatedAt) - new Date(item.createdAt) > 60_000;
  return (
    <div className="ipl-modal-overlay fb-overlay" onClick={onClose}>
      <div className="ipl-modal ipl-modal-review fb-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ipl-modal-header">
          <h3>Detail Masukan</h3>
          <button className="ipl-modal-close" onClick={onClose} aria-label="Tutup">✕</button>
        </div>
        <div className="ipl-modal-body">
          <div className="fb-detail-siapa">
            <span className="fb-avatar" aria-hidden="true"><UserRound size={18} /></span>
            <div>
              <strong>{namaTampil(item)}</strong>
              {item.rumah && (
                <div className="fb-sub">
                  {item.rumah.blokRumah} · {areaLabel(item.rumah.rt)}
                </div>
              )}
              {item.anonim && <div className="fb-sub">Memilih untuk tidak menyebut nama</div>}
            </div>
          </div>

          <div className="fb-detail-rating">
            <BintangTampil nilai={item.rating} size={20} />
            <span>{item.rating} dari 5</span>
          </div>

          <div>
            <div className="fb-label">Komentar</div>
            {item.komentar ? (
              <p className="fb-komentar">{item.komentar}</p>
            ) : (
              <p className="fb-kosong">Tidak ada komentar, hanya bintang.</p>
            )}
          </div>

          <div className="fb-sub">
            Dikirim {formatTanggalLengkap(item.createdAt)}
            {diedit && <> · diubah {formatTanggalLengkap(item.updatedAt)}</>}
          </div>

          {item.disembunyikan && (
            <div className="fb-info-sembunyi">Masukan ini disembunyikan. Hanya pengurus yang bisa melihatnya.</div>
          )}

          {bolehModerasi && (
            <div className="ipl-modal-footer">
              <button
                type="button"
                className="btn-outline-neutral"
                disabled={sibuk}
                onClick={() => onToggle(item)}
              >
                {item.disembunyikan ? <Eye size={15} /> : <EyeOff size={15} />}
                {item.disembunyikan ? "Tampilkan kembali" : "Sembunyikan"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Ringkasan di atas tabel: rata-rata, jumlah penilai, sebaran bintang. */
function Ringkasan({ kegiatan, ringkasan, onKembali }) {
  const maks = Math.max(1, ...Object.values(ringkasan.sebaran));
  return (
    <div className="fb-ringkasan">
      <button type="button" className="btn-outline-neutral fb-kembali" onClick={onKembali}>
        <ArrowLeft size={15} /> Semua kegiatan
      </button>
      <div className="fb-ringkasan-isi">
        <div className="fb-ringkasan-judul">
          <h3>{kegiatan.judul}</h3>
          <span className="meta-item"><Calendar size={13} /> {formatTanggalLengkap(kegiatan.tanggalAcara)}</span>
        </div>
        <div className="fb-ringkasan-skor">
          <div className="fb-skor-angka">{ringkasan.rata ? ringkasan.rata.toFixed(1) : "–"}</div>
          <div>
            <BintangTampil nilai={ringkasan.rata} size={16} />
            <div className="fb-sub">{ringkasan.jumlah} penilai</div>
          </div>
        </div>
        <div className="fb-sebaran" aria-label="Sebaran bintang">
          {[5, 4, 3, 2, 1].map((n) => (
            <div key={n} className="fb-sebaran-baris">
              <span>{n}★</span>
              <div className="fb-sebaran-track">
                <div className="fb-sebaran-isi" style={{ width: `${(ringkasan.sebaran[n] / maks) * 100}%` }} />
              </div>
              <span className="fb-sebaran-jml">{ringkasan.sebaran[n]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function FeedbackTab({ user }) {
  const bolehModerasi = can(user, "kegiatan.feedback_moderasi");

  const [rekap, setRekap] = useState([]);
  const [loadingRekap, setLoadingRekap] = useState(true);
  const [terpilih, setTerpilih] = useState(null); // id kegiatan yang dibuka
  const [hasil, setHasil] = useState(null); // { kegiatan, ringkasan, data }
  const [loadingDaftar, setLoadingDaftar] = useState(false);
  const [urut, setUrut] = useState("terbaru");
  const [filterRating, setFilterRating] = useState(0);
  const [detail, setDetail] = useState(null);
  const [sibuk, setSibuk] = useState(false);

  const muatRekap = useCallback(async () => {
    try {
      setRekap(await kegiatanApi.feedbackRekap());
    } catch (e) {
      showMessage("Gagal Memuat Masukan", e.message, "error");
    } finally {
      setLoadingRekap(false);
    }
  }, []);

  const muatDaftar = useCallback(async (id) => {
    setLoadingDaftar(true);
    try {
      setHasil(await kegiatanApi.feedbackDaftar(id));
    } catch (e) {
      showMessage("Gagal Memuat Masukan", e.message, "error");
      setTerpilih(null);
    } finally {
      setLoadingDaftar(false);
    }
  }, []);

  useEffect(() => { muatRekap(); }, [muatRekap]);
  useEffect(() => {
    if (terpilih) muatDaftar(terpilih);
    else setHasil(null);
  }, [terpilih, muatDaftar]);

  const buka = (id) => {
    setUrut("terbaru");
    setFilterRating(0);
    setTerpilih(id);
  };
  const tutup = () => {
    setTerpilih(null);
    muatRekap();
  };

  const baris = useMemo(() => {
    if (!hasil) return [];
    const f = hasil.data.filter((x) => !filterRating || x.rating === filterRating);
    return [...f].sort((a, b) => {
      if (urut === "tertinggi") return b.rating - a.rating || new Date(b.createdAt) - new Date(a.createdAt);
      if (urut === "terendah") return a.rating - b.rating || new Date(b.createdAt) - new Date(a.createdAt);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [hasil, urut, filterRating]);

  const toggleSembunyi = async (item) => {
    setSibuk(true);
    try {
      await kegiatanApi.feedbackSembunyi(item.id, !item.disembunyikan);
      setDetail((d) => (d ? { ...d, disembunyikan: !item.disembunyikan } : d));
      await muatDaftar(terpilih);
    } catch (e) {
      showMessage("Gagal Menyimpan", e.message, "error");
    } finally {
      setSibuk(false);
    }
  };

  // ── Tampilan 1: kartu kegiatan yang punya masukan ──
  if (!terpilih) {
    if (loadingRekap) return <div className="table-card"><div className="table-loading">Memuat data...</div></div>;
    if (!rekap.length) {
      return (
        <div className="table-card">
          <div className="table-empty">Belum ada masukan dari warga untuk kegiatan apa pun.</div>
        </div>
      );
    }
    return (
      <div className="fb-kartu-grid">
        {rekap.map((k) => (
          <button key={k.id} type="button" className="fb-kartu" onClick={() => buka(k.id)}>
            <h3>{k.judul}</h3>
            <span className="meta-item"><Calendar size={12} /> {formatTanggalPendek(k.tanggalAcara)}</span>
            <div className="fb-kartu-skor">
              <span className="fb-skor-angka fb-skor-kecil">{k.rata.toFixed(1)}</span>
              <BintangTampil nilai={k.rata} size={14} />
            </div>
            <span className="fb-sub">
              <MessageSquare size={12} /> {k.jumlah} masukan · terakhir {formatTanggalPendek(k.terakhir)}
            </span>
          </button>
        ))}
      </div>
    );
  }

  // ── Tampilan 2: ringkasan + tabel satu kegiatan ──
  return (
    <div className="page-stack">
      {hasil ? (
        <Ringkasan kegiatan={hasil.kegiatan} ringkasan={hasil.ringkasan} onKembali={tutup} />
      ) : (
        <div className="table-card"><div className="table-loading">Memuat data...</div></div>
      )}

      {hasil && (
        <div className="table-card">
          <div className="ipl-table-header fb-tabel-header">
            <span className="ipl-table-title">Masukan warga</span>
            <div className="fb-tabel-kontrol">
              <select className="ipl-select ipl-select-sm" value={filterRating} onChange={(e) => setFilterRating(Number(e.target.value))} aria-label="Filter bintang">
                <option value={0}>Semua bintang</option>
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} bintang</option>)}
              </select>
              <select className="ipl-select ipl-select-sm" value={urut} onChange={(e) => setUrut(e.target.value)} aria-label="Urutkan">
                {URUTAN.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Desktop: tabel */}
          <div className="table-wrapper fb-tabel-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Siapa</th>
                  <th>Rating</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {baris.map((f) => (
                  <tr key={f.id} className={f.disembunyikan ? "fb-baris-sembunyi" : undefined}>
                    <td>
                      <span className={f.nama ? "" : "fb-anonim"}>{namaTampil(f)}</span>
                      {f.komentar && <MessageSquare size={12} className="fb-ada-komentar" aria-label="Ada komentar" />}
                      {f.disembunyikan && <span className="ipl-badge fb-badge-sembunyi">Disembunyikan</span>}
                    </td>
                    <td><BintangTampil nilai={f.rating} /></td>
                    <td>
                      <button type="button" className="btn-outline-neutral" onClick={() => setDetail(f)}>
                        <Eye size={15} /> Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* HP: kartu 2 per baris */}
          <div className="fb-mini-grid">
            {baris.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`fb-mini${f.disembunyikan ? " fb-baris-sembunyi" : ""}`}
                onClick={() => setDetail(f)}
              >
                <span className={`fb-mini-nama${f.nama ? "" : " fb-anonim"}`}>{namaTampil(f)}</span>
                <BintangTampil nilai={f.rating} size={13} />
                {f.disembunyikan && <span className="fb-mini-tag">Disembunyikan</span>}
              </button>
            ))}
          </div>

          {!baris.length && <div className="table-empty">Tidak ada masukan dengan filter ini.</div>}
        </div>
      )}

      <DetailFeedback
        item={detail}
        bolehModerasi={bolehModerasi}
        sibuk={sibuk}
        onClose={() => setDetail(null)}
        onToggle={toggleSembunyi}
      />
    </div>
  );
}
