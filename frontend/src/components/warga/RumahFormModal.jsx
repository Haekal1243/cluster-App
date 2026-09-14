"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { wargaApi } from "@/lib/warga.api";

const RT_OPTIONS = ["RT_01", "RT_02", "RT_03", "RT_04"];

const EMPTY_FORM = { blokRumah: "", rt: "RT_01", userId: "" };

export default function RumahFormModal({ open, mode, initialData, onClose, onSubmit }) {
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
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [mode, initialData, open]);

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.blokRumah.trim()) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        blokRumah: form.blokRumah.trim(),
        rt: form.rt,
        userId: form.userId ? Number(form.userId) : null,
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
          <h3>{mode === "edit" ? "Edit Data Rumah" : "Tambah Rumah Baru"}</h3>
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
                placeholder="Contoh: Blok A No. 05"
                value={form.blokRumah}
                onChange={handleChange}
                required
              />
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
                    {u.namaUser} ({u.email})
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
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
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
