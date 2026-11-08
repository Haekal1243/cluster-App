"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, CircleHelp, Info, TriangleAlert, XCircle } from "lucide-react";
import { langganan, tutup } from "@/lib/dialog";

const IKON = {
  success: { Ikon: CheckCircle2, cls: "dlg-ikon-success" },
  error: { Ikon: XCircle, cls: "dlg-ikon-error" },
  warning: { Ikon: TriangleAlert, cls: "dlg-ikon-warning" },
  info: { Ikon: Info, cls: "dlg-ikon-info" },
  question: { Ikon: CircleHelp, cls: "dlg-ikon-question" },
};

async function salinKeClipboard(teks) {
  try {
    await navigator.clipboard.writeText(teks);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = teks;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      return document.execCommand("copy");
    } catch {
      return false;
    } finally {
      ta.remove();
    }
  }
}

function IsiKredensial({ d }) {
  const [status, setStatus] = useState("");
  const teksSalin = [
    d.nama ? `Akun portal RW 21 Cluster Topaz untuk ${d.nama}` : "Akun portal RW 21 Cluster Topaz",
    d.loginUrl ? `Alamat portal: ${d.loginUrl}` : null,
    d.username ? `Nama pengguna: ${d.username}` : null,
    `Kata sandi sementara: ${d.password}`,
    "Mohon ganti kata sandi saat masuk pertama kali.",
  ]
    .filter(Boolean)
    .join("\n");

  const salin = async () => {
    const ok = await salinKeClipboard(teksSalin);
    setStatus(ok ? "Tersalin ✓" : "Gagal menyalin, salin manual");
  };

  const baris = (label, nilai) =>
    nilai ? (
      <div className="dlg-kred-baris">
        <span>{label}</span>
        <b>{nilai}</b>
      </div>
    ) : null;

  return (
    <>
      <div className="dlg-kred">
        {baris("Nama", d.nama)}
        {baris("Blok rumah", d.blok)}
        {baris("Alamat portal", d.loginUrl)}
        {baris("Nama pengguna", d.username)}
        <div className="dlg-kred-baris">
          <span>Kata sandi sementara</span>
          <code>{d.password}</code>
        </div>
      </div>
      <p className="dlg-catatan">
        {d.catatan || "Kata sandi ini hanya tampil sekarang. Sampaikan ke warga; mereka wajib menggantinya saat masuk pertama kali."}
      </p>
      <button type="button" className="dlg-btn dlg-btn-salin" onClick={salin}>
        {status || "Salin nama pengguna & kata sandi"}
      </button>
    </>
  );
}

function Dialog({ d }) {
  const [nilai, setNilai] = useState(d.tipe === "pilihan" ? d.value : "");
  const [galat, setGalat] = useState("");
  const inputRef = useRef(null);
  const ikon = d.icon ? IKON[d.icon] || IKON.info : null;
  const bahaya = d.icon === "warning" || d.icon === "error";

  const batal = () => tutup(d.id, d.tipe === "konfirmasi" ? false : undefined);

  const oke = () => {
    if (d.tipe === "prompt") {
      if (d.wajib && !nilai.trim()) {
        setGalat(d.pesanWajib);
        inputRef.current?.focus();
        return;
      }
      return tutup(d.id, nilai);
    }
    if (d.tipe === "pilihan") return tutup(d.id, nilai);
    if (d.tipe === "konfirmasi") return tutup(d.id, true);
    return tutup(d.id, undefined);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") batal();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (d.tipe === "prompt") inputRef.current?.focus();
  }, [d.tipe]);

  const punyaBatal = d.tipe === "konfirmasi" || d.tipe === "prompt" || d.tipe === "pilihan";
  const labelOke =
    d.tipe === "pesan" ? "OK" : d.tipe === "kredensial" ? "Sudah saya kirim / catat" : d.confirmText || "Ya";

  return (
    <div className="dlg-overlay" onClick={d.tipe === "prompt" || d.tipe === "kredensial" ? undefined : batal}>
      <div
        className="dlg-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`dlg-judul-${d.id}`}
        onClick={(e) => e.stopPropagation()}
      >
        {ikon && (
          <span className={`dlg-ikon ${ikon.cls}`} aria-hidden="true">
            <ikon.Ikon size={30} strokeWidth={1.8} />
          </span>
        )}
        <h3 id={`dlg-judul-${d.id}`} className="dlg-judul">{d.title}</h3>
        {d.text && d.tipe !== "kredensial" && <p className="dlg-teks">{d.text}</p>}

        {d.tipe === "prompt" && (
          <div className="dlg-field">
            {d.label && <label htmlFor={`dlg-input-${d.id}`}>{d.label}</label>}
            <textarea
              id={`dlg-input-${d.id}`}
              ref={inputRef}
              className="form-control"
              rows={3}
              placeholder={d.placeholder}
              value={nilai}
              onChange={(e) => {
                setNilai(e.target.value);
                if (galat) setGalat("");
              }}
            />
            {galat && <span className="dlg-galat">{galat}</span>}
          </div>
        )}

        {d.tipe === "pilihan" && (
          <div className="dlg-field">
            {d.label && <span className="dlg-label">{d.label}</span>}
            <div className="dlg-opsi">
              {d.options.map((o) => (
                <label key={o.value} className={`dlg-opsi-item${nilai === o.value ? " aktif" : ""}`}>
                  <input type="radio" name={`dlg-pilihan-${d.id}`} checked={nilai === o.value} onChange={() => setNilai(o.value)} />
                  <span>{o.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {d.tipe === "kredensial" && <IsiKredensial d={d} />}

        <div className="dlg-aksi">
          {punyaBatal && (
            <button type="button" className="dlg-btn dlg-btn-batal" onClick={batal}>
              {d.cancelText || "Batal"}
            </button>
          )}
          <button
            type="button"
            className={`dlg-btn ${bahaya && d.tipe === "konfirmasi" ? "dlg-btn-bahaya" : "dlg-btn-utama"}`}
            onClick={oke}
            autoFocus={d.tipe !== "prompt"}
          >
            {labelOke}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Dipasang sekali di layout utama: menampilkan dialog pesan/konfirmasi/isian dari lib/message.js (satu per satu bila bertumpuk). */
export default function DialogHost() {
  const [aktif, setAktif] = useState(null);
  useEffect(() => langganan(setAktif), []);
  return aktif ? <Dialog key={aktif.id} d={aktif} /> : null;
}
