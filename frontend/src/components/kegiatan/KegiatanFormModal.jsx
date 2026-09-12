"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const EMPTY_FORM = {
  judul: "",
  deskripsi: "",
  tanggalAcara: "",
  status: "active",
};

function toDateInputValue(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export default function KegiatanFormModal({
  open,
  mode = "create",
  initialData,
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
        status: initialData.status ?? "active",
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
    setFile(event.target.files?.[0] ?? null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.judul.trim() || !form.deskripsi.trim() || !form.tanggalAcara) return;
    if (mode === "create" && !file) return;

    setIsSaving(true);
    try {
      await onSubmit({ ...form, file });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>{mode === "edit" ? "Edit Kegiatan" : "Tambah Kegiatan"}</h3>
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

            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                className="form-control custom-select"
                value={form.status}
                onChange={handleChange}
              >
                <option value="active">Active</option>
                <option value="unactived">Unactived</option>
              </select>
            </div>

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
