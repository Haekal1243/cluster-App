"use client";

import { useEffect, useState } from "react";
import { X, Send } from "lucide-react";
import { pengaduanApi } from "@/lib/api";
import { showMessage } from "@/lib/message";
import Select from "@/components/ui/Select";
import FileDropzone from "@/components/ui/FileDropzone";

const KATEGORI_OPTIONS = [
  { value: "KEBERSIHAN", label: "Kebersihan" },
  { value: "KEAMANAN", label: "Keamanan" },
  { value: "INFRASTRUKTUR", label: "Infrastruktur" },
  { value: "LAINNYA", label: "Lainnya" },
];

const EMPTY_FORM = { judul: "", kategori: "KEBERSIHAN", deskripsi: "", tujuan: "" };
const JUDUL_MAX_LENGTH = 50;

export default function PengaduanFormModal({ onClose, onSuccess }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tujuanPilihan, setTujuanPilihan] = useState([]);
  const [loadingTujuan, setLoadingTujuan] = useState(true);

  // Pilihan tujuan (RW / RT) mengikuti rumah & jabatan pelapor — dihitung backend supaya
  // form dan validasi submit selalu pakai aturan yang sama (lihat PengaduanService.getTujuanPilihan).
  useEffect(() => {
    let cancelled = false;
    pengaduanApi.getTujuanPilihan()
      .then((data) => {
        if (cancelled) return;
        const pilihan = data || [];
        setTujuanPilihan(pilihan);
        if (pilihan.length > 0) {
          setForm((prev) => ({ ...prev, tujuan: pilihan[0].value }));
        }
      })
      .catch((err) => {
        if (!cancelled) showMessage("Gagal Memuat Tujuan", err.message || "Tidak dapat memuat pilihan tujuan.", "error");
      })
      .finally(() => { if (!cancelled) setLoadingTujuan(false); });
    return () => { cancelled = true; };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.judul.trim() || !form.deskripsi.trim() || !form.tujuan) return;

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
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
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
                maxLength={JUDUL_MAX_LENGTH}
                required
              />
              <span className="field-hint" style={{ display: "block", textAlign: "right" }}>
                {form.judul.length}/{JUDUL_MAX_LENGTH}
              </span>
            </div>

            <div className="form-group">
              <label>
                Tujuan <span className="required-star">*</span>
              </label>
              {loadingTujuan ? (
                <span className="field-hint">Memuat pilihan tujuan...</span>
              ) : tujuanPilihan.length === 0 ? (
                <span className="field-hint" style={{ color: "var(--danger, #dc2626)" }}>
                  Akun Anda tidak memiliki tujuan pengaduan yang valid. Hubungi pengurus.
                </span>
              ) : (
                <Select
                  value={form.tujuan}
                  onChange={(v) => setForm((prev) => ({ ...prev, tujuan: v }))}
                  options={tujuanPilihan.map(({ value, label }) => ({ value, label }))}
                />
              )}
            </div>

            <div className="form-group">
              <label htmlFor="kategori">
                Kategori <span className="required-star">*</span>
              </label>
              <Select
                id="kategori"
                value={form.kategori}
                onChange={(v) => setForm((prev) => ({ ...prev, kategori: v }))}
                options={KATEGORI_OPTIONS}
              />
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
              <FileDropzone
                file={file}
                onFileSelect={setFile}
                onRemove={() => setFile(null)}
                accept="image/jpg,image/jpeg,image/png"
                maxSizeMB={10}
                placeholder="Klik atau seret foto ke sini (opsional)"
                hint="JPG / PNG · Maks. 10 MB"
                onError={(msg) => showMessage("File Terlalu Besar", msg, "warning")}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Batal
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting || loadingTujuan || tujuanPilihan.length === 0}
            >
              {isSubmitting ? "Mengirim..." : <><Send size={15} /> Kirim Pengaduan</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
