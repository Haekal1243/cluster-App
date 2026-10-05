"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileText, List, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { catatanRapatApi } from "@/lib/api";
import { areaLabel, can, scopeOf } from "@/lib/session";
import { useUser } from "@/lib/useUser";
import { showConfirm, showMessage } from "@/lib/message";
import Select from "@/components/ui/Select";
import FileDropzone from "@/components/ui/FileDropzone";
import FilterPopover, { FilterField } from "@/components/ui/FilterPopover";
import { getCurrentYm, formatTanggalPanjang as tanggal } from "@/lib/format";

// Judul biasanya ditulis "Rapat <Area> - <Topik>" (lihat seed), yang bikin redundan sama
// badge area yang udah ditampilin terpisah. Potong prefix itu kalau memang ada, selain itu
// (judul custom yang gak ikut pola) dibiarkan apa adanya.
const stripRapatPrefix = (judul) => (judul || "").replace(/^Rapat\s+.+?\s[--]\s*/i, "").trim() || judul;

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
  const isiRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setForm(
      mode === "edit" && initialData
        ? { judul: initialData.judul, isiNotulen: initialData.isiNotulen ?? "", area: initialData.area }
        : { judul: "", isiNotulen: "", area: "RW" },
    );
    setFile(null);
  }, [open, mode, initialData]);

  if (!open) return null;

  // Boleh kosongin isi notulen HANYA kalau ada file (baru dipilih, atau sudah terlampir sebelumnya
  // dan belum diganti) — samain sama aturan validasi di backend.
  const adaFile = !!file || (mode === "edit" && !!initialData?.fileNotulen);
  const isiWajib = !adaFile;

  // Sisipkan "• " di awal baris kursor berada, atau di awal baris baru — biar user gampang bikin poin
  // tanpa harus ngetik bullet manual satu-satu.
  const tambahPoin = () => {
    const el = isiRef.current;
    if (!el) return;
    const { selectionStart, selectionEnd, value } = el;
    const awalBaris = value.lastIndexOf("\n", selectionStart - 1) + 1;
    const sudahBullet = value.slice(awalBaris, awalBaris + 2) === "• ";
    const next = sudahBullet
      ? value
      : `${value.slice(0, awalBaris)}• ${value.slice(awalBaris)}`;
    setForm((p) => ({ ...p, isiNotulen: next }));
    const tambahan = sudahBullet ? 0 : 2;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(selectionStart + tambahan, selectionEnd + tambahan);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isiWajib && !form.isiNotulen.trim()) {
      showMessage("Validasi", "Isi notulen wajib diisi kalau tidak mengunggah file.", "warning");
      return;
    }
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
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
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
                <Select
                  id="area"
                  value={form.area}
                  onChange={(v) => setForm({ ...form, area: v })}
                  options={["RW", "RT_01", "RT_02", "RT_03", "RT_04"].map((a) => ({ value: a, label: areaLabel(a) }))}
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="judul">
                Judul Rapat <span className="required-star">*</span>
              </label>
              <input id="judul" className="form-control" value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} required />
            </div>
            <div className="form-group">
              <div className="catatan-isi-label-row">
                <label htmlFor="isi">
                  Isi Notulen {isiWajib && <span className="required-star">*</span>}
                  {!isiWajib && <span className="label-optional">(opsional, sudah ada file)</span>}
                </label>
                <button type="button" className="catatan-poin-btn" onClick={tambahPoin} title="Tambah poin di baris ini">
                  <List size={13} /> Poin
                </button>
              </div>
              <textarea
                ref={isiRef}
                id="isi"
                className="form-control"
                rows={9}
                value={form.isiNotulen}
                onChange={(e) => setForm({ ...form, isiNotulen: e.target.value })}
                placeholder="Peserta, agenda, pembahasan, keputusan..."
              />
            </div>
            <div className="form-group">
              <label>File Notulen</label>
              <FileDropzone
                file={file}
                onFileSelect={setFile}
                onRemove={() => setFile(null)}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                maxSizeMB={10}
                placeholder="Klik atau seret file ke sini"
                hint="PDF / DOC / DOCX / JPG / PNG · Maks. 10 MB"
                currentLabel={!file && initialData?.fileNotulen ? "File sudah terlampir (pilih baru untuk mengganti)" : undefined}
                onError={(msg) => showMessage("File Terlalu Besar", msg, "warning")}
              />
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

  const unduhPdf = async () => {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    const judulBersih = stripRapatPrefix(item.judul);
    const marginX = 16;
    let y = 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(doc.splitTextToSize(judulBersih, 178), marginX, y);
    y += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    const metaLine = [
      areaLabel(item.area),
      tanggal(item.createDate),
      item.createBy ? `oleh ${item.createBy}` : null,
    ].filter(Boolean).join("   ·   ");
    doc.text(metaLine, marginX, y);
    y += 8;
    doc.setDrawColor(220);
    doc.line(marginX, y, 194, y);
    y += 8;

    doc.setFontSize(11);
    doc.setTextColor(30);
    const isi = item.isiNotulen?.trim() || "(Tidak ada isi notulen — lihat file terlampir.)";
    doc.text(doc.splitTextToSize(isi, 178), marginX, y);

    doc.save(`Notulen - ${judulBersih} - ${tanggal(item.createDate)}.pdf`);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box catatan-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{stripRapatPrefix(item.judul)}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Tutup"><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="catatan-meta">
            <span className="rt-badge">{areaLabel(item.area)}</span>
            <span>{tanggal(item.createDate)}</span>
          </div>
          {item.isiNotulen?.trim() ? (
            <div className="review-desc-card">
              <span className="review-info-label">Isi Notulen</span>
              <p className="review-desc-text">{item.isiNotulen}</p>
            </div>
          ) : (
            <p className="field-hint">Tidak ada isi notulen — lihat file terlampir di bawah.</p>
          )}
          <div className="catatan-detail-actions">
            {item.fileNotulen && (
              <button type="button" className="btn-ipl-view" onClick={bukaFile}>
                <FileText size={14} /> Buka file notulen
              </button>
            )}
            <button type="button" className="btn-outline-neutral" onClick={unduhPdf}>
              <Download size={14} /> Download PDF
            </button>
          </div>
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

  // Filter periode rapat per bulan (opsional, kosong = semua periode) — pola draft +
  // Terapkan sama kayak filter periode di Keuangan/Tagihan/dll, tapi cuma 1 kriteria.
  const [filterDari, setFilterDari] = useState("");
  const [filterSampai, setFilterSampai] = useState("");
  const [draftDari, setDraftDari] = useState("");
  const [draftSampai, setDraftSampai] = useState("");
  const filterTanggalAktif = !!filterDari || !!filterSampai;

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
    () => items.filter((i) => {
      const matchSearch = !q || i.judul.toLowerCase().includes(q) || (i.isiNotulen || "").toLowerCase().includes(q);
      const ymRapat = i.createDate ? i.createDate.slice(0, 7) : "";
      const matchDari = !filterDari || ymRapat >= filterDari;
      const matchSampai = !filterSampai || ymRapat <= filterSampai;
      return matchSearch && matchDari && matchSampai;
    }),
    [items, q, filterDari, filterSampai],
  );

  const handleFilterOpen = () => {
    setDraftDari(filterDari);
    setDraftSampai(filterSampai);
  };
  const handleFilterApply = () => {
    setFilterDari(draftDari);
    setFilterSampai(draftSampai);
  };
  const handleFilterReset = () => {
    setFilterDari("");
    setFilterSampai("");
    setDraftDari("");
    setDraftSampai("");
  };

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

      <div className="page-toolbar-row toolbar-row-reverse-mobile">
        <div className="list-toolbar-row">
          <div className="list-search-wrap">
            <Search size={15} className="list-search-icon" />
            <input className="list-search-input" placeholder="Cari judul atau isi notulen..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {lihatSemuaArea && (
            <Select
              className="ipl-select ipl-select-sm"
              value={filterArea}
              onChange={(v) => setFilterArea(v)}
              options={[
                { value: "SEMUA", label: "Semua Wilayah" },
                ...["RW", "RT_01", "RT_02", "RT_03", "RT_04"].map((a) => ({ value: a, label: areaLabel(a) })),
              ]}
            />
          )}
          <FilterPopover
            active={filterTanggalAktif}
            onOpen={handleFilterOpen}
            onApply={handleFilterApply}
            onReset={handleFilterReset}
            hint="Kosongkan = semua periode"
          >
            <FilterField label="Periode Dari">
              <input
                type="month"
                className="ipl-input"
                value={draftDari}
                max={draftSampai || getCurrentYm()}
                onChange={(e) => setDraftDari(e.target.value)}
              />
            </FilterField>
            <FilterField label="Periode Sampai">
              <input
                type="month"
                className="ipl-input"
                value={draftSampai}
                min={draftDari || undefined}
                max={getCurrentYm()}
                onChange={(e) => setDraftSampai(e.target.value)}
              />
            </FilterField>
          </FilterPopover>
        </div>
        {bolehTambah && (
          <button type="button" className="btn-primary" onClick={() => setModal({ open: true, mode: "create", item: null })}>
            <Plus size={16} /> Tambah
          </button>
        )}
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
            <article
              key={item.id}
              className="catatan-card"
              role="button"
              tabIndex={0}
              onClick={() => setDetail(item)}
              onKeyDown={(e) => { if (e.key === "Enter") setDetail(item); }}
            >
              <div className="catatan-card-head">
                <h3>{stripRapatPrefix(item.judul)}</h3>
                <span className="rt-badge">{areaLabel(item.area)}</span>
              </div>
              <div className="catatan-card-foot">
                <span className="catatan-meta-small">
                  {tanggal(item.createDate)}
                  {item.fileNotulen ? " · ada file" : ""}
                </span>
                {(bolehTulis(user, "catatan_rapat.update", item) || bolehTulis(user, "catatan_rapat.delete", item)) && (
                  <div className="table-actions" onClick={(e) => e.stopPropagation()}>
                    {bolehTulis(user, "catatan_rapat.update", item) && (
                      <button type="button" className="btn-icon" title="Ubah" aria-label="Ubah" onClick={() => setModal({ open: true, mode: "edit", item })}>
                        <Pencil size={14} />
                      </button>
                    )}
                    {bolehTulis(user, "catatan_rapat.delete", item) && (
                      <button type="button" className="btn-icon danger" title="Hapus" aria-label="Hapus" onClick={() => handleDelete(item)}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
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
