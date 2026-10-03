"use client";

import { useEffect, useRef } from "react";
import { CheckCircle, Send, XCircle } from "lucide-react";
import { areaLabel } from "@/lib/session";

/**
 * Action bar + mode tolak. Desktop: footer / panel merah muda.
 * Mobile: sticky action bar / bottom sheet.
 */
export default function SetoranActions({
  isMobile,
  data,
  modeTolak,
  alasan,
  onAlasan,
  onMulaiTolak,
  onBatalTolak,
  onKirimTolak,
  onTerima,
  submitting,
}) {
  const busy = submitting !== null;
  const alasanKosong = alasan.trim().length === 0;
  const area = areaLabel(data?.area);

  if (modeTolak && isMobile) {
    return (
      <RejectSheet
        nama={data?.createBy}
        area={area}
        alasan={alasan}
        onAlasan={onAlasan}
        onBatal={onBatalTolak}
        onKirim={onKirimTolak}
        busy={busy}
        kosong={alasanKosong}
      />
    );
  }

  if (modeTolak) {
    return (
      <div className="sd-footer sd-reject">
        <div className="sd-reject-head">
          <label htmlFor="sd-alasan">Alasan penolakan</label>
          <span className="sd-reject-hint">wajib diisi, dikirim ke bendahara RT</span>
        </div>
        <textarea
          id="sd-alasan"
          rows={3}
          className="sd-textarea"
          placeholder="Contoh: Nominal di bukti transfer Rp 910.000, kurang 1 tagihan."
          value={alasan}
          onChange={(e) => onAlasan(e.target.value)}
          disabled={busy}
          autoFocus
        />
        <div className="sd-footer-row">
          <span />
          <span className="sd-btn-group">
            <button type="button" className="sd-btn sd-btn-ghost" onClick={onBatalTolak} disabled={busy}>
              Batal
            </button>
            <button
              type="button"
              className="sd-btn sd-btn-tolak-kirim"
              onClick={onKirimTolak}
              disabled={busy || alasanKosong}
            >
              <Send size={16} /> {submitting === "TOLAK" ? "Mengirim…" : "Kirim Penolakan"}
            </button>
          </span>
        </div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="sd-actionbar">
        <button type="button" className="sd-btn sd-btn-tolak" onClick={onMulaiTolak} disabled={busy}>
          <XCircle size={18} /> Tolak
        </button>
        <button type="button" className="sd-btn sd-btn-konfirmasi" onClick={onTerima} disabled={busy}>
          <CheckCircle size={18} /> {submitting === "TERIMA" ? "Memproses…" : "Konfirmasi Setoran"}
        </button>
      </div>
    );
  }

  return (
    <div className="sd-footer">
      <span className="sd-footer-hint">Cek nominal &amp; bukti sebelum konfirmasi.</span>
      <span className="sd-btn-group">
        <button type="button" className="sd-btn sd-btn-tolak" onClick={onMulaiTolak} disabled={busy}>
          <XCircle size={16} /> Tolak
        </button>
        <button type="button" className="sd-btn sd-btn-konfirmasi" onClick={onTerima} disabled={busy}>
          <CheckCircle size={16} /> {submitting === "TERIMA" ? "Memproses…" : "Konfirmasi Setoran"}
        </button>
      </span>
    </div>
  );
}

function RejectSheet({ nama, area, alasan, onAlasan, onBatal, onKirim, busy, kosong }) {
  const taRef = useRef(null);

  useEffect(() => {
    taRef.current?.focus();
  }, []);

  return (
    <div className="sd-sheet-overlay" onClick={onBatal}>
      <div
        className="sd-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Tolak setoran"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="sd-sheet-handle" aria-hidden="true" />
        <h4>Tolak setoran ini?</h4>
        <p className="sd-sheet-desc">
          Alasan dikirim ke {nama || "penyetor"} (bendahara {area}) supaya bisa setor ulang.
        </p>
        <label htmlFor="sd-alasan-m">Alasan penolakan</label>
        <textarea
          id="sd-alasan-m"
          ref={taRef}
          rows={4}
          className="sd-textarea"
          placeholder="Contoh: Nominal di bukti transfer kurang 1 tagihan."
          value={alasan}
          onChange={(e) => onAlasan(e.target.value)}
          disabled={busy}
        />
        <button
          type="button"
          className="sd-btn sd-btn-tolak-kirim sd-btn-block"
          onClick={onKirim}
          disabled={busy || kosong}
        >
          <Send size={16} /> {busy ? "Mengirim…" : "Kirim Penolakan"}
        </button>
        <button type="button" className="sd-btn sd-btn-ghost sd-btn-block" onClick={onBatal} disabled={busy}>
          Batal
        </button>
      </div>
    </div>
  );
}
