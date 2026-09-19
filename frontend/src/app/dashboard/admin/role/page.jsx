"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { History, Lock, Plus, RotateCcw, Save, ShieldCheck, Trash2 } from "lucide-react";
import { rbacApi } from "@/lib/api";
import { saveUser, getUser } from "@/lib/session";
import { authApi } from "@/lib/api";
import { useUser } from "@/lib/useUser";
import { showConfirm, showMessage } from "@/lib/message";

// Jangkauan data yang boleh diakses sebuah permission
const SCOPE_OPTIONS = [
  { val: "", label: "Tidak ada akses" },
  { val: "OWN", label: "Milik sendiri" },
  { val: "AREA", label: "Wilayahnya (RT / RW)" },
  { val: "ALL", label: "Seluruh RW" },
];

const MENU_LABEL = {
  warga: "Data Warga & Rumah",
  ipl: "Tagihan IPL",
  setoran: "Setoran IPL",
  keuangan: "Keuangan",
  pengaduan: "Pengaduan",
  kegiatan: "Kegiatan",
  pengumuman: "Pengumuman",
  catatan_rapat: "Catatan Rapat",
  role: "Admin: Peran & Hak Akses",
  pengurus: "Admin: Pengurus",
};

// Kode aksi di tb_AuditLog -> kalimat Indonesia untuk tabel riwayat
const AUDIT_LABEL = {
  "password.ganti": "Ganti kata sandi",
  "warga.reset_password": "Atur ulang kata sandi warga",
  "warga.hapus": "Hapus warga",
  "role.buat": "Buat peran",
  "role.ubah": "Ubah peran",
  "role.hapus": "Hapus peran",
  "role.ubah_permission": "Ubah hak akses peran",
  "pengurus.tetapkan": "Tetapkan pengurus",
  "pengurus.kosongkan": "Kosongkan jabatan",
  "setoran.konfirmasi": "Konfirmasi setoran IPL",
  "setoran.tolak": "Tolak setoran IPL",
  "kegiatan.setujui": "Setujui pengajuan kegiatan",
  "kegiatan.tolak": "Tolak pengajuan kegiatan",
  "pengumuman.setujui": "Setujui pengajuan pengumuman",
  "pengumuman.tolak": "Tolak pengajuan pengumuman",
};

const LEVEL_LABEL = { 0: "Admin", 1: "Level RW", 2: "Level RT", 3: "Level warga" };

const waktu = (d) =>
  new Date(d).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

function TambahRoleModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({ kode: "", nama: "", level: "1" });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({ kode: form.kode.trim().toUpperCase(), nama: form.nama.trim(), level: Number(form.level) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <h3>Tambah Peran</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Tutup">✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="kode">Kode peran <span className="required-star">*</span></label>
              <input id="kode" className="form-control" placeholder="Contoh: ADMIN_DKM" value={form.kode}
                onChange={(e) => setForm({ ...form, kode: e.target.value.toUpperCase() })} pattern="[A-Z][A-Z0-9_]{1,49}" required />
              <span className="field-hint">Huruf besar, angka, underscore. Tidak bisa diubah setelah dibuat.</span>
            </div>
            <div className="form-group">
              <label htmlFor="nama">Nama peran <span className="required-star">*</span></label>
              <input id="nama" className="form-control" placeholder="Contoh: Admin DKM" value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })} required />
            </div>
            <div className="form-group">
              <label htmlFor="level">Tingkat</label>
              <select id="level" className="form-control" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                <option value="1">Level RW (jabatan tingkat RW)</option>
                <option value="2">Level RT (jabatan di tiap RT)</option>
                <option value="3">Level warga (tampilan portal warga)</option>
              </select>
              <span className="field-hint">Menentukan di mana jabatan ini bisa ditetapkan pada menu Pengurus.</span>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-outline-neutral" onClick={onClose} disabled={saving}>Batal</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Menyimpan..." : "Buat Peran"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RolePermissionPage() {
  const { user } = useUser();
  const [matrix, setMatrix] = useState(null);
  const [roleId, setRoleId] = useState(null);
  const [draft, setDraft] = useState({}); // kode -> scope ("" = tidak ada)
  const [namaDraft, setNamaDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [showTambah, setShowTambah] = useState(false);
  const [audit, setAudit] = useState(null);

  const load = useCallback(async (pilihId) => {
    try {
      const m = await rbacApi.getMatrix();
      setMatrix(m);
      setRoleId((cur) => pilihId ?? cur ?? m.roles.find((r) => r.level === 2)?.id ?? m.roles[0]?.id);
    } catch (err) {
      showMessage("Gagal Memuat Data", err.message, "error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const role = useMemo(() => matrix?.roles.find((r) => r.id === roleId) ?? null, [matrix, roleId]);

  // Salin hak akses role terpilih ke draft setiap ganti role / setelah simpan
  useEffect(() => {
    if (!matrix || !role) return;
    setDraft({ ...(matrix.grants[role.id] ?? {}) });
    setNamaDraft(role.nama);
  }, [matrix, role]);

  const terkunci = role?.level === 0; // hak akses Admin tidak boleh diubah (mencegah terkunci dari sistem)

  const grouped = useMemo(() => {
    const map = new Map();
    for (const p of matrix?.permissions ?? []) {
      if (!map.has(p.menu)) map.set(p.menu, []);
      map.get(p.menu).push(p);
    }
    return [...map.entries()];
  }, [matrix]);

  const tersimpan = useMemo(() => matrix?.grants[role?.id] ?? {}, [matrix, role]);
  const berubah = useMemo(() => {
    const kodeSemua = new Set([...Object.keys(tersimpan), ...Object.keys(draft)]);
    return [...kodeSemua].some((k) => (tersimpan[k] ?? "") !== (draft[k] ?? ""));
  }, [tersimpan, draft]);
  const jumlahAktif = Object.values(draft).filter(Boolean).length;

  const setScope = (kode, scope) => setDraft((d) => ({ ...d, [kode]: scope }));

  const setSemuaMenu = (menu, scope) =>
    setDraft((d) => {
      const next = { ...d };
      for (const p of matrix.permissions.filter((x) => x.menu === menu)) next[p.kode] = scope;
      return next;
    });

  // Setelah admin mengubah matriks, muat ulang profil sendiri supaya menunya ikut menyesuaikan.
  const segarkanProfil = async () => {
    try {
      const fresh = await authApi.me();
      if (getUser()) saveUser(fresh);
    } catch {
      /* diabaikan */
    }
  };

  const simpan = async () => {
    const grants = Object.entries(draft)
      .filter(([, scope]) => scope)
      .map(([kode, scope]) => ({ kode, scope }));
    setSaving(true);
    try {
      const res = await rbacApi.setRolePermissions(role.id, grants);
      if (namaDraft.trim() && namaDraft.trim() !== role.nama) {
        await rbacApi.updateRole(role.id, { nama: namaDraft.trim() });
      }
      showMessage("Tersimpan", res.message, "success");
      await load(role.id);
      segarkanProfil();
    } catch (err) {
      showMessage("Gagal Menyimpan", err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const namaBerubah = role && namaDraft.trim() && namaDraft.trim() !== role.nama;

  const tambahRole = async (payload) => {
    try {
      const res = await rbacApi.createRole(payload);
      showMessage("Berhasil", res.message, "success");
      setShowTambah(false);
      await load(res.data.id);
    } catch (err) {
      showMessage("Gagal Membuat Peran", err.message, "error");
    }
  };

  const hapusRole = async () => {
    const ok = await showConfirm("Hapus peran?", `Peran "${role.nama}" akan dihapus beserta hak aksesnya.`, "warning", "Ya, hapus", "Batal");
    if (!ok) return;
    try {
      await rbacApi.removeRole(role.id);
      showMessage("Berhasil", "Peran dihapus.", "success");
      setRoleId(null);
      await load();
    } catch (err) {
      showMessage("Gagal Menghapus", err.message, "error");
    }
  };

  const bukaAudit = async () => {
    try {
      setAudit(await rbacApi.getAudit(60));
    } catch (err) {
      showMessage("Gagal Memuat Riwayat", err.message, "error");
    }
  };

  if (!user || !matrix) return <div className="table-loading">Memuat hak akses...</div>;

  return (
    <div className="page-stack">
      <div className="page-toolbar">
        <div>
          <h2>Peran &amp; Hak Akses</h2>
          <p>Atur akses tiap peran ke menu dan aksinya. Seluruhnya tersimpan di basis data dan berlaku langsung, tanpa perlu memasang ulang aplikasi.</p>
        </div>
      </div>

      <div className="rbac-layout">
        {/* ── Daftar role ── */}
        <aside className="content-card rbac-roles">
          <div className="db-section-header">
            <ShieldCheck size={17} />
            <h3>Peran</h3>
          </div>
          <ul className="rbac-role-list">
            {matrix.roles.map((r) => (
              <li key={r.id}>
                <button type="button" className={`rbac-role-item ${r.id === roleId ? "is-active" : ""}`} onClick={() => setRoleId(r.id)}>
                  <span className="rbac-role-name">{r.nama}</span>
                  <span className="rbac-role-meta">
                    {LEVEL_LABEL[r.level]} · {r._count.users} akun · {r._count.permissions} izin
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="btn-outline-neutral rbac-add" onClick={() => setShowTambah(true)}>
            <Plus size={14} /> Tambah Peran
          </button>
        </aside>

        {/* ── Editor hak akses ── */}
        <section className="rbac-editor">
          {role && (
            <>
              <div className="content-card rbac-role-head">
                <div className="rbac-role-title">
                  <input
                    className="form-control rbac-nama-input"
                    value={namaDraft}
                    onChange={(e) => setNamaDraft(e.target.value)}
                    aria-label="Nama peran"
                    disabled={terkunci}
                  />
                  <span className="rbac-kode">{role.kode}{role.isSystem ? " · bawaan" : ""}</span>
                </div>
                <div className="rbac-role-actions">
                  {!role.isSystem && (
                    <button type="button" className="btn-outline-neutral danger-text" onClick={hapusRole}>
                      <Trash2 size={14} /> Hapus Peran
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-outline-neutral"
                    onClick={() => { setDraft({ ...tersimpan }); setNamaDraft(role.nama); }}
                    disabled={terkunci || (!berubah && !namaBerubah)}
                  >
                    <RotateCcw size={14} /> Batalkan
                  </button>
                  <button type="button" className="btn-primary" onClick={simpan} disabled={terkunci || saving || (!berubah && !namaBerubah)}>
                    <Save size={14} /> {saving ? "Menyimpan..." : "Simpan Hak Akses"}
                  </button>
                </div>
              </div>

              {terkunci && (
                <div className="rbac-lock-note">
                  <Lock size={15} /> Hak akses Admin dikunci agar sistem tidak bisa terkunci dari pengelolanya.
                </div>
              )}

              <div className="rbac-legend">
                <span><b>Milik sendiri</b>: hanya data warga itu sendiri</span>
                <span><b>Wilayahnya</b>: data RT (atau RW) tempat jabatannya</span>
                <span><b>Seluruh RW</b>: data semua RT</span>
                <span className="rbac-count">{jumlahAktif} dari {matrix.permissions.length} izin aktif</span>
              </div>

              {grouped.map(([menu, perms]) => (
                <div key={menu} className="content-card rbac-menu">
                  <div className="rbac-menu-head">
                    <h4>{MENU_LABEL[menu] ?? menu}</h4>
                    {!terkunci && (
                      <div className="rbac-quick">
                        <button type="button" onClick={() => setSemuaMenu(menu, "")}>Kosongkan</button>
                        <button type="button" onClick={() => setSemuaMenu(menu, "AREA")}>Semua: wilayah</button>
                        <button type="button" onClick={() => setSemuaMenu(menu, "ALL")}>Semua: seluruh RW</button>
                      </div>
                    )}
                  </div>
                  <table className="rbac-table">
                    <tbody>
                      {perms.map((p) => {
                        const nilai = draft[p.kode] ?? "";
                        const beda = (tersimpan[p.kode] ?? "") !== nilai;
                        return (
                          <tr key={p.id} className={beda ? "is-changed" : ""}>
                            <td>
                              <span className="rbac-perm-name">{p.keterangan || p.kode}</span>
                              <code className="rbac-perm-kode">{p.kode}</code>
                            </td>
                            <td className="rbac-perm-scope">
                              <select
                                className={`ipl-select ipl-select-sm rbac-scope scope-${nilai || "none"}`}
                                value={nilai}
                                disabled={terkunci}
                                onChange={(e) => setScope(p.kode, e.target.value)}
                                aria-label={`Akses ${p.kode}`}
                              >
                                {SCOPE_OPTIONS.map((o) => (
                                  <option key={o.val} value={o.val}>{o.label}</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </>
          )}
        </section>
      </div>

      {/* ── Riwayat perubahan ── */}
      <div className="content-card">
        <div className="db-section-header">
          <History size={17} />
          <h3>Riwayat Aksi Sensitif</h3>
          <button type="button" className="btn-outline-neutral" style={{ marginLeft: "auto" }} onClick={bukaAudit}>
            {audit ? "Segarkan" : "Tampilkan"}
          </button>
        </div>
        {audit && (
          <div className="ipl-table-wrapper">
            <table className="ipl-table">
              <thead>
                <tr><th>Waktu</th><th>Pelaku</th><th>Aksi</th><th>Keterangan</th></tr>
              </thead>
              <tbody>
                {audit.length === 0 && (
                  <tr><td colSpan={4} className="text-muted">Belum ada catatan.</td></tr>
                )}
                {audit.map((a) => (
                  <tr key={a.id}>
                    <td>{waktu(a.createdAt)}</td>
                    <td>{a.pelaku || "—"}</td>
                    <td>{AUDIT_LABEL[a.aksi] ?? a.aksi}</td>
                    <td>{a.keterangan || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showTambah && <TambahRoleModal onClose={() => setShowTambah(false)} onSubmit={tambahRole} />}
    </div>
  );
}
