"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const ALL_RT = ["RT_01", "RT_02", "RT_03", "RT_04"];
const BLOK_RUMAH_REGEX = /^E\d{1,2}\/\d{1,2}$/;

const EMPTY_FORM = {
  nama: "",
  no_hp: "",
  rt: "RT_01",
  blokRumah: "",
  statusRumah: "DIHUNI_TETAP",
  username: "",
  email: "",
  password: "",
};

/**
 * Tambah / ubah warga. Saat tambah, akun dibuatkan sekalian (registrasi mandiri sudah
 * dihapus): login pakai username (default no HP) dan password sementara dari pengurus RT.
 * `allowedRts` membatasi RT yang boleh dipilih; `rumahKosong` untuk saran blok.
 */
export default function WargaFormModal({
  open,
  mode = "create",
  initialData,
  allowedRts = ALL_RT,
  rumahKosong = [],
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const isEdit = mode === "edit";

  useEffect(() => {
    if (!open) return;
    if (isEdit && initialData) {
      setForm({
        ...EMPTY_FORM,
        nama: initialData.namaUser ?? "",
        no_hp: initialData.noTelp ?? "",
        username: initialData.username ?? "",
        email: initialData.email ?? "",
      });
    } else {
      setForm({ ...EMPTY_FORM, rt: allowedRts[0] ?? "RT_01" });
    }
  }, [open, isEdit, initialData, allowedRts]);

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: name === "blokRumah" ? value.toUpperCase() : value }));
  };

  const blokValid = isEdit || BLOK_RUMAH_REGEX.test(form.blokRumah.trim());
  const showBlokError = !isEdit && form.blokRumah.trim() !== "" && !blokValid;
  const saranBlok = rumahKosong.filter((r) => r.rt === form.rt);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!blokValid) return;
    setIsSaving(true);
    try {
      const payload = isEdit
        ? {
            nama: form.nama,
            no_hp: form.no_hp,
            username: form.username || undefined,
            email: form.email || undefined,
            ...(form.password ? { password: form.password } : {}),
          }
        : {
            nama: form.nama,
            no_hp: form.no_hp,
            rt: form.rt,
            blokRumah: form.blokRumah.trim(),
            statusRumah: form.statusRumah,
            username: form.username || undefined,
            email: form.email || undefined,
            password: form.password || undefined,
          };
      await onSubmit(payload);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEdit ? "Ubah Data Warga" : "Tambah Warga"}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="nama">
                Nama Lengkap <span className="required-star">*</span>
              </label>
              <input id="nama" name="nama" className="form-control" value={form.nama} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label htmlFor="no_hp">
                No. HP <span className="required-star">*</span>
              </label>
              <input
                id="no_hp"
                name="no_hp"
                className="form-control"
                inputMode="tel"
                placeholder="08xxxxxxxxxx"
                value={form.no_hp}
                onChange={handleChange}
                required
              />
              {!isEdit && <span className="field-hint">Dipakai sebagai nama pengguna untuk masuk bila kolom nama pengguna dikosongkan.</span>}
            </div>

            {!isEdit && (
              <>
                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="rt">
                      RT <span className="required-star">*</span>
                    </label>
                    <select
                      id="rt"
                      name="rt"
                      className="form-control"
                      value={form.rt}
                      onChange={handleChange}
                      disabled={allowedRts.length === 1}
                    >
                      {allowedRts.map((rt) => (
                        <option key={rt} value={rt}>
                          {rt.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="blokRumah">
                      Blok Rumah <span className="required-star">*</span>
                    </label>
                    <input
                      id="blokRumah"
                      name="blokRumah"
                      className="form-control"
                      placeholder="Contoh: E7/15"
                      list="saran-blok-kosong"
                      value={form.blokRumah}
                      onChange={handleChange}
                      required
                    />
                    <datalist id="saran-blok-kosong">
                      {saranBlok.map((r) => (
                        <option key={r.id} value={r.blokRumah} />
                      ))}
                    </datalist>
                    {showBlokError && <span className="field-error">Format blok rumah harus seperti E7/15</span>}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="statusRumah">Status Rumah</label>
                  <select id="statusRumah" name="statusRumah" className="form-control" value={form.statusRumah} onChange={handleChange}>
                    <option value="DIHUNI_TETAP">Dihuni (tetap)</option>
                    <option value="DIHUNI_KONTRAK">Dihuni (kontrak)</option>
                  </select>
                </div>
              </>
            )}

            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="username">Nama Pengguna</label>
                <input
                  id="username"
                  name="username"
                  className="form-control"
                  placeholder="Kosong = pakai no. HP"
                  value={form.username}
                  onChange={handleChange}
                  autoComplete="off"
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email (opsional)</label>
                <input id="email" name="email" type="email" className="form-control" value={form.email} onChange={handleChange} />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">{isEdit ? "Kata sandi baru (opsional)" : "Kata sandi awal"}</label>
              <input
                id="password"
                name="password"
                className="form-control"
                placeholder={isEdit ? "Kosongkan bila tidak diubah" : "Kosongkan = dibuatkan otomatis"}
                value={form.password}
                onChange={handleChange}
                minLength={6}
                autoComplete="new-password"
              />
              <span className="field-hint">Warga wajib menggantinya saat masuk pertama kali.</span>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-outline-neutral" onClick={onClose} disabled={isSaving}>
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={isSaving || !blokValid}>
              {isSaving ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Warga"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
