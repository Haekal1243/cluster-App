"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { areaLabel } from "@/lib/session";

/** Ketua/sekre RW memutuskan pengajuan tampil ke seluruh warga: setujui (dengan batas tampil) atau tolak (dengan alasan). */
export default function KeputusanPengajuanModal({ open, item, noun = "kegiatan", onClose, onSubmit }) {
  const [action, setAction] = useState("SETUJU");
  const [durasiHari, setDurasiHari] = useState("");
  const [alasan, setAlasan] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAction("SETUJU");
    setDurasiHari("");
    setAlasan("");
  }, [open, item]);

  if (!open || !item) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSubmit(
        action === "SETUJU"
          ? { action, durasiHari: durasiHari === "" ? undefined : Number(durasiHari) }
          : { action, alasan },
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h3>Pengajuan {noun} {areaLabel(item.area)}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p className="keputusan-judul">{item.judul}</p>

            <div className="keputusan-pilihan" role="radiogroup" aria-label="Keputusan">
              <label className={`keputusan-opsi ${action === "SETUJU" ? "is-active setuju" : ""}`}>
                <input type="radio" name="action" checked={action === "SETUJU"} onChange={() => setAction("SETUJU")} />
                Setujui
              </label>
              <label className={`keputusan-opsi ${action === "TOLAK" ? "is-active tolak" : ""}`}>
                <input type="radio" name="action" checked={action === "TOLAK"} onChange={() => setAction("TOLAK")} />
                Tolak
              </label>
            </div>

            {action === "SETUJU" ? (
              <div className="form-group">
                <label htmlFor="durasiHari">Tampil di beranda warga selama (hari)</label>
                <input
                  id="durasiHari"
                  type="number"
                  min="0"
                  className="form-control"
                  placeholder="Kosong / 0 = tanpa batas"
                  value={durasiHari}
                  onChange={(e) => setDurasiHari(e.target.value)}
                />
                <span className="field-hint">Setelah lewat, {noun} hilang dari beranda warga.</span>
              </div>
            ) : (
              <div className="form-group">
                <label htmlFor="alasan">
                  Alasan penolakan <span className="required-star">*</span>
                </label>
                <textarea
                  id="alasan"
                  className="form-control"
                  rows={3}
                  value={alasan}
                  onChange={(e) => setAlasan(e.target.value)}
                  placeholder="Sampaikan alasan agar sekre RT bisa memperbaiki"
                  required
                />
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-outline-neutral" onClick={onClose} disabled={isSaving}>
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? "Menyimpan..." : action === "SETUJU" ? "Setujui" : "Tolak Pengajuan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
