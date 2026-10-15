"use client";

// Komponen bersama Keuangan RT/RW: badge, chart, modal kas.

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Plus,
  Search,
  Wallet,
  TrendingUp,
  TrendingDown,
  Scale,
  PiggyBank,
  Eye,
  Pencil,
  Trash2,
  Download,
  ChevronDown,
} from "lucide-react";
import { keuanganApi, openProtectedFile } from "@/lib/api";
import { areaLabel, can, isWargaView, scopeOf } from "@/lib/session";
import { useUser } from "@/lib/useUser";
import { showMessage, showConfirm } from "@/lib/message";
import FilterPopover, { FilterField } from "@/components/ui/FilterPopover";
import Pagination from "@/components/ui/Pagination";
import Select from "@/components/ui/Select";
import FileDropzone from "@/components/ui/FileDropzone";
import CurrencyInput from "@/components/ui/CurrencyInput";
import { usePagination } from "@/lib/usePagination";
import { useMediaQuery } from "@/lib/useMediaQuery";
import {
  formatRupiah,
  formatTanggalPendek as formatTanggal,
  getCurrentYm,
  formatYmPendek,
  formatYmPanjang as formatYmLengkap,
} from "@/lib/format";

// ── Helpers & opsi ────────────────────────────────────────────────────────────
export const KATEGORI_MASUK = ["Dana Sosial", "Sewa Fasilitas", "Donasi", "Lainnya"];
export const KATEGORI_KELUAR = ["Operasional", "Perawatan & Perbaikan", "Acara & Kegiatan", "Lainnya"];

export const TIPE_FILTER_OPTIONS = [
  { val: "SEMUA", label: "Semua Tipe" },
  { val: "PEMASUKAN", label: "Pemasukan" },
  { val: "PENGELUARAN", label: "Pengeluaran" },
];

export function toDateInput(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toISOString().slice(0, 10);
}

export function KasTipeBadge({ tipe }) {
  return (
    <span className={`ipl-badge ${tipe === "PEMASUKAN" ? "badge-lunas" : "badge-belum"}`}>
      {tipe === "PEMASUKAN" ? "Pemasukan" : "Pengeluaran"}
    </span>
  );
}

// Hanya transaksi kas manual (sumber "MANUAL") yang punya file bukti sendiri —
// baris agregat IPL_KAS/SETORAN adalah gabungan banyak pembayaran, tidak punya satu file.
export function getBuktiPath(t) {
  if (!t?.buktiFile) return null;
  return keuanganApi.buktiPath(t.id);
}

// ── Grafik batang grup: pemasukan vs pengeluaran per bulan ────────────────────
export function ArusKasChart({ data }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.flatMap((d) => [d.pemasukan, d.pengeluaran]), 1);
  const bar = (value, color, title) => (
    <div
      title={title}
      style={{
        width: 18,
        height: `${Math.max((value / max) * 100, 3)}%`,
        background: color,
        borderRadius: "4px 4px 2px 2px",
      }}
    />
  );
  return (
    <div style={{ display: "flex", gap: 10, overflowX: "auto", padding: "12px 4px 0" }}>
      {data.map((d) => (
        <div
          key={`${d.tahun}-${d.bulan}`}
          style={{ flex: "1 0 44px", minWidth: 44, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
        >
          <div style={{ height: 150, display: "flex", alignItems: "flex-end", gap: 4 }}>
            {bar(d.pemasukan, "#16a34a", `Pemasukan ${d.label}: ${formatRupiah(d.pemasukan)}`)}
            {bar(d.pengeluaran, "#dc2626", `Pengeluaran ${d.label}: ${formatRupiah(d.pengeluaran)}`)}
          </div>
          <span style={{ fontSize: 11, color: "#64748b" }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Modal: Catat / Ubah Transaksi ─────────────────────────────────────────────
export function KasFormModal({ initial, pilihArea = false, onClose, onSuccess }) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    tipe: initial?.tipe || "PENGELUARAN",
    kategori: initial?.kategori || "",
    nominal: initial?.nominal || "",
    tanggal: toDateInput(initial?.tanggal) || new Date().toISOString().slice(0, 10),
    keterangan: initial?.keterangan || "",
    area: initial?.area || "RW",
  });
  const [bukti, setBukti] = useState(null);
  const [loading, setLoading] = useState(false);

  const isIplKasEdit = initial?.sumber === "IPL_KAS";
  const baseKategoriOptions = form.tipe === "PEMASUKAN" ? KATEGORI_MASUK : KATEGORI_KELUAR;
  const kategoriOptions = isIplKasEdit && initial?.kategori && !baseKategoriOptions.includes(initial.kategori)
    ? [...baseKategoriOptions, initial.kategori]
    : baseKategoriOptions;

  const handleTipeChange = (tipe) => {
    setForm((f) => ({ ...f, tipe, kategori: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.kategori) {
      showMessage("Validasi", "Pilih kategori transaksi.", "warning");
      return;
    }
    if (!form.nominal || Number(form.nominal) <= 0) {
      showMessage("Validasi", "Nominal harus lebih dari 0.", "warning");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        tipe: form.tipe,
        kategori: form.kategori,
        nominal: Number(form.nominal),
        tanggal: new Date(form.tanggal).toISOString(),
        keterangan: form.keterangan || undefined,
        // Pengurus otomatis menulis ke kas wilayahnya sendiri; hanya scope ALL (admin) boleh memilih.
        ...(pilihArea ? { area: form.area } : {}),
      };
      if (bukti) payload.bukti = bukti;
      const res = isEdit
        ? await keuanganApi.update(initial.id, payload)
        : await keuanganApi.create(payload);
      showMessage("Berhasil!", res.message, "success");
      onSuccess();
      onClose();
    } catch (err) {
      showMessage("Gagal Menyimpan", err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ipl-modal-overlay" onClick={onClose}>
      <div className="ipl-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ipl-modal-header">
          <h3>{isEdit ? "Ubah Transaksi Kas" : "Catat Transaksi Kas"}</h3>
          <button className="ipl-modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="ipl-modal-body">
          {pilihArea && (
            <div className="ipl-form-group">
              <label>Wilayah kas</label>
              <Select
                value={form.area}
                onChange={(v) => setForm({ ...form, area: v })}
                className="ipl-select"
                options={["RW", "RT_01", "RT_02", "RT_03", "RT_04"].map((a) => ({ value: a, label: areaLabel(a) }))}
              />
            </div>
          )}
          <div className="ipl-form-row">
            <div className="ipl-form-group">
              <label>Tipe</label>
              <Select
                value={form.tipe}
                onChange={handleTipeChange}
                className="ipl-select"
                options={[
                  { value: "PEMASUKAN", label: "Pemasukan" },
                  { value: "PENGELUARAN", label: "Pengeluaran" },
                ]}
              />
            </div>
            <div className="ipl-form-group">
              <label>Kategori</label>
              <Select
                value={form.kategori}
                onChange={(v) => setForm({ ...form, kategori: v })}
                className="ipl-select"
                placeholder="- Pilih -"
                options={kategoriOptions.map((k) => ({ value: k, label: k }))}
              />
            </div>
          </div>
          <div className="ipl-form-row">
            <div className="ipl-form-group">
              <label>Nominal (Rp)</label>
              <CurrencyInput
                placeholder="Contoh: 500.000"
                value={form.nominal}
                onChange={(v) => setForm({ ...form, nominal: v })}
                required
              />
            </div>
            <div className="ipl-form-group">
              <label>Tanggal</label>
              <input
                type="date"
                value={form.tanggal}
                onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                className="ipl-input"
                required
              />
            </div>
          </div>
          <div className="ipl-form-group">
            <label>Keterangan <span className="label-optional">(opsional)</span></label>
            <textarea
              rows={3}
              placeholder="Contoh: Beli lampu taman blok A..."
              value={form.keterangan}
              onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
              className="ipl-textarea"
            />
          </div>
          <div className="ipl-form-group">
            <label>Bukti / Nota <span className="label-optional">(opsional, JPG/PNG/PDF)</span></label>
            <FileDropzone
              file={bukti}
              onFileSelect={setBukti}
              onRemove={() => setBukti(null)}
              accept=".jpg,.jpeg,.png,.pdf"
              maxSizeMB={10}
              placeholder="Klik atau seret file ke sini (opsional)"
              hint="JPG / PNG / PDF · Maks. 10 MB"
              onError={(msg) => showMessage("File Terlalu Besar", msg, "warning")}
            />
            {isEdit && !bukti && initial?.buktiFile && (
              <button
                type="button"
                className="portal-download-link"
                style={{ marginTop: 6, display: "inline-block" }}
                onClick={() => openProtectedFile(keuanganApi.buktiPath(initial.id))}
              >
                <Eye size={12} /> Lihat bukti saat ini
              </button>
            )}
          </div>
          <div className="ipl-modal-footer">
            <button type="button" className="btn-ipl-secondary" onClick={onClose} disabled={loading}>
              Batal
            </button>
            <button type="submit" className="btn-ipl-primary" disabled={loading}>
              {loading ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Catat Transaksi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}