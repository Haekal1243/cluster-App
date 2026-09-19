"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { showMessage } from "@/lib/message";

const EMPTY_FORM = {
  judul: "",
  deskripsi: "",
  tanggalAcara: "",
  tampilDiLanding: false,
  durasiHari: "",
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function toDateInputValue(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export default function KegiatanFormModal({
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
        deskripsi: initialData.deskripsi ?? "",
        tanggalAcara: toDateInputValue(initialData.tanggalAcara),
        tampilDiLanding: !!initialData.tampilDiLanding,
        durasiHari: "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setFile(null);
  }, [open, mode, initialData]);

  if (!open) return null;

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleFileChange = (event) => {
    const f = event.target.files?.[0] ?? null;
    if (f && f.size > MAX_FILE_SIZE) {
      showMessage("File Terlalu Besar", "Ukuran gambar maksimal 10 MB.", "warning");
      event.target.value = "";
      setFile(null);
      return;
    }
    setFile(f);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.judul.trim() || !form.deskripsi.trim() || !form.tanggalAcara) return;
    if (mode === "create" && !file) return;

    setIsSaving(true);
    try {
      // Portofolio landing & batas tampil hanya boleh diatur pengurus yang berhak menyetujui (ketua/sekre RW).
      const { tampilDiLanding, durasiHari, ...dasar } = form;
      await onSubmit({
        ...dasar,
        ...(canApprove ? { tampilDiLanding, durasiHari } : {}),
        file,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box kegiatan-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>{mode === "edit" ? "Ubah Kegiatan" : "Tambah Kegiatan"}</h3>
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
                Judul Kegiatan <span className="required-star">*</span>
              </label>
              <input
                id="judul"
                name="judul"
                type="text"
                className="form-control"
                value={form.judul}
                onChange={handleChange}
                placeholder="Masukkan judul kegiatan"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="deskripsi">
                Deskripsi <span className="required-star">*</span>
              </label>
              <textarea
                id="deskripsi"
                name="deskripsi"
                className="form-control"
                value={form.deskripsi}
                onChange={handleChange}
                placeholder="Masukkan deskripsi kegiatan"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="tanggalAcara">
                Tanggal Acara <span className="required-star">*</span>
              </label>
              <input
                id="tanggalAcara"
                name="tanggalAcara"
                type="date"
                className="form-control"
                value={form.tanggalAcara}
                onChange={handleChange}
                required
              />
            </div>

            {canApprove && (
              <>
                <div className="form-group">
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      name="tampilDiLanding"
                      checked={form.tampilDiLanding}
                      onChange={handleChange}
                    />
                    Tampilkan di portofolio landing page (5 tahun)
                  </label>
                </div>
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
              </>
            )}

            <div className="form-group">
              <label>
                Gambar Kegiatan{" "}
                {mode === "create" && <span className="required-star">*</span>}
              </label>
              <div className="file-input-wrapper">
                <label className="file-input-label">
                  Pilih Gambar
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    required={mode === "create"}
                  />
                </label>
                <span className="file-current">
                  {file
                    ? file.name
                    : initialData?.gambarUrl
                      ? `Gambar saat ini: ${initialData.gambarUrl}`
                      : "Belum ada gambar"}
                </span>
              </div>
              <span className="field-hint">JPG / PNG · Maks. 10 MB</span>
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
