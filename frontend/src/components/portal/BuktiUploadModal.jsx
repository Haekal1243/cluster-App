"use client";

import { useEffect, useRef, useState } from "react";
import { X, Upload, Image as ImageIcon, CheckCircle } from "lucide-react";
import { portalApi } from "@/lib/api";
import { showMessage } from "@/lib/message";

export default function BuktiUploadModal({ ipl, user, rumah, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // Preview gambar saat file dipilih
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
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
      <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        {/* Header */}
        <div className="modal-header">
          <h2>Upload Bukti Pembayaran</h2>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

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

        <form onSubmit={handleSubmit}>
          {/* Drop Zone */}
          <div
            className={`bukti-dropzone ${preview ? "has-preview" : ""}`}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
          >
            {preview ? (
              <div className="bukti-preview-wrap">
                <img src={preview} alt="Preview bukti" className="bukti-preview-img" />
                <p className="bukti-preview-name">{file.name}</p>
              </div>
            ) : (
              <div className="bukti-drop-placeholder">
                <ImageIcon size={40} strokeWidth={1.2} />
                <p>Klik atau seret foto bukti transfer ke sini</p>
                <span>JPG / PNG · Maks. 5 MB</span>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpg,image/jpeg,image/png"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />

          {preview && (
            <button
              type="button"
              className="bukti-ganti-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={14} /> Ganti Foto
            </button>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting || !file}>
              {isSubmitting ? (
                "Mengirim..."
              ) : (
                <><CheckCircle size={16} /> Kirim Bukti</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
