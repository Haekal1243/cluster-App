"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Pencil, Plus, Search, Trash2, X, Eye } from "lucide-react";
import { catatanRapatApi } from "@/lib/api";
import { areaLabel, can, scopeOf } from "@/lib/session";
import { useUser } from "@/lib/useUser";
import { showConfirm, showMessage } from "@/lib/message";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const tanggal = (d) =>
  d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }) : "-";

/** Boleh mengubah/menghapus? Scope ALL = semua; AREA = hanya notulen wilayahnya. */
function bolehTulis(user, kode, item) {
  const scope = scopeOf(user, kode);
  if (scope === "ALL") return true;
  if (scope === "AREA") return !!user?.area && item.area === user.area;
  return false;
}

function CatatanFormModal({ open, mode, initialData, areaOtomatis, pilihArea, onClose, onSubmit }) {
  const [form, setForm] = useState({ judul: "", isiNotulen: "", area: "RW" });
  const [file, setFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      mode === "edit" && initialData
        ? { judul: initialData.judul, isiNotulen: initialData.isiNotulen, area: initialData.area }
        : { judul: "", isiNotulen: "", area: "RW" },
    );
    setFile(null);
  }, [open, mode, initialData]);

  if (!open) return null;

  const handleFile = (e) => {
    const f = e.target.files?.[0] ?? null;
    if (f && f.size > MAX_FILE_SIZE) {
      showMessage("File Terlalu Besar", "Ukuran file maksimal 10 MB.", "warning");
      e.target.value = "";
      return setFile(null);
    }
    setFile(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSubmit({
        judul: form.judul.trim(),
        isiNotulen: form.isiNotulen,
        ...(pilihArea ? { area: form.area } : {}),
        file,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <h3>{mode === "edit" ? "Ubah Catatan Rapat" : "Tambah Catatan Rapat"}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="catatan-area-info">
              Notulen ini otomatis tersimpan di wilayah{" "}
              <strong>{areaLabel(mode === "edit" ? initialData?.area : areaOtomatis)}</strong> sesuai jabatan Anda dan
              hanya terlihat pengurus wilayah tersebut.
            </div>

            {pilihArea && (
              <div className="form-group">
                <label htmlFor="area">Wilayah</label>
                <select id="area" className="form-control" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}>
                  {["RW", "RT_01", "RT_02", "RT_03", "RT_04"].map((a) => (
                    <option key={a} value={a}>{areaLabel(a)}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="judul">
                Judul Rapat <span className="required-star">*</span>
              </label>
              <input id="judul" className="form-control" value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} required />
            </div>
            <div className="form-group">
              <label htmlFor="isi">
                Isi Notulen <span className="required-star">*</span>
              </label>
              <textarea
                id="isi"
                className="form-control"
                rows={9}
                value={form.isiNotulen}
                onChange={(e) => setForm({ ...form, isiNotulen: e.target.value })}
                placeholder="Peserta, agenda, pembahasan, keputusan..."
                required
              />
            </div>
            <div className="form-group">
              <label>File Notulen</label>
              <div className="file-input-wrapper">
                <label className="file-input-label">
                  Pilih File
                  <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleFile} />
                </label>
                <span className="file-current">
                  {file ? file.name : initialData?.fileNotulen ? "File sudah terlampir (pilih baru untuk mengganti)" : "Belum ada file"}
                </span>
              </div>
              <span className="field-hint">PDF / DOC / DOCX / JPG / PNG · Maks. 10 MB</span>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-outline-neutral" onClick={onClose} disabled={isSaving}>Batal</button>
            <button type="submit" className="btn-primary" disabled={isSaving}>{isSaving ? "Menyimpan..." : "Simpan"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DetailModal({ item, onClose }) {
  if (!item) return null;
  const bukaFile = async () => {
    try {
      await catatanRapatApi.openFile(item.id);
    } catch (err) {
      showMessage("Gagal Membuka File", err.message, "error");
    }
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <h3>{item.judul}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Tutup"><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="catatan-meta">
            <span className="rt-badge">{areaLabel(item.area)}</span>
            <span>{tanggal(item.createDate)}</span>
            {item.createBy && <span>oleh {item.createBy}</span>}
          </div>
          <div className="catatan-isi">{item.isiNotulen}</div>
          {item.fileNotulen && (
            <button type="button" className="btn-ipl-view" onClick={bukaFile} style={{ marginTop: 12 }}>
              <FileText size={14} /> Buka file notulen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CatatanRapatPage() {
  const { user, ready } = useUser();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterArea, setFilterArea] = useState("SEMUA");
  const [modal, setModal] = useState({ open: false, mode: "create", item: null });
  const [detail, setDetail] = useState(null);

  const bolehTambah = can(user, "catatan_rapat.create");
  const lihatSemuaArea = scopeOf(user, "catatan_rapat.read") === "ALL";
  const pilihAreaTulis = scopeOf(user, "catatan_rapat.create") === "ALL";

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await catatanRapatApi.getAll({ area: lihatSemuaArea ? filterArea : undefined });
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      showMessage("Gagal Memuat Data", error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (ready && user) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user?.id, filterArea]);

  const q = search.trim().toLowerCase();
  const filtered = useMemo(
    () => items.filter((i) => !q || i.judul.toLowerCase().includes(q) || i.isiNotulen.toLowerCase().includes(q)),
    [items, q],
  );

  const handleSubmit = async (payload) => {
    try {
      if (modal.mode === "edit" && modal.item) {
        await catatanRapatApi.update(modal.item.id, payload);
        showMessage("Berhasil", "Catatan rapat berhasil diperbarui.", "success");
      } else {
        await catatanRapatApi.create(payload);
        showMessage("Berhasil", "Catatan rapat berhasil disimpan.", "success");
      }
      setModal({ open: false, mode: "create", item: null });
      loadData();
    } catch (error) {
      showMessage("Gagal Menyimpan", error.message, "error");
    }
  };

  const handleDelete = async (item) => {
    const ok = await showConfirm("Hapus catatan rapat?", `"${item.judul}" akan dihapus.`, "warning", "Ya, hapus", "Batal");
    if (!ok) return;
    try {
      await catatanRapatApi.remove(item.id);
      showMessage("Berhasil", "Catatan rapat berhasil dihapus.", "success");
      loadData();
    } catch (error) {
      showMessage("Gagal Menghapus", error.message, "error");
    }
  };

  if (!ready || !user) return null;

  return (
    <div className="page-stack">
      <div className="page-toolbar">
        <div>
          <h2>Catatan Rapat</h2>
          <p>
            Notulen rapat {user.area ? areaLabel(user.area) : "seluruh wilayah"}. Notulen RW dan RT bersifat
            terpisah dan tidak saling terlihat.
          </p>
        </div>
      </div>

      <div className="page-toolbar-row">
        {bolehTambah && (
          <button type="button" className="btn-primary" onClick={() => setModal({ open: true, mode: "create", item: null })}>
            <Plus size={16} /> Tambah Catatan
          </button>
        )}
        <div className="list-toolbar-row">
          <div className="list-search-wrap">
            <Search size={15} className="list-search-icon" />
            <input className="list-search-input" placeholder="Cari judul atau isi notulen..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {lihatSemuaArea && (
            <select className="ipl-select ipl-select-sm" value={filterArea} onChange={(e) => setFilterArea(e.target.value)}>
              <option value="SEMUA">Semua Wilayah</option>
              {["RW", "RT_01", "RT_02", "RT_03", "RT_04"].map((a) => (
                <option key={a} value={a}>{areaLabel(a)}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {isLoading && <div className="table-loading">Memuat catatan rapat...</div>}
      {!isLoading && filtered.length === 0 && (
        <div className="table-card">
          <div className="table-empty">{items.length === 0 ? "Belum ada catatan rapat." : "Tidak ada catatan yang cocok."}</div>
        </div>
      )}

      <div className="catatan-list">
        {!isLoading &&
          filtered.map((item) => (
            <article key={item.id} className="catatan-card">
              <div className="catatan-card-head">
                <h3>{item.judul}</h3>
                <span className="rt-badge">{areaLabel(item.area)}</span>
              </div>
              <p className="catatan-excerpt">{item.isiNotulen}</p>
              <div className="catatan-card-foot">
                <span className="catatan-meta-small">
                  {tanggal(item.createDate)}
                  {item.createBy ? ` · ${item.createBy}` : ""}
                  {item.fileNotulen ? " · ada file" : ""}
                </span>
                <div className="table-actions">
                  <button type="button" className="btn-icon" title="Baca" aria-label="Baca" onClick={() => setDetail(item)}>
                    <Eye size={16} />
                  </button>
                  {bolehTulis(user, "catatan_rapat.update", item) && (
                    <button type="button" className="btn-icon" title="Ubah" aria-label="Ubah" onClick={() => setModal({ open: true, mode: "edit", item })}>
                      <Pencil size={16} />
                    </button>
                  )}
                  {bolehTulis(user, "catatan_rapat.delete", item) && (
                    <button type="button" className="btn-icon danger" title="Hapus" aria-label="Hapus" onClick={() => handleDelete(item)}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
      </div>

      <CatatanFormModal
        open={modal.open}
        mode={modal.mode}
        initialData={modal.item}
        areaOtomatis={user.area || "RW"}
        pilihArea={pilihAreaTulis}
        onClose={() => setModal({ open: false, mode: "create", item: null })}
        onSubmit={handleSubmit}
      />
      <DetailModal item={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
