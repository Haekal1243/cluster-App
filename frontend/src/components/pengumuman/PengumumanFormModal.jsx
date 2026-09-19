"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { showMessage } from "@/lib/message";

const EMPTY_FORM = {
  judul: "",
  keteranganPengumuman: "",
  durasiHari: "",
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function PengumumanFormModal({
  open,
  mode = "create",
  initialData,
  canApprove = false,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && initialData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset form when modal opens
      setForm({
        judul: initialData.judul ?? "",
        keteranganPengumuman: initialData.keteranganPengumuman ?? "",
        durasiHari: "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setFile(null);
  }, [open, mode, initialData]);

  if (!open) return null;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (event) => {
    const f = event.target.files?.[0] ?? null;
    if (f && f.size > MAX_FILE_SIZE) {
      showMessage("File Terlalu Besar", "Ukuran file maksimal 10 MB.", "warning");
      event.target.value = "";
      setFile(null);
      return;
    }
    setFile(f);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.judul.trim()) return;

    setIsSaving(true);
    try {
      // Batas tampil hanya boleh diatur pengurus yang berhak menyetujui (ketua/sekre RW).
      const { durasiHari, ...dasar } = form;
      await onSubmit({ ...dasar, ...(canApprove ? { durasiHari } : {}), file });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box pengumuman-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>
            {mode === "edit" ? "Ubah Pengumuman" : "Tambah Pengumuman"}
          </h3>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="judul">
                Judul Pengumuman <span className="required-star">*</span>
              </label>
              <input
                id="judul"
                name="judul"
                type="text"
                className="form-control"
                value={form.judul}
                onChange={handleChange}
                placeholder="Masukkan judul pengumuman"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="keteranganPengumuman">Keterangan</label>
              <textarea
                id="keteranganPengumuman"
                name="keteranganPengumuman"
                className="form-control"
                value={form.keteranganPengumuman}
                onChange={handleChange}
                placeholder="Masukkan keterangan pengumuman"
              />
            </div>

            {canApprove && (
              <div className="form-group">
                <label htmlFor="durasiHari">Tampil di beranda warga selama (hari)</label>
                <input
                  id="durasiHari"
                  name="durasiHari"
                  type="number"
                  min="0"
                  className="form-control"
                  placeholder={mode === "edit" ? "Kosong = tidak diubah, 0 = tanpa batas" : "Kosong / 0 = tanpa batas"}
                  value={form.durasiHari}
                  onChange={handleChange}
                />
              </div>
            )}

            <div className="form-group">
              <label>File Pengumuman</label>
              <div className="file-input-wrapper">
                <label className="file-input-label">
                  Pilih File
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                  />
                </label>
                <span className="file-current">
                  {file
                    ? file.name
                    : initialData?.filePengumuman
                      ? `File saat ini: ${initialData.filePengumuman}`
                      : "Belum ada file"}
                </span>
              </div>
              <span className="field-hint">PDF / DOC / DOCX / JPG / PNG · Maks. 10 MB</span>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-outline-neutral"
              onClick={onClose}
              disabled={isSaving}
            >
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
