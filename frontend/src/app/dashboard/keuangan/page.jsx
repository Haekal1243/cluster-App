"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Plus,
  Search,
  Calendar,
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  RefreshCw,
  Eye,
  Pencil,
  Trash2,
  ReceiptText,
} from "lucide-react";
import { keuanganApi } from "@/lib/api";
import { showMessage, showConfirm } from "@/lib/message";

// ── Helpers & opsi ────────────────────────────────────────────────────────────
const BULAN_NAMES = {
  "01": "Januari", "02": "Februari", "03": "Maret", "04": "April",
  "05": "Mei", "06": "Juni", "07": "Juli", "08": "Agustus",
  "09": "September", "10": "Oktober", "11": "November", "12": "Desember",
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

// ── Modal: Catat / Ubah Transaksi ─────────────────────────────────────────────
function KasFormModal({ initial, user, onClose, onSuccess }) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    tipe: initial?.tipe || "PENGELUARAN",
    kategori: initial?.kategori || "",
    nominal: initial?.nominal || "",
    tanggal: toDateInput(initial?.tanggal) || new Date().toISOString().slice(0, 10),
    keterangan: initial?.keterangan || "",
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
        createBy: user?.nama || user?.name || undefined,
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

  // Filter periode (sama seperti dashboard & tagihan IPL)
  const [periodeDari, setPeriodeDari] = useState(getCurrentYm);
  const [periodeSampai, setPeriodeSampai] = useState(getCurrentYm);
  const [draftDari, setDraftDari] = useState(getCurrentYm);
  const [draftSampai, setDraftSampai] = useState(getCurrentYm);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef(null);

  // Filter tabel
  const [filterTipe, setFilterTipe] = useState("SEMUA");
  const [filterKategori, setFilterKategori] = useState("SEMUA");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const [dari, sampai] = periodeDari > periodeSampai
    ? [periodeSampai, periodeDari]
    : [periodeDari, periodeSampai];
  const rangeError = monthDiffInclusive(dari, sampai) > 12
    ? "Rentang periode maksimal 12 bulan."
    : "";
  const [draftDariN, draftSampaiN] = draftDari > draftSampai
    ? [draftSampai, draftDari]
    : [draftDari, draftSampai];
  const draftError = draftDari && draftSampai && monthDiffInclusive(draftDariN, draftSampaiN) > 12
    ? "Rentang periode maksimal 12 bulan."
    : "";

  const isDefaultPeriode = periodeDari === getCurrentYm() && periodeSampai === getCurrentYm();
  const periodeLabel = periodeDari === periodeSampai
    ? formatYmPanjang(periodeDari)
    : `${formatYmPanjang(periodeDari)} – ${formatYmPanjang(periodeSampai)}`;

  const kategoriOptions = [
    ...new Set(
      filterTipe === "PEMASUKAN"
        ? KATEGORI_MASUK
        : filterTipe === "PENGELUARAN"
          ? KATEGORI_KELUAR
          : [...KATEGORI_MASUK, ...KATEGORI_KELUAR]
    ),
  ];

  useEffect(() => {
    if (!filterOpen) return;
    const onPointerDown = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setFilterOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [filterOpen]);

  const loadData = useCallback(async () => {
    if (rangeError) return;
    setIsLoading(true);
    try {
      const [ring, riw] = await Promise.all([
        keuanganApi.getRingkasan({ dari, sampai }),
        keuanganApi.getAll({ dari, sampai, tipe: filterTipe, kategori: filterKategori, search }),
      ]);
      setRingkasan(ring);
      setRiwayat(riw.riwayat || []);
    } catch (err) {
      showMessage("Gagal Memuat Data", err.message, "error");
    } finally {
      setIsLoading(false);
    }
  }, [dari, sampai, rangeError, filterTipe, filterKategori, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const openFilter = () => {
    setDraftDari(periodeDari);
    setDraftSampai(periodeSampai);
    setFilterOpen(true);
  };

  const applyFilter = () => {
    if (!draftDari || !draftSampai || draftError) return;
    setPeriodeDari(draftDari);
    setPeriodeSampai(draftSampai);
    setFilterOpen(false);
  };

  const handleResetPeriode = () => {
    const cur = getCurrentYm();
    setPeriodeDari(cur);
    setPeriodeSampai(cur);
    setDraftDari(cur);
    setDraftSampai(cur);
    setFilterOpen(false);
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

  const perKategoriMasuk = ringkasan?.perKategori?.PEMASUKAN || {};
  const perKategoriKeluar = ringkasan?.perKategori?.PENGELUARAN || {};

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
        <button
          className="btn-ipl-primary"
          onClick={() => { setEditItem(null); setShowForm(true); }}
        >
          <Plus size={16} /> Catat Transaksi
        </button>
      </div>

      {/* ── Info IPL otomatis ── */}
      <div className="ipl-dashboard-alert" style={{ textDecoration: "none", cursor: "default" }}>
        <ReceiptText size={18} />
        <span>
          Pemasukan IPL tercatat <strong>otomatis</strong> dari tagihan berstatus Lunas
          — cukup catat pemasukan lain dan seluruh pengeluaran di sini.
        </span>
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
              <span className="ipl-summary-sub">
                IPL {formatRupiah(ringkasan.pemasukanIpl?.total)} · Manual {formatRupiah(ringkasan.pemasukanManual)}
              </span>
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

      {/* ── Rincian per Kategori ── */}
      {ringkasan && (
        <div className="db-bottom-row">
          <div className="content-card">
            <div className="db-section-header">
              <TrendingUp size={17} />
              <h3>Pemasukan per Kategori</h3>
              <span className="db-section-sub">{periodeLabel}</span>
            </div>
            {Object.keys(perKategoriMasuk).length === 0 ? (
              <p className="portal-empty-text">Belum ada pemasukan pada periode ini.</p>
            ) : (
              <ul className="portal-pengumuman-list">
                {Object.entries(perKategoriMasuk).map(([kat, total]) => (
                  <li key={kat} className="portal-pengumuman-item">
                    <div style={{ flex: 1 }}>
                      <p className="portal-peng-judul">
                        {kat}
                        {kat === "IPL" && (
                          <span className="db-section-sub" style={{ marginLeft: 6 }}>otomatis</span>
                        )}
                      </p>
                    </div>
                    <span className="db-recent-nominal">{formatRupiah(total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="content-card">
            <div className="db-section-header">
              <TrendingDown size={17} />
              <h3>Pengeluaran per Kategori</h3>
              <span className="db-section-sub">{periodeLabel}</span>
            </div>
            {Object.keys(perKategoriKeluar).length === 0 ? (
              <p className="portal-empty-text">Belum ada pengeluaran pada periode ini.</p>
            ) : (
              <ul className="portal-pengumuman-list">
                {Object.entries(perKategoriKeluar).map(([kat, total]) => (
                  <li key={kat} className="portal-pengumuman-item">
                    <div style={{ flex: 1 }}>
                      <p className="portal-peng-judul">{kat}</p>
                    </div>
                    <span className="db-recent-nominal">{formatRupiah(total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ── Filter Bar ── */}
      <div className="ipl-filter-bar">
        <div className="ipl-filter-group">
          <label>Periode</label>
          <div ref={filterRef} style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => (filterOpen ? setFilterOpen(false) : openFilter())}
              aria-haspopup="dialog"
              aria-expanded={filterOpen}
              aria-pressed={!isDefaultPeriode}
              title={isDefaultPeriode ? "Filter periode" : `Periode: ${periodeLabel} — klik untuk ubah`}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "7px 14px", borderRadius: 999, cursor: "pointer",
                background: isDefaultPeriode ? "#fff" : "#2563eb",
                border: `1px solid ${isDefaultPeriode ? "#e2e8f0" : "#2563eb"}`,
                boxShadow: filterOpen ? "0 0 0 3px rgba(147,197,253,.35)" : "none",
                fontSize: 13, fontWeight: 600,
                color: isDefaultPeriode ? "#334155" : "#fff",
                whiteSpace: "nowrap",
                transition: "background .15s ease, border-color .15s ease, color .15s ease",
              }}
            >
              <Calendar size={15} />
              <span>{isDefaultPeriode ? "Filter periode" : periodeLabel}</span>
            </button>
            {filterOpen && (
              <div
                role="dialog"
                aria-label="Filter periode"
                style={{
                  position: "absolute", left: 0, top: "calc(100% + 8px)", zIndex: 30,
                  width: 260, background: "#fff", border: "1px solid #e2e8f0",
                  borderRadius: 12, boxShadow: "0 12px 32px rgba(15,23,42,.12)",
                  padding: 14, display: "flex", flexDirection: "column", gap: 10,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label htmlFor="periode-dari" style={{ fontSize: 12, fontWeight: 600, opacity: 0.7 }}>
                    Dari
                  </label>
                  <input
                    id="periode-dari"
                    type="month"
                    value={draftDari}
                    onChange={(e) => e.target.value && setDraftDari(e.target.value)}
                    style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, width: "100%" }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label htmlFor="periode-sampai" style={{ fontSize: 12, fontWeight: 600, opacity: 0.7 }}>
                    Sampai
                  </label>
                  <input
                    id="periode-sampai"
                    type="month"
                    value={draftSampai}
                    onChange={(e) => e.target.value && setDraftSampai(e.target.value)}
                    style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, width: "100%" }}
                  />
                </div>
                {draftError && (
                  <p style={{ color: "#dc2626", fontSize: 12, margin: 0 }}>{draftError}</p>
                )}
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
                  {!isDefaultPeriode && (
                    <button
                      type="button"
                      onClick={handleResetPeriode}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#64748b" }}
                    >
                      Reset
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={applyFilter}
                    disabled={!!draftError}
                    style={{
                      background: draftError ? "#cbd5e1" : "#2563eb", color: "#fff",
                      border: "none", borderRadius: 8, padding: "8px 16px",
                      fontSize: 13, fontWeight: 600, cursor: draftError ? "not-allowed" : "pointer",
                    }}
                  >
                    Terapkan
                  </button>
                </div>
                <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>
                  Maksimal 12 bulan
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="ipl-filter-group">
          <label>Tipe</label>
          <select
            className="ipl-select ipl-select-sm"
            value={filterTipe}
            onChange={(e) => { setFilterTipe(e.target.value); setFilterKategori("SEMUA"); }}
          >
            {TIPE_FILTER_OPTIONS.map(({ val, label }) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
        <div className="ipl-filter-group">
          <label>Kategori</label>
          <select
            className="ipl-select ipl-select-sm"
            value={filterKategori}
            onChange={(e) => setFilterKategori(e.target.value)}
          >
            <option value="SEMUA">Semua Kategori</option>
            {kategoriOptions.map((k, i) => (
              <option key={`filter-${i}-${k}`} value={k}>{k}</option>
            ))}
          </select>
        </div>
        <div className="ipl-filter-group ipl-filter-search">
          <label>Cari</label>
          <div className="ipl-search-wrapper">
            <Search size={15} className="ipl-search-icon" />
            <input
              type="text"
              placeholder="Kategori / keterangan..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="ipl-input ipl-input-sm"
            />
          </div>
        </div>
        <button className="btn-ipl-icon" onClick={loadData} title="Refresh data">
          <RefreshCw size={16} />
        </button>
      </div>

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
            <button className="btn-ipl-primary" onClick={() => { setEditItem(null); setShowForm(true); }}>
              <Plus size={15} /> Catat Sekarang
            </button>
          </div>
        ) : (
          <div className="ipl-table-wrapper">
            <table className="ipl-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Kategori</th>
                  <th>Keterangan</th>
                  <th>Tipe</th>
                  <th>Nominal</th>
                  <th>Bukti</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {riwayat.map((t) => (
                  <tr key={t.id}>
                    <td>{formatTanggal(t.tanggal)}</td>
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
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="btn-ipl-review"
                          onClick={() => { setEditItem(t); setShowForm(true); }}
                          title="Ubah transaksi"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="btn-ipl-danger"
                          onClick={() => handleDelete(t)}
                          title="Hapus transaksi"
                          style={{ display: "inline-flex", alignItems: "center", padding: "6px 10px", borderRadius: 8 }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
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
          user={user}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function KeuanganPage() {
  const [user, setUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      setUser(raw ? JSON.parse(raw) : null);
    } catch {
      setUser(null);
    } finally {
      setIsCheckingAuth(false);
    }
  }, []);

  if (isCheckingAuth) return null;
  // Warga tidak diizinkan: DashboardShell otomatis mengarahkan ke /dashboard.
  if (user?.role === "WARGA") return null;

  return <AdminKeuanganView user={user} />;
}
