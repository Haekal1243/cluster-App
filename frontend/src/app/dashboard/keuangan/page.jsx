"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Search,
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import { keuanganApi } from "@/lib/api";
import { areaLabel, can, isWargaView, scopeOf } from "@/lib/session";
import { useUser } from "@/lib/useUser";
import { showMessage, showConfirm } from "@/lib/message";
import FilterPopover, { FilterField } from "@/components/ui/FilterPopover";

// ── Helpers & opsi ────────────────────────────────────────────────────────────
const BULAN_NAMES = {
  "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr",
  "05": "Mei", "06": "Jun", "07": "Jul", "08": "Agu",
  "09": "Sep", "10": "Okt", "11": "Nov", "12": "Des",
};

const KATEGORI_MASUK = ["Dana Sosial", "Sewa Fasilitas", "Donasi", "Lainnya"];
const KATEGORI_KELUAR = ["Operasional", "Perawatan & Perbaikan", "Acara & Kegiatan", "Lainnya"];

const TIPE_FILTER_OPTIONS = [
  { val: "SEMUA", label: "Semua Tipe" },
  { val: "PEMASUKAN", label: "Pemasukan" },
  { val: "PENGELUARAN", label: "Pengeluaran" },
];

function formatRupiah(nominal) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(nominal || 0);
}

function formatTanggal(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function toDateInput(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toISOString().slice(0, 10);
}

function KasTipeBadge({ tipe }) {
  return (
    <span className={`ipl-badge ${tipe === "PEMASUKAN" ? "badge-lunas" : "badge-belum"}`}>
      {tipe === "PEMASUKAN" ? "Pemasukan" : "Pengeluaran"}
    </span>
  );
}

// ── Grafik batang grup: pemasukan vs pengeluaran per bulan ────────────────────
function ArusKasChart({ data }) {
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
function KasFormModal({ initial, pilihArea = false, onClose, onSuccess }) {
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

  const kategoriOptions = form.tipe === "PEMASUKAN" ? KATEGORI_MASUK : KATEGORI_KELUAR;

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
              <select
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
                className="ipl-select"
              >
                {["RW", "RT_01", "RT_02", "RT_03", "RT_04"].map((a) => (
                  <option key={a} value={a}>{areaLabel(a)}</option>
                ))}
              </select>
            </div>
          )}
          <div className="ipl-form-row">
            <div className="ipl-form-group">
              <label>Tipe</label>
              <select
                value={form.tipe}
                onChange={(e) => handleTipeChange(e.target.value)}
                className="ipl-select"
              >
                <option value="PEMASUKAN">Pemasukan</option>
                <option value="PENGELUARAN">Pengeluaran</option>
              </select>
            </div>
            <div className="ipl-form-group">
              <label>Kategori</label>
              <select
                value={form.kategori}
                onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                className="ipl-select"
                required
              >
                <option value="">— Pilih —</option>
                {kategoriOptions.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="ipl-form-row">
            <div className="ipl-form-group">
              <label>Nominal (Rp)</label>
              <input
                type="number"
                min="1"
                placeholder="Contoh: 500000"
                value={form.nominal}
                onChange={(e) => setForm({ ...form, nominal: e.target.value })}
                className="ipl-input"
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
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={(e) => setBukti(e.target.files?.[0] || null)}
              className="ipl-input"
            />
            {isEdit && !bukti && initial?.buktiFile && (
              <a
                href={keuanganApi.buktiUrl(initial.buktiFile)}
                target="_blank"
                rel="noopener noreferrer"
                className="portal-download-link"
                style={{ marginTop: 6, display: "inline-block" }}
              >
                <Eye size={12} /> Lihat bukti saat ini
              </a>
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

// ── Admin/Pengurus: laporan keuangan ──────────────────────────────────────────
function AdminKeuanganView({ user }) {
  const bolehTambah = can(user, "keuangan.create");
  const bolehUbah = can(user, "keuangan.update");
  const bolehHapus = can(user, "keuangan.delete");
  // Scope ALL (ketua/bendahara RW, admin) melihat RW + semua RT; scope AREA hanya wilayahnya.
  const semuaArea = scopeOf(user, "keuangan.read") === "ALL";
  const pilihAreaTulis = scopeOf(user, "keuangan.create") === "ALL";
  const getCurrentYm = () => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
  };
  const formatYmPanjang = (ym) => {
    if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return ym || "—";
    const [y, m] = ym.split("-");
    return `${BULAN_NAMES[m] || m} ${y}`;
  };
  const monthDiffInclusive = (dari, sampai) => {
    const [y1, m1] = dari.split("-").map(Number);
    const [y2, m2] = sampai.split("-").map(Number);
    return (y2 - y1) * 12 + (m2 - m1) + 1;
  };

  const [ringkasan, setRingkasan] = useState(null);
  const [riwayat, setRiwayat] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter periode (sama seperti Tagihan IPL)
  const [periodeDari, setPeriodeDari] = useState(getCurrentYm);
  const [periodeSampai, setPeriodeSampai] = useState(getCurrentYm);
  const [filterTipe, setFilterTipe] = useState("SEMUA");
  const [filterKategori, setFilterKategori] = useState("SEMUA");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [draftPeriodeDari, setDraftPeriodeDari] = useState(getCurrentYm);
  const [draftPeriodeSampai, setDraftPeriodeSampai] = useState(getCurrentYm);
  const [draftFilterTipe, setDraftFilterTipe] = useState("SEMUA");
  const [draftFilterKategori, setDraftFilterKategori] = useState("SEMUA");
  const [filterArea, setFilterArea] = useState("SEMUA");
  const [draftFilterArea, setDraftFilterArea] = useState("SEMUA");

  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const [dari, sampai] = periodeDari > periodeSampai
    ? [periodeSampai, periodeDari]
    : [periodeDari, periodeSampai];
  const rangeError = monthDiffInclusive(dari, sampai) > 12
    ? "Rentang periode maksimal 12 bulan."
    : "";

  const [draftDariN, draftSampaiN] = draftPeriodeDari > draftPeriodeSampai
    ? [draftPeriodeSampai, draftPeriodeDari]
    : [draftPeriodeDari, draftPeriodeSampai];
  const draftRangeError = draftPeriodeDari && draftPeriodeSampai &&
    monthDiffInclusive(draftDariN, draftSampaiN) > 12
    ? "Rentang periode maksimal 12 bulan."
    : "";

  const isDefaultPeriode = periodeDari === getCurrentYm() && periodeSampai === getCurrentYm();
  const periodeLabel = periodeDari === periodeSampai
    ? formatYmPanjang(periodeDari)
    : `${formatYmPanjang(periodeDari)} – ${formatYmPanjang(periodeSampai)}`;

  const kategoriOptions = [
    ...new Set(
      draftFilterTipe === "PEMASUKAN"
        ? KATEGORI_MASUK
        : draftFilterTipe === "PENGELUARAN"
          ? KATEGORI_KELUAR
          : [...KATEGORI_MASUK, ...KATEGORI_KELUAR]
    ),
  ];

  const loadData = useCallback(async () => {
    if (rangeError) return;
    setIsLoading(true);
    try {
      const [ring, riw] = await Promise.all([
        keuanganApi.getRingkasan({ dari, sampai, area: filterArea }),
        keuanganApi.getAll({ dari, sampai, tipe: filterTipe, kategori: filterKategori, search, area: filterArea }),
      ]);
      setRingkasan(ring);
      setRiwayat(riw.riwayat || []);
    } catch (err) {
      showMessage("Gagal Memuat Data", err.message, "error");
    } finally {
      setIsLoading(false);
    }
  }, [dari, sampai, rangeError, filterTipe, filterKategori, search, filterArea]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleFilterOpen = () => {
    setDraftPeriodeDari(periodeDari);
    setDraftPeriodeSampai(periodeSampai);
    setDraftFilterTipe(filterTipe);
    setDraftFilterKategori(filterKategori);
    setDraftFilterArea(filterArea);
  };
  const handleFilterApply = () => {
    if (draftRangeError) return;
    setPeriodeDari(draftPeriodeDari);
    setPeriodeSampai(draftPeriodeSampai);
    setFilterTipe(draftFilterTipe);
    setFilterKategori(draftFilterKategori);
    setFilterArea(draftFilterArea);
  };
  const handleFilterReset = () => {
    const cur = getCurrentYm();
    setPeriodeDari(cur);
    setPeriodeSampai(cur);
    setFilterTipe("SEMUA");
    setFilterKategori("SEMUA");
    setDraftPeriodeDari(cur);
    setDraftPeriodeSampai(cur);
    setDraftFilterTipe("SEMUA");
    setDraftFilterKategori("SEMUA");
    setFilterArea("SEMUA");
    setDraftFilterArea("SEMUA");
  };

  const handleDelete = async (item) => {
    const confirmed = await showConfirm(
      "Hapus Transaksi?",
      `${item.tipe === "PEMASUKAN" ? "Pemasukan" : "Pengeluaran"} ${item.kategori} sebesar ${formatRupiah(item.nominal)} akan dihapus.`,
      "warning",
      "Ya, Hapus"
    );
    if (!confirmed) return;
    try {
      const res = await keuanganApi.remove(item.id);
      showMessage("Dihapus!", res.message, "success");
      loadData();
    } catch (err) {
      showMessage("Gagal Menghapus", err.message, "error");
    }
  };

  return (
    <div className="page-stack">
      {/* ── Header ── */}
      <div className="ipl-page-header">
        <div>
          <h2 className="ipl-page-title">Keuangan Cluster</h2>
          <p className="ipl-page-subtitle">
            {rangeError
              ? "Laporan pemasukan dan pengeluaran kas cluster"
              : `Laporan kas periode ${periodeLabel}`}
          </p>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      {ringkasan && (
        <div className="ipl-summary-grid">
          <div className="ipl-summary-card tone-info">
            <div className="ipl-summary-icon"><PiggyBank size={20} /></div>
            <div className="ipl-summary-body">
              <span className="ipl-summary-label">Saldo Kas Saat Ini</span>
              <span className="ipl-summary-value">{formatRupiah(ringkasan.saldoKas)}</span>
              <span className="ipl-summary-sub">kumulatif sepanjang waktu</span>
            </div>
          </div>
          <div className="ipl-summary-card tone-success">
            <div className="ipl-summary-icon"><TrendingUp size={20} /></div>
            <div className="ipl-summary-body">
              <span className="ipl-summary-label">Pemasukan Periode</span>
              <span className="ipl-summary-value">{formatRupiah(ringkasan.totalPemasukan)}</span>
              <span className="ipl-summary-sub">{periodeLabel}</span>
            </div>
          </div>
          <div className="ipl-summary-card tone-danger">
            <div className="ipl-summary-icon"><TrendingDown size={20} /></div>
            <div className="ipl-summary-body">
              <span className="ipl-summary-label">Pengeluaran Periode</span>
              <span className="ipl-summary-value">{formatRupiah(ringkasan.totalPengeluaran)}</span>
              <span className="ipl-summary-sub">{periodeLabel}</span>
            </div>
          </div>
          <div className={`ipl-summary-card ${(ringkasan.saldoPeriode ?? 0) >= 0 ? "tone-success" : "tone-warning"}`}>
            <div className="ipl-summary-icon"><Wallet size={20} /></div>
            <div className="ipl-summary-body">
              <span className="ipl-summary-label">Selisih Periode</span>
              <span className="ipl-summary-value">{formatRupiah(ringkasan.saldoPeriode)}</span>
              <span className="ipl-summary-sub">masuk − keluar {periodeLabel}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Rincian pemasukan otomatis & per wilayah ── */}
      {ringkasan && (
        <div className="content-card keu-rincian">
          <div className="db-section-header">
            <PiggyBank size={17} />
            <h3>Sumber Pemasukan &amp; Wilayah</h3>
            <span className="db-section-sub">{periodeLabel}</span>
          </div>
          <div className="keu-rincian-grid">
            <div>
              <p className="keu-rincian-title">Pemasukan otomatis</p>
              <ul className="keu-rincian-list">
                {ringkasan.pemasukanOtomatis.kasRt > 0 || ringkasan.areas.some((a) => a !== "RW") ? (
                  <li><span>Kas RT (dari tagihan warga yang lunas)</span><strong>{formatRupiah(ringkasan.pemasukanOtomatis.kasRt)}</strong></li>
                ) : null}
                {ringkasan.areas.includes("RW") && (
                  <li><span>Setoran IPL dari RT (sudah dikonfirmasi)</span><strong>{formatRupiah(ringkasan.pemasukanOtomatis.setoranIpl)}</strong></li>
                )}
                <li><span>Kas manual (pemasukan lain)</span><strong>{formatRupiah(ringkasan.pemasukanManual)}</strong></li>
              </ul>
              {ringkasan.titipanIpl > 0 && (
                <p className="keu-rincian-note">
                  Porsi IPL {formatRupiah(ringkasan.titipanIpl)} masih dipegang RT (belum disetor / belum dikonfirmasi RW)
                  dan belum dihitung sebagai saldo kas.
                </p>
              )}
            </div>
            {ringkasan.perArea?.length > 1 && (
              <div>
                <p className="keu-rincian-title">Per wilayah</p>
                <table className="ipl-table keu-area-table">
                  <thead>
                    <tr><th>Wilayah</th><th>Masuk</th><th>Keluar</th><th>Selisih</th></tr>
                  </thead>
                  <tbody>
                    {ringkasan.perArea.map((a) => (
                      <tr key={a.area}>
                        <td><span className="rt-badge">{areaLabel(a.area)}</span></td>
                        <td>{formatRupiah(a.pemasukan)}</td>
                        <td>{formatRupiah(a.pengeluaran)}</td>
                        <td style={{ color: a.saldo >= 0 ? "#15803d" : "#dc2626" }}>{formatRupiah(a.saldo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Catat + Search + Filter ── */}
      <div className="page-toolbar-row">
        {bolehTambah && (
          <button
            className="btn-ipl-primary"
            onClick={() => { setEditItem(null); setShowForm(true); }}
          >
            <Plus size={16} /> Catat Transaksi
          </button>
        )}

        <div className="list-toolbar-row">
          <div className="list-search-wrap">
            <Search size={15} className="list-search-icon" />
            <input
              type="text"
              placeholder="Kategori / keterangan..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="list-search-input"
            />
          </div>

          <FilterPopover
            active={!isDefaultPeriode || filterTipe !== "SEMUA" || filterKategori !== "SEMUA" || filterArea !== "SEMUA"}
            onOpen={handleFilterOpen}
            onApply={handleFilterApply}
            onReset={handleFilterReset}
            applyDisabled={!!draftRangeError}
          >
            <FilterField label="Periode Dari">
              <input
                type="month"
                value={draftPeriodeDari}
                onChange={(e) => e.target.value && setDraftPeriodeDari(e.target.value)}
                className="ipl-input"
              />
            </FilterField>
            <FilterField label="Periode Sampai">
              <input
                type="month"
                value={draftPeriodeSampai}
                onChange={(e) => e.target.value && setDraftPeriodeSampai(e.target.value)}
                className="ipl-input"
              />
            </FilterField>
            {draftRangeError && (
              <p style={{ color: "#dc2626", fontSize: 12, margin: 0 }}>{draftRangeError}</p>
            )}
            <FilterField label="Tipe">
              <select
                className="ipl-select ipl-select-sm"
                value={draftFilterTipe}
                onChange={(e) => { setDraftFilterTipe(e.target.value); setDraftFilterKategori("SEMUA"); }}
              >
                {TIPE_FILTER_OPTIONS.map(({ val, label }) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Kategori">
              <select
                className="ipl-select ipl-select-sm"
                value={draftFilterKategori}
                onChange={(e) => setDraftFilterKategori(e.target.value)}
              >
                <option value="SEMUA">Semua Kategori</option>
                {kategoriOptions.map((k, i) => (
                  <option key={`filter-${i}-${k}`} value={k}>{k}</option>
                ))}
              </select>
            </FilterField>
            {semuaArea && (
              <FilterField label="Wilayah">
                <select
                  className="ipl-select ipl-select-sm"
                  value={draftFilterArea}
                  onChange={(e) => setDraftFilterArea(e.target.value)}
                >
                  <option value="SEMUA">Semua Wilayah</option>
                  {["RW", "RT_01", "RT_02", "RT_03", "RT_04"].map((a) => (
                    <option key={a} value={a}>{areaLabel(a)}</option>
                  ))}
                </select>
              </FilterField>
            )}
          </FilterPopover>
        </div>
      </div>

      {/* ── Grafik Arus Kas ── */}
      {ringkasan && (
        <div className="content-card">
          <div className="db-section-header">
            <TrendingUp size={17} />
            <h3>Arus Kas per Bulan</h3>
            <span className="db-section-sub">{periodeLabel}</span>
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#64748b", padding: "0 4px" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: "#16a34a" }} />
              Pemasukan {formatRupiah(ringkasan.totalPemasukan)}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: "#dc2626" }} />
              Pengeluaran {formatRupiah(ringkasan.totalPengeluaran)}
            </span>
          </div>
          {!ringkasan.tren || ringkasan.tren.every((d) => !d.pemasukan && !d.pengeluaran) ? (
            <p className="portal-empty-text">Belum ada arus kas pada periode ini.</p>
          ) : (
            <ArusKasChart data={ringkasan.tren} />
          )}
        </div>
      )}

      {/* ── Tabel Riwayat ── */}
      <div className="content-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="ipl-table-header">
          <span className="ipl-table-title">
            Riwayat Kas Manual — {periodeLabel}
          </span>
          <span className="ipl-table-count">{riwayat.length} data</span>
        </div>

        {isLoading ? (
          <div className="ipl-loading">
            <div className="ipl-spinner" />
            <span>Memuat data keuangan...</span>
          </div>
        ) : riwayat.length === 0 ? (
          <div className="ipl-empty">
            <Wallet size={40} strokeWidth={1.2} />
            <p>Belum ada transaksi manual untuk periode ini.</p>
          </div>
        ) : (
          <div className="ipl-table-wrapper">
            <table className="ipl-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  {semuaArea && <th>Wilayah</th>}
                  <th>Kategori</th>
                  <th>Keterangan</th>
                  <th>Tipe</th>
                  <th>Nominal</th>
                  <th>Bukti</th>
                  {(bolehUbah || bolehHapus) && <th>Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {riwayat.map((t) => (
                  <tr key={t.id}>
                    <td>{formatTanggal(t.tanggal)}</td>
                    {semuaArea && <td><span className="rt-badge">{areaLabel(t.area)}</span></td>}
                    <td>{t.kategori}</td>
                    <td>{t.keterangan || <em className="text-muted">—</em>}</td>
                    <td><KasTipeBadge tipe={t.tipe} /></td>
                    <td
                      className="ipl-nominal"
                      style={{ color: t.tipe === "PEMASUKAN" ? "#15803d" : "#dc2626" }}
                    >
                      {t.tipe === "PEMASUKAN" ? "+" : "−"}{formatRupiah(t.nominal)}
                    </td>
                    <td>
                      {t.buktiFile ? (
                        <a
                          href={keuanganApi.buktiUrl(t.buktiFile)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-ipl-view"
                        >
                          <Eye size={14} /> Lihat
                        </a>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    {(bolehUbah || bolehHapus) && (
                      <td>
                        <div className="table-actions">
                          {bolehUbah && (
                            <button
                              type="button"
                              className="btn-icon"
                              onClick={() => { setEditItem(t); setShowForm(true); }}
                              aria-label="Ubah transaksi"
                              title="Ubah transaksi"
                            >
                              <Pencil size={16} />
                            </button>
                          )}
                          {bolehHapus && (
                            <button
                              type="button"
                              className="btn-icon danger"
                              onClick={() => handleDelete(t)}
                              aria-label="Hapus transaksi"
                              title="Hapus transaksi"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {showForm && (
        <KasFormModal
          initial={editItem}
          pilihArea={pilihAreaTulis}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function KeuanganPage() {
  const { user, ready } = useUser();

  if (!ready || !user) return null;
  // Warga tidak diizinkan: DashboardShell otomatis mengarahkan ke /dashboard.
  if (isWargaView(user)) return null;

  return <AdminKeuanganView user={user} />;
}
