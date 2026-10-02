"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { wargaApi } from "@/lib/api";
import { isValidBlokRumah } from "@/lib/validators";
import Select from "@/components/ui/Select";

const ALL_RT = ["RT_01", "RT_02", "RT_03", "RT_04"];

const STATUS_LABELS = {
  KOSONG: "Kosong",
  DIHUNI_TETAP: "Dihuni (tetap)",
  DIHUNI_KONTRAK: "Dihuni (kontrak)",
};

const EMPTY_FORM = { blokRumah: "", rt: "RT_01", userId: "", status: "" };

// `allowedRts`: RT yang boleh dipilih (pengurus RT hanya RT-nya sendiri).
export default function RumahFormModal({ open, mode, initialData, onClose, onSubmit, allowedRts = ALL_RT }) {
  const RT_OPTIONS = allowedRts;
  const [form, setForm] = useState(EMPTY_FORM);
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pemilikQuery, setPemilikQuery] = useState("");
  const [pemilikOpen, setPemilikOpen] = useState(false);
  const pemilikRef = useRef(null);

  useEffect(() => {
    if (!pemilikOpen) return;
    const onPointerDown = (e) => {
      if (pemilikRef.current && !pemilikRef.current.contains(e.target)) setPemilikOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setPemilikOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [pemilikOpen]);

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
      setPemilikQuery(initialData.penghuni?.namaUser ?? "");
    } else {
      setForm({ ...EMPTY_FORM, rt: allowedRts[0] ?? "RT_01" });
      setPemilikQuery("");
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

  const isBlokValid = isValidBlokRumah(form.blokRumah);
  const showBlokError = form.blokRumah.trim() !== "" && !isBlokValid;
  const filteredUsers = users.filter((u) =>
    u.namaUser.toLowerCase().includes(pemilikQuery.trim().toLowerCase())
  );

  const pilihPemilik = (u) => {
    setForm((prev) => ({ ...prev, userId: u ? u.id : "" }));
    setPemilikQuery(u ? u.namaUser : "");
    setPemilikOpen(false);
  };

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

            {/* RT cuma ditampilkan kalau pengurus boleh pilih lebih dari satu RT (RW).
                Pengurus RT cuma punya satu RT, jadi otomatis dipakai tanpa perlu dropdown. */}
            {RT_OPTIONS.length > 1 && (
              <div className="form-group">
                <label className="form-label" htmlFor="rt">
                  Wilayah RT <span style={{ color: "var(--db-danger)" }}>*</span>
                </label>
                <Select
                  id="rt"
                  value={form.rt}
                  onChange={(v) => setForm((prev) => ({ ...prev, rt: v }))}
                  options={RT_OPTIONS.map((rt) => ({ value: rt, label: rt.replace("_", " ") }))}
                />
              </div>
            )}

            {/* Pemilik */}
            <div className="form-group">
              <label className="form-label" htmlFor="userId">
                Pemilik / Penanggung Jawab
              </label>
              <div className="combobox" ref={pemilikRef}>
                <input
                  id="userId"
                  className={`form-control ${pemilikOpen ? "combobox-input-open" : ""}`}
                  placeholder="Kosong"
                  autoComplete="off"
                  value={pemilikQuery}
                  disabled={isLoadingUsers}
                  onChange={(e) => {
                    setPemilikQuery(e.target.value);
                    setForm((prev) => ({ ...prev, userId: "" }));
                    setPemilikOpen(true);
                  }}
                  onFocus={() => setPemilikOpen(true)}
                />
                {pemilikOpen && (
                  <ul className="combobox-list" role="listbox">
                    <li>
                      <button type="button" className="combobox-option" onClick={() => pilihPemilik(null)}>
                        Kosong
                      </button>
                    </li>
                    {filteredUsers.map((u) => (
                      <li key={u.id}>
                        <button type="button" className="combobox-option" onClick={() => pilihPemilik(u)}>
                          {u.namaUser}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <p className="form-hint">
                Pilih warga yang bertanggung jawab membayar IPL untuk rumah ini.
                Rumah kosong pun sudah pasti ada pemiliknya — tetap pilih pemiliknya.
              </p>
            </div>

            {/* Status rumah */}
            <div className="form-group">
              <label className="form-label" htmlFor="status">Status Rumah</label>
              <Select
                id="status"
                value={form.status}
                onChange={(v) => setForm((prev) => ({ ...prev, status: v }))}
                options={[
                  { value: "", label: "Otomatis (ikut penghuni)" },
                  ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
                ]}
              />
              <p className="form-hint">
                Kosong = tidak dihuni, tetapi pemiliknya tetap membayar IPL dan masuk kas RT.
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
