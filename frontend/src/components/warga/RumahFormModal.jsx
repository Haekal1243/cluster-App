"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { wargaApi } from "@/lib/api";

const ALL_RT = ["RT_01", "RT_02", "RT_03", "RT_04"];

const STATUS_LABELS = {
  KOSONG: "Kosong",
  DIHUNI_TETAP: "Dihuni (tetap)",
  DIHUNI_KONTRAK: "Dihuni (kontrak)",
};

const EMPTY_FORM = { blokRumah: "", rt: "RT_01", userId: "", status: "" };

const BLOK_RUMAH_REGEX = /^E\d{1,2}\/\d{1,2}$/;

// `allowedRts`: RT yang boleh dipilih (pengurus RT hanya RT-nya sendiri).
export default function RumahFormModal({ open, mode, initialData, onClose, onSubmit, allowedRts = ALL_RT }) {
  const RT_OPTIONS = allowedRts;
  const [form, setForm] = useState(EMPTY_FORM);
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load dropdown users once
  useEffect(() => {
    if (!open) return;
    setIsLoadingUsers(true);
    wargaApi
      .getAllUsers()
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]))
      .finally(() => setIsLoadingUsers(false));
  }, [open]);

  // Populate form when editing
  useEffect(() => {
    if (mode === "edit" && initialData) {
      setForm({
        blokRumah: initialData.blokRumah ?? "",
        rt: initialData.rt ?? "RT_01",
        userId: initialData.userId ?? "",
        status: initialData.status ?? "",
      });
    } else {
      setForm({ ...EMPTY_FORM, rt: allowedRts[0] ?? "RT_01" });
    }
  }, [mode, initialData, open, allowedRts]);

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "blokRumah") {
      setForm((prev) => ({ ...prev, blokRumah: value.toUpperCase() }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const isBlokValid = BLOK_RUMAH_REGEX.test(form.blokRumah);
  const showBlokError = form.blokRumah.trim() !== "" && !isBlokValid;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isBlokValid) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        blokRumah: form.blokRumah.trim(),
        rt: form.rt,
        userId: form.userId ? Number(form.userId) : null,
        // Kosong = ikut penghuni (ada penghuni -> tetap, tanpa penghuni -> kosong)
        ...(form.status ? { status: form.status } : {}),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h3>{mode === "edit" ? "Ubah Data Rumah" : "Tambah Rumah Baru"}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Blok Rumah */}
            <div className="form-group">
              <label className="form-label" htmlFor="blokRumah">
                Blok Rumah <span style={{ color: "var(--db-danger)" }}>*</span>
              </label>
              <input
                id="blokRumah"
                name="blokRumah"
                type="text"
                className="form-control"
                placeholder="Contoh: E7/15"
                value={form.blokRumah}
                onChange={handleChange}
                required
              />
              {showBlokError && (
                <span className="field-error">
                  Format blok rumah harus seperti E7/15
                </span>
              )}
            </div>

            {/* RT */}
            <div className="form-group">
              <label className="form-label" htmlFor="rt">
                Wilayah RT <span style={{ color: "var(--db-danger)" }}>*</span>
              </label>
              <select
                id="rt"
                name="rt"
                className="form-control"
                value={form.rt}
                onChange={handleChange}
                required
              >
                {RT_OPTIONS.map((rt) => (
                  <option key={rt} value={rt}>
                    {rt.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>

            {/* Pemilik */}
            <div className="form-group">
              <label className="form-label" htmlFor="userId">
                Pemilik / Penanggung Jawab
              </label>
              <select
                id="userId"
                name="userId"
                className="form-control"
                value={form.userId}
                onChange={handleChange}
                disabled={isLoadingUsers}
              >
                <option value="">— Kosong (Rumah Belum Dihuni) —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.namaUser} ({u.username})
                    {u._count?.rumah > 0
                      ? ` · ${u._count.rumah} rumah`
                      : ""}
                  </option>
                ))}
              </select>
              <p className="form-hint">
                Pilih warga yang bertanggung jawab membayar IPL untuk rumah ini.
              </p>
            </div>

            {/* Status rumah */}
            <div className="form-group">
              <label className="form-label" htmlFor="status">Status Rumah</label>
              <select
                id="status"
                name="status"
                className="form-control"
                value={form.status}
                onChange={handleChange}
              >
                <option value="">Otomatis (ikut penghuni)</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <p className="form-hint">
                Tandai rumah yang dikontrakkan supaya terlihat berbeda dari rumah tetap.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn-outline-neutral"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting || !isBlokValid}>
              {isSubmitting
                ? "Menyimpan..."
                : mode === "edit"
                ? "Simpan Perubahan"
                : "Tambah Rumah"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
