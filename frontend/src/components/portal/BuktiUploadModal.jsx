"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  Upload,
  Image as ImageIcon,
  Send,
  Trash2,
  Loader2,
} from "lucide-react";
import { portalApi } from "@/lib/api";
import { showMessage } from "@/lib/message";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/jpg"];

const formatUkuran = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

export default function BuktiUploadModal({ ipl, user, rumah, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const panelRef = useRef(null);
  const triggerRef = useRef(null);

  // Preview gambar saat file dipilih
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // A11y: fokus masuk modal, Esc menutup, scroll body dikunci,
  // fokus dikembalikan ke pemicu saat modal ditutup.
  useEffect(() => {
    triggerRef.current = document.activeElement;
    panelRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", handleKey);
      if (triggerRef.current instanceof HTMLElement) triggerRef.current.focus();
    };
  }, [onClose]);

  // Validasi klien (gate tampilan saja; aturan backend tetap sumber kebenaran).
  const pilihFile = (f) => {
    if (!f) return;
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setError("Format file harus JPG atau PNG.");
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setError("Ukuran file maksimal 5 MB.");
      return;
    }
    setError(null);
    setFile(f);
  };

  const handleFileChange = (e) => {
    pilihFile(e.target.files?.[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    pilihFile(e.dataTransfer.files?.[0]);
  };

  const resetFile = () => {
    setFile(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      await showMessage("Pilih file bukti pembayaran terlebih dahulu!", "warning");
      return;
    }
    setIsSubmitting(true);
    try {
      await portalApi.uploadBuktiPembayaran({
        idUser: user.id,
        idIpl: ipl.id,
        nominal: ipl.nominal,
        file,
      });
      await showMessage(
        "Bukti pembayaran berhasil dikirim!\nAdmin akan mengkonfirmasi dalam 1x24 jam.",
        "success"
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      await showMessage(err.message || "Gagal mengirim bukti pembayaran.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const MONTHS = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  const bulanLabel = `${MONTHS[(parseInt(ipl.bulanPeriode, 10) - 1)] || ipl.bulanPeriode} ${ipl.tahunPeriode}`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
        {/* Header */}
        <div className="modal-header">
          <h3 id="bukti-upload-title">Unggah Bukti Pembayaran</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Info Tagihan */}
            <div className="bukti-info-card">
              <div className="bukti-info-row">
                <span className="bukti-info-label">Periode</span>
                <span className="bukti-info-value">{bulanLabel}</span>
              </div>
              <div className="bukti-info-row">
                <span className="bukti-info-label">Rumah</span>
                <span className="bukti-info-value">{rumah?.blokRumah} ({rumah?.rt?.replace("_", " ")})</span>
              </div>
              <div className="bukti-info-row">
                <span className="bukti-info-label">Nominal</span>
                <span className="bukti-info-value bukti-nominal">
                  Rp {ipl.nominal.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            {/* Drop Zone */}
            <div
              className={`bukti-dropzone ${preview ? "has-preview" : ""} ${isDragOver ? "is-dragover" : ""} ${error ? "has-error" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
            >
              {preview ? (
                <div className="bukti-preview-wrap">
                  <img src={preview} alt="Preview bukti" className="bukti-preview-img" />
                  <p className="bukti-preview-name">{file.name} · {formatUkuran(file.size)}</p>
                </div>
              ) : (
                <div className="bukti-drop-placeholder">
                  <ImageIcon size={40} strokeWidth={1.2} />
                  <p>Klik atau seret foto bukti transfer ke sini</p>
                  <span>JPG / PNG · Maks. 5 MB</span>
                </div>
              )}
            </div>
            {error && <span className="field-error">{error}</span>}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpg,image/jpeg,image/png"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />

            {preview && (
              <div className="bukti-file-actions">
                <button
                  type="button"
                  className="bukti-ganti-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={14} /> Ganti Foto
                </button>
                <button
                  type="button"
                  className="btn-icon danger"
                  onClick={resetFile}
                  aria-label="Hapus file"
                  title="Hapus file"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting || !file}>
              {isSubmitting ? (
                <><Loader2 size={16} className="spin" /> Mengirim...</>
              ) : (
                <><Send size={16} /> Kirim Bukti</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
