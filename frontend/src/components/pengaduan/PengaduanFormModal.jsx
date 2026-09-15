"use client";

import { useEffect, useRef, useState } from "react";
import { X, Upload, Image as ImageIcon, Send } from "lucide-react";
import { pengaduanApi } from "@/lib/api";
import { showMessage } from "@/lib/message";

const KATEGORI_OPTIONS = [
  { value: "KEBERSIHAN", label: "Kebersihan" },
  { value: "KEAMANAN", label: "Keamanan" },
  { value: "INFRASTRUKTUR", label: "Infrastruktur" },
  { value: "LAINNYA", label: "Lainnya" },
];

const EMPTY_FORM = { judul: "", kategori: "KEBERSIHAN", deskripsi: "" };

export default function PengaduanFormModal({ onClose, onSuccess }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

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
    if (!form.judul.trim() || !form.deskripsi.trim()) return;

    setIsSubmitting(true);
    try {
      await pengaduanApi.create({ ...form, file: file || undefined });
      await showMessage(
        "Pengaduan Terkirim",
        "Laporan kamu sudah diterima. Pengurus akan segera menindaklanjuti.",
        "success"
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      await showMessage("Gagal Mengirim", err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h3>Ajukan Pengaduan</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="judul">
                Judul <span className="required-star">*</span>
              </label>
              <input
                id="judul"
                name="judul"
                type="text"
                className="form-control"
                placeholder="Contoh: Lampu jalan mati"
                value={form.judul}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="kategori">
                Kategori <span className="required-star">*</span>
              </label>
              <select
                id="kategori"
                name="kategori"
                className="form-control custom-select"
                value={form.kategori}
                onChange={handleChange}
              >
                {KATEGORI_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="deskripsi">
                Deskripsi Kendala <span className="required-star">*</span>
              </label>
              <textarea
                id="deskripsi"
                name="deskripsi"
                className="form-control"
                placeholder="Jelaskan kendala yang terjadi, lokasi, dan detail lainnya"
                value={form.deskripsi}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Foto Kendala (opsional)</label>
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
                    <img src={preview} alt="Preview foto kendala" className="bukti-preview-img" />
                    <p className="bukti-preview-name">{file.name}</p>
                  </div>
                ) : (
                  <div className="bukti-drop-placeholder">
                    <ImageIcon size={36} strokeWidth={1.2} />
                    <p>Klik atau seret foto ke sini (opsional)</p>
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
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Mengirim..." : <><Send size={15} /> Kirim Pengaduan</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
