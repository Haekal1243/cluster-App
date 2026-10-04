"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, ImageOff, MessageCircle, UserCog, UserMinus, UserPlus, X } from "lucide-react";
import { pengurusApi } from "@/lib/api";
import { areaLabel } from "@/lib/session";
import { showConfirm, showMessage } from "@/lib/message";
import Select from "@/components/ui/Select";
import FileDropzone from "@/components/ui/FileDropzone";

const URUTAN_AREA = ["RW", "RT_01", "RT_02", "RT_03", "RT_04"];
const MAKS_FOTO = 5 * 1024 * 1024;

/** Pesan error kalau foto tidak boleh diunggah, null kalau lolos (server tetap memvalidasi ulang). */
function cekFoto(file) {
  if (!/\.(jpe?g|png)$/i.test(file.name)) return "Tipe file tidak didukung. Gunakan JPG atau PNG.";
  if (file.size > MAKS_FOTO) return "Ukuran foto maksimal 5 MB.";
  return null;
}

function Avatar({ nama, foto }) {
  return (
    <span className="pengurus-avatar">
      {foto ? <img src={pengurusApi.fotoUrl(foto)} alt={nama} /> : (nama?.[0] ?? "?").toUpperCase()}
    </span>
  );
}

/** Format 62812... -> 0812... untuk ditampilkan/diedit admin. */
const nomorLokal = (n) => (n ? n.replace(/^62/, "0") : "");

function KontakModal({ pemegang, jabatan, onClose, onSubmit }) {
  const [nomor, setNomor] = useState(nomorLokal(pemegang.kontakPublik));
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(nomor.trim() || null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h3>Kontak {jabatan}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Tutup"><X size={18} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <p className="field-hint" style={{ marginBottom: 10 }}>
              Untuk <b>{pemegang.namaUser}</b>. Nomor ini tampil ke <b>siapa saja</b> di halaman depan sebagai tombol
              WhatsApp, dan bisa dibaca bot. Pakai nomor khusus pengurus atau sekretariat, bukan nomor pribadi.
            </p>
            <div className="form-group">
              <label htmlFor="kontak-pengurus">Nomor WhatsApp</label>
              <input
                id="kontak-pengurus"
                type="tel"
                inputMode="tel"
                className="form-control"
                placeholder="0812 3456 7890"
                value={nomor}
                onChange={(e) => setNomor(e.target.value)}
                autoFocus
              />
              <span className="field-hint">
                Kosongkan lalu simpan untuk menyembunyikan. Kontak otomatis disembunyikan saat jabatan dilepas.
              </span>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-outline-neutral" onClick={onClose} disabled={saving}>Batal</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TetapkanModal({ slot, onClose, onSubmit }) {
  const [kandidat, setKandidat] = useState(null);
  const [userId, setUserId] = useState("");
  const [foto, setFoto] = useState(null);
  const [saving, setSaving] = useState(false);

  const pilihFoto = (file) => {
    const masalah = file && cekFoto(file);
    if (masalah) {
      showMessage("Foto Tidak Valid", masalah, "error");
      return;
    }
    setFoto(file);
  };

  useEffect(() => {
    pengurusApi
      .getKandidat(slot.area)
      .then(setKandidat)
      .catch((err) => {
        showMessage("Gagal Memuat Warga", err.message, "error");
        onClose();
      });
    // onClose berubah tiap render induk; cukup sekali per slot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot.area]);

  const submit = async (e) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    try {
      await onSubmit(Number(userId), foto);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h3>{slot.role.nama} {areaLabel(slot.area)}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Tutup"><X size={18} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            {slot.pemegang && (
              <p className="field-hint" style={{ marginBottom: 10 }}>
                Saat ini dijabat <b>{slot.pemegang.namaUser}</b>. Bila diganti, yang bersangkutan otomatis kembali
                menjadi warga biasa.
              </p>
            )}
            <div className="form-group">
              <label htmlFor="kandidat">Pilih warga <span className="required-star">*</span></label>
              <Select
                id="kandidat"
                value={userId}
                onChange={(v) => setUserId(v)}
                disabled={!kandidat}
                placeholder={kandidat ? "- Pilih warga -" : "Memuat..."}
                options={(kandidat ?? []).map((k) => ({
                  value: String(k.id),
                  label: `${k.namaUser} · ${areaLabel(k.area)}${k.rumah?.length ? ` · ${k.rumah.map((r) => r.blokRumah).join(", ")}` : ""}`,
                }))}
              />
              <span className="field-hint">
                {slot.role.level === 2
                  ? `Hanya warga ${areaLabel(slot.area)} yang bisa menjadi ${slot.role.nama}.`
                  : "Pengurus RW dipilih dari seluruh warga."}
              </span>
            </div>
            <div className="form-group">
              <label htmlFor="foto-pengurus">Foto pengurus</label>
              <FileDropzone
                file={foto}
                onFileSelect={pilihFoto}
                onRemove={() => setFoto(null)}
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                maxSizeMB={5}
                placeholder="Klik atau seret foto ke sini (opsional)"
                hint="JPG / PNG · Maks. 5 MB"
                onError={(msg) => showMessage("Foto Tidak Valid", msg, "error")}
              />
              <span className="field-hint">
                Tampil di halaman depan; foto ini milik pemegang baru dan bisa diubah kapan saja.
              </span>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-outline-neutral" onClick={onClose} disabled={saving}>Batal</button>
            <button type="submit" className="btn-primary" disabled={saving || !userId}>{saving ? "Menyimpan..." : "Tetapkan"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PengurusPage() {
  const [slots, setSlots] = useState(null);
  const [tetapkan, setTetapkan] = useState(null);
  const [kontak, setKontak] = useState(null);

  const load = useCallback(async () => {
    try {
      setSlots(await pengurusApi.getSlots());
    } catch (err) {
      showMessage("Gagal Memuat Data", err.message, "error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const perArea = useMemo(() => {
    const map = new Map(URUTAN_AREA.map((a) => [a, []]));
    for (const s of slots ?? []) map.get(s.area)?.push(s);
    return [...map.entries()].filter(([, list]) => list.length > 0);
  }, [slots]);

  const submitTetapkan = async (userId, foto) => {
    let res;
    try {
      res = await pengurusApi.tetapkan({ roleId: tetapkan.role.id, area: tetapkan.area, userId });
    } catch (err) {
      showMessage("Gagal Menetapkan", err.message, "error");
      return;
    }
    setTetapkan(null);
    if (foto) {
      try {
        await pengurusApi.uploadFoto(userId, foto);
      } catch (err) {
        // Jabatan sudah tersimpan; foto bisa diunggah ulang lewat tombol kamera.
        showMessage("Jabatan Tersimpan, Foto Gagal", `${res.message} Namun foto gagal diunggah: ${err.message}`, "warning");
        load();
        return;
      }
    }
    showMessage("Berhasil", res.message, "success");
    load();
  };

  const submitKontak = async (nomor) => {
    try {
      const res = await pengurusApi.setKontak(kontak.pemegang.id, nomor);
      showMessage("Berhasil", res.message, "success");
      setKontak(null);
      load();
    } catch (err) {
      showMessage("Gagal Menyimpan Kontak", err.message, "error");
    }
  };

  const fotoInput = useRef(null);
  const fotoTarget = useRef(null);

  const pilihUbahFoto = (pemegang) => {
    fotoTarget.current = pemegang;
    fotoInput.current?.click();
  };

  const submitUbahFoto = async (e) => {
    const file = e.target.files?.[0];
    const pemegang = fotoTarget.current;
    e.target.value = "";
    if (!file || !pemegang) return;
    const masalah = cekFoto(file);
    if (masalah) {
      showMessage("Foto Tidak Valid", masalah, "error");
      return;
    }
    try {
      const res = await pengurusApi.uploadFoto(pemegang.id, file);
      showMessage("Berhasil", res.message, "success");
      load();
    } catch (err) {
      showMessage("Gagal Mengunggah Foto", err.message, "error");
    }
  };

  const hapusFoto = async (pemegang) => {
    const ok = await showConfirm("Hapus foto?", `Foto ${pemegang.namaUser} dihapus dari halaman depan.`, "warning", "Ya, hapus", "Batal");
    if (!ok) return;
    try {
      const res = await pengurusApi.hapusFoto(pemegang.id);
      showMessage("Berhasil", res.message, "success");
      load();
    } catch (err) {
      showMessage("Gagal", err.message, "error");
    }
  };

  const kosongkan = async (slot) => {
    const ok = await showConfirm(
      "Kosongkan jabatan?",
      `${slot.pemegang.namaUser} dilepas dari ${slot.role.nama} ${areaLabel(slot.area)} dan kembali menjadi warga biasa.`,
      "warning",
      "Ya, kosongkan",
      "Batal",
    );
    if (!ok) return;
    try {
      const res = await pengurusApi.kosongkan({ roleId: slot.role.id, area: slot.area });
      showMessage("Berhasil", res.message, "success");
      load();
    } catch (err) {
      showMessage("Gagal", err.message, "error");
    }
  };

  if (!slots) return <div className="table-loading">Memuat data pengurus...</div>;

  return (
    <div className="page-stack">
      <div className="page-toolbar">
        <div>
          <h2>Pengurus RW &amp; RT</h2>
          <p>
            Tetapkan siapa yang menjabat ketua, bendahara, dan sekretaris di RW serta tiap RT. Satu jabatan satu
            orang per wilayah; pemegang lama otomatis kembali menjadi warga.
          </p>
        </div>
      </div>

      <div className="pengurus-grid">
        {perArea.map(([area, list]) => (
          <div key={area} className="content-card pengurus-card">
            <div className="db-section-header">
              <UserCog size={17} />
              <h3>{area === "RW" ? "Pengurus RW" : `Pengurus ${areaLabel(area)}`}</h3>
            </div>
            <ul className="pengurus-list">
              {list.map((s) => (
                <li key={`${s.role.id}-${s.area}`} className="pengurus-item">
                  {s.pemegang && <Avatar nama={s.pemegang.namaUser} foto={s.pemegang.foto} />}
                  <div className="pengurus-info">
                    <span className="pengurus-role">{s.role.nama}</span>
                    {s.pemegang ? (
                      <>
                        <span className="pengurus-nama">{s.pemegang.namaUser}</span>
                        <span className="pengurus-sub">{s.pemegang.username}</span>
                        {s.pemegang.kontakPublik && (
                          <span className="pengurus-sub">WA publik: {nomorLokal(s.pemegang.kontakPublik)}</span>
                        )}
                      </>
                    ) : (
                      <span className="pengurus-kosong">Belum ada pemegang</span>
                    )}
                  </div>
                  <div className="table-actions">
                    {s.pemegang && (
                      <button type="button" className="btn-icon" title={s.pemegang.foto ? "Ganti foto" : "Unggah foto"} aria-label="Ubah foto" onClick={() => pilihUbahFoto(s.pemegang)}>
                        <Camera size={16} />
                      </button>
                    )}
                    {s.pemegang && (
                      <button
                        type="button"
                        className="btn-icon"
                        title={s.pemegang.kontakPublik ? "Ubah kontak publik" : "Atur kontak publik"}
                        aria-label="Kontak publik"
                        onClick={() => setKontak({ pemegang: s.pemegang, jabatan: `${s.role.nama} ${areaLabel(s.area)}` })}
                      >
                        <MessageCircle size={16} />
                      </button>
                    )}
                    {s.pemegang?.foto && (
                      <button type="button" className="btn-icon danger" title="Hapus foto" aria-label="Hapus foto" onClick={() => hapusFoto(s.pemegang)}>
                        <ImageOff size={16} />
                      </button>
                    )}
                    <button type="button" className="btn-icon" title={s.pemegang ? "Ganti pemegang" : "Tetapkan"} aria-label="Tetapkan" onClick={() => setTetapkan(s)}>
                      <UserPlus size={16} />
                    </button>
                    {s.pemegang && (
                      <button type="button" className="btn-icon danger" title="Kosongkan jabatan" aria-label="Kosongkan" onClick={() => kosongkan(s)}>
                        <UserMinus size={16} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <input ref={fotoInput} type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" hidden onChange={submitUbahFoto} />

      {kontak && (
        <KontakModal
          pemegang={kontak.pemegang}
          jabatan={kontak.jabatan}
          onClose={() => setKontak(null)}
          onSubmit={submitKontak}
        />
      )}

      {tetapkan && <TetapkanModal slot={tetapkan} onClose={() => setTetapkan(null)} onSubmit={submitTetapkan} />}
    </div>
  );
}
