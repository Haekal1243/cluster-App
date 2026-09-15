"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  Wallet,
  TrendingUp,
  FileX,
  CreditCard,
  Home,
  Upload,
} from "lucide-react";
import { iplApi, portalApi } from "@/lib/api";
import { showMessage, showConfirm } from "@/lib/message";
import FilterPopover, { FilterField } from "@/components/ui/FilterPopover";
import BuktiUploadModal from "@/components/portal/BuktiUploadModal";

// ── Helpers ───────────────────────────────────────────────────────────────────
const BULAN_NAMES = {
  "01": "Januari", "02": "Februari", "03": "Maret", "04": "April",
  "05": "Mei", "06": "Juni", "07": "Juli", "08": "Agustus",
  "09": "September", "10": "Oktober", "11": "November", "12": "Desember",
};

const BULAN_OPTIONS = Object.entries(BULAN_NAMES).map(([val, label]) => ({ val, label }));
const currentYear = new Date().getFullYear();
const TAHUN_OPTIONS = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

const STATUS_FILTER_OPTIONS = [
  { val: "SEMUA", label: "Semua Status" },
  { val: "BELUM_LUNAS", label: "Belum Lunas" },
  { val: "MENUNGGU_KONFIRMASI", label: "Menunggu Konfirmasi" },
  { val: "LUNAS", label: "Lunas" },
];

function formatRupiah(nominal) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(nominal);
}

function formatTanggal(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function AdminStatusBadge({ status }) {
  const map = {
    LUNAS: { label: "Lunas", cls: "badge-lunas" },
    BELUM_LUNAS: { label: "Belum Lunas", cls: "badge-belum" },
    MENUNGGU_KONFIRMASI: { label: "Menunggu Konfirmasi", cls: "badge-menunggu" },
  };
  const { label, cls } = map[status] || { label: status, cls: "" };
  return <span className={`ipl-badge ${cls}`}>{label}</span>;
}

// ── Modal: Generate Tagihan ────────────────────────────────────────────────────
function GenerateModal({ onClose, onSuccess }) {
  const now = new Date();
  const [form, setForm] = useState({
    bulanPeriode: String(now.getMonth() + 1).padStart(2, "0"),
    tahunPeriode: String(now.getFullYear()),
    nominal: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nominal || Number(form.nominal) <= 0) {
      showMessage("Validasi", "Nominal harus lebih dari 0.", "warning");
      return;
    }
    const confirmed = await showConfirm(
      "Buat Tagihan?",
      `Akan membuat tagihan IPL periode ${BULAN_NAMES[form.bulanPeriode]} ${form.tahunPeriode} sebesar ${formatRupiah(form.nominal)} untuk semua rumah aktif.`,
      "question",
      "Ya, Buat!"
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await iplApi.generate({ ...form, nominal: Number(form.nominal) });
      showMessage("Berhasil!", res.message, "success");
      onSuccess();
      onClose();
    } catch (err) {
      showMessage("Gagal Membuat Tagihan", err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ipl-modal-overlay" onClick={onClose}>
      <div className="ipl-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ipl-modal-header">
          <h3>Buat Tagihan IPL Periode Baru</h3>
          <button className="ipl-modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="ipl-modal-body">
          <div className="ipl-form-row">
            <div className="ipl-form-group">
              <label>Bulan</label>
              <select
                value={form.bulanPeriode}
                onChange={(e) => setForm({ ...form, bulanPeriode: e.target.value })}
                className="ipl-select"
              >
                {BULAN_OPTIONS.map(({ val, label }) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div className="ipl-form-group">
              <label>Tahun</label>
              <select
                value={form.tahunPeriode}
                onChange={(e) => setForm({ ...form, tahunPeriode: e.target.value })}
                className="ipl-select"
              >
                {TAHUN_OPTIONS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="ipl-form-group">
            <label>Nominal IPL (Rp)</label>
            <input
              type="number"
              min="1"
              placeholder="Contoh: 150000"
              value={form.nominal}
              onChange={(e) => setForm({ ...form, nominal: e.target.value })}
              className="ipl-input"
              required
            />
          </div>
          <div className="ipl-modal-footer">
            <button type="button" className="btn-ipl-secondary" onClick={onClose} disabled={loading}>
              Batal
            </button>
            <button type="submit" className="btn-ipl-primary" disabled={loading}>
              {loading ? "Memproses..." : "Buat Tagihan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal: Review Bukti Pembayaran ────────────────────────────────────────────
function ReviewModal({ tagihan, onClose, onSuccess, buktiBaseUrl }) {
  const [catatan, setCatatan] = useState("");
  const [loading, setLoading] = useState(false);
  const pembayaran = tagihan?.pembayaran?.[0];

  const handleAction = async (action) => {
    if (!pembayaran) return;
    if (action === "TOLAK") {
      const confirmed = await showConfirm(
        "Tolak Pembayaran?",
        "Status tagihan akan dikembalikan ke Belum Lunas.",
        "warning",
        "Ya, Tolak"
      );
      if (!confirmed) return;
    }

    setLoading(true);
    try {
      const res = await iplApi.konfirmasi(pembayaran.idPembayaran, {
        action,
        catatan: action === "TOLAK" ? catatan : undefined,
      });
      showMessage(action === "TERIMA" ? "Dikonfirmasi!" : "Ditolak", res.message, action === "TERIMA" ? "success" : "info");
      onSuccess();
      onClose();
    } catch (err) {
      showMessage("Gagal", err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const buktiUrl = pembayaran?.buktiTransaksi
    ? `${buktiBaseUrl}/uploads/bukti-bayar/${pembayaran.buktiTransaksi}`
    : null;

  return (
    <div className="ipl-modal-overlay" onClick={onClose}>
      <div className="ipl-modal ipl-modal-review" onClick={(e) => e.stopPropagation()}>
        <div className="ipl-modal-header">
          <h3>Review Bukti Pembayaran</h3>
          <button className="ipl-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="ipl-modal-body">
          {/* Info tagihan */}
          <div className="review-info-grid">
            <div className="review-info-item">
              <span className="review-info-label">Penghuni</span>
              <span className="review-info-value">{tagihan?.rumah?.penghuni?.namaUser || "—"}</span>
            </div>
            <div className="review-info-item">
              <span className="review-info-label">Blok / RT</span>
              <span className="review-info-value">{tagihan?.rumah?.blokRumah} / {tagihan?.rumah?.rt?.replace("_", " ")}</span>
            </div>
            <div className="review-info-item">
              <span className="review-info-label">Periode</span>
              <span className="review-info-value">{BULAN_NAMES[tagihan?.bulanPeriode]} {tagihan?.tahunPeriode}</span>
            </div>
            <div className="review-info-item">
              <span className="review-info-label">Nominal Tagihan</span>
              <span className="review-info-value review-nominal">{formatRupiah(tagihan?.nominal)}</span>
            </div>
            <div className="review-info-item">
              <span className="review-info-label">Nominal Dibayar</span>
              <span className="review-info-value">{pembayaran ? formatRupiah(pembayaran.nominal) : "—"}</span>
            </div>
            <div className="review-info-item">
              <span className="review-info-label">Tanggal Upload</span>
              <span className="review-info-value">{formatTanggal(pembayaran?.tanggalBayar)}</span>
            </div>
          </div>

          {/* Bukti transfer */}
          <div className="review-bukti-section">
            <p className="review-bukti-label">Bukti Transfer</p>
            {buktiUrl ? (
              <a href={buktiUrl} target="_blank" rel="noopener noreferrer">
                <img src={buktiUrl} alt="Bukti Transfer" className="review-bukti-img" />
              </a>
            ) : (
              <div className="review-bukti-empty">Tidak ada file bukti.</div>
            )}
          </div>

          {/* Textarea catatan penolakan */}
          <div className="ipl-form-group">
            <label>Catatan Penolakan <span className="label-optional">(opsional, khusus jika ditolak)</span></label>
            <textarea
              rows={3}
              placeholder="Contoh: Foto tidak jelas, jumlah transfer tidak sesuai..."
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className="ipl-textarea"
            />
          </div>

          <div className="review-action-row">
            <button
              className="btn-ipl-danger"
              onClick={() => handleAction("TOLAK")}
              disabled={loading}
            >
              <XCircle size={16} /> Tolak
            </button>
            <button
              className="btn-ipl-success"
              onClick={() => handleAction("TERIMA")}
              disabled={loading}
            >
              <CheckCircle size={16} /> Konfirmasi Lunas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Admin/Pengurus: kelola tagihan semua warga ────────────────────────────────
function AdminIuranView() {
  const [tagihan, setTagihan] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state — range periode, default bulan berjalan
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

  const [periodeDari, setPeriodeDari] = useState(getCurrentYm);
  const [periodeSampai, setPeriodeSampai] = useState(getCurrentYm);
  const [filterStatus, setFilterStatus] = useState("SEMUA");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [draftPeriodeDari, setDraftPeriodeDari] = useState(getCurrentYm);
  const [draftPeriodeSampai, setDraftPeriodeSampai] = useState(getCurrentYm);
  const [draftFilterStatus, setDraftFilterStatus] = useState("SEMUA");

  // Normalisasi + validasi turunan
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

  const handleFilterOpen = () => {
    setDraftPeriodeDari(periodeDari);
    setDraftPeriodeSampai(periodeSampai);
    setDraftFilterStatus(filterStatus);
  };
  const handleFilterApply = () => {
    if (draftRangeError) return;
    setPeriodeDari(draftPeriodeDari);
    setPeriodeSampai(draftPeriodeSampai);
    setFilterStatus(draftFilterStatus);
  };
  const handleFilterReset = () => {
    const cur = getCurrentYm();
    setPeriodeDari(cur);
    setPeriodeSampai(cur);
    setFilterStatus("SEMUA");
    setDraftPeriodeDari(cur);
    setDraftPeriodeSampai(cur);
    setDraftFilterStatus("SEMUA");
  };

  // Modal state
  const [showGenerate, setShowGenerate] = useState(false);
  const [reviewItem, setReviewItem] = useState(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  const loadData = useCallback(async () => {
    if (rangeError) return;
    setIsLoading(true);
    try {
      const res = await iplApi.getAll({
        dari,
        sampai,
        status: filterStatus,
        search,
      });
      setTagihan(res.tagihan || []);
      setSummary(res.summary || null);
    } catch (err) {
      showMessage("Gagal Memuat Data", err.message, "error");
    } finally {
      setIsLoading(false);
    }
  }, [dari, sampai, rangeError, filterStatus, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Search debounce
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  return (
    <div className="page-stack">
      {/* ── Header ── */}
      <div className="ipl-page-header">
        <div>
          <h2 className="ipl-page-title">Tagihan IPL</h2>
          <p className="ipl-page-subtitle">
            {rangeError
              ? "Kelola tagihan Iuran Pengelolaan Lingkungan warga cluster"
              : `Menampilkan data periode ${periodeLabel}`}
          </p>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      {summary && (
        <div className="ipl-summary-grid">
          <div className="ipl-summary-card tone-info">
            <div className="ipl-summary-icon"><Wallet size={20} /></div>
            <div className="ipl-summary-body">
              <span className="ipl-summary-label">Total Tagihan</span>
              <span className="ipl-summary-value">{formatRupiah(summary.totalNominal)}</span>
              <span className="ipl-summary-sub">{summary.total} rumah aktif</span>
            </div>
          </div>
          <div className="ipl-summary-card tone-success">
            <div className="ipl-summary-icon"><CheckCircle size={20} /></div>
            <div className="ipl-summary-body">
              <span className="ipl-summary-label">Terkumpul</span>
              <span className="ipl-summary-value">{formatRupiah(summary.totalTerkumpul)}</span>
              <span className="ipl-summary-sub">{summary.lunas} rumah lunas</span>
            </div>
          </div>
          <div className={`ipl-summary-card ${summary.menungguKonfirmasi > 0 ? "tone-warning" : "tone-muted"}`}>
            <div className="ipl-summary-icon">
              {summary.menungguKonfirmasi > 0 ? <AlertTriangle size={20} /> : <Clock size={20} />}
            </div>
            <div className="ipl-summary-body">
              <span className="ipl-summary-label">Menunggu Konfirmasi</span>
              <span className="ipl-summary-value">{summary.menungguKonfirmasi}</span>
              <span className="ipl-summary-sub">perlu ditinjau</span>
            </div>
          </div>
          <div className="ipl-summary-card tone-danger">
            <div className="ipl-summary-icon"><FileX size={20} /></div>
            <div className="ipl-summary-body">
              <span className="ipl-summary-label">Belum Lunas</span>
              <span className="ipl-summary-value">{formatRupiah(summary.totalTertunggak)}</span>
              <span className="ipl-summary-sub">{summary.belumLunas} rumah tertunggak</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Tambah + Search + Filter ── */}
      <div className="page-toolbar-row">
        <button
          id="btn-generate-tagihan"
          className="btn-ipl-primary"
          onClick={() => setShowGenerate(true)}
        >
          <Plus size={16} /> Buat Tagihan Periode
        </button>

        <div className="list-toolbar-row">
          <div className="list-search-wrap">
            <Search size={15} className="list-search-icon" />
            <input
              type="text"
              placeholder="Nama warga / blok rumah..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="list-search-input"
            />
          </div>

          <FilterPopover
            active={!isDefaultPeriode || filterStatus !== "SEMUA"}
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
            <FilterField label="Status">
              <select
                className="ipl-select ipl-select-sm"
                value={draftFilterStatus}
                onChange={(e) => setDraftFilterStatus(e.target.value)}
              >
                {STATUS_FILTER_OPTIONS.map(({ val, label }) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </FilterField>
          </FilterPopover>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="content-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="ipl-table-header">
          <span className="ipl-table-title">
            Data Tagihan — {periodeLabel}
          </span>
          <span className="ipl-table-count">{tagihan.length} data</span>
        </div>

        {isLoading ? (
          <div className="ipl-loading">
            <div className="ipl-spinner" />
            <span>Memuat data tagihan...</span>
          </div>
        ) : tagihan.length === 0 ? (
          <div className="ipl-empty">
            <Wallet size={40} strokeWidth={1.2} />
            <p>Belum ada tagihan untuk periode ini.</p>
          </div>
        ) : (
          <div className="ipl-table-wrapper">
            <table className="ipl-table">
              <thead>
                <tr>
                  <th>Blok / RT</th>
                  <th>Penghuni</th>
                  <th>Periode</th>
                  <th>Nominal</th>
                  <th>Status</th>
                  <th>Tanggal Bayar</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {tagihan.map((t) => {
                  const pembayaran = t.pembayaran?.[0];
                  return (
                    <tr key={t.id}>
                      <td>
                        <span className="ipl-blok">{t.rumah?.blokRumah}</span>
                        <span className="ipl-rt">{t.rumah?.rt?.replace("_", " ")}</span>
                      </td>
                      <td>{t.rumah?.penghuni?.namaUser || <em className="text-muted">Kosong</em>}</td>
                      <td>{BULAN_NAMES[t.bulanPeriode]} {t.tahunPeriode}</td>
                      <td className="ipl-nominal">{formatRupiah(t.nominal)}</td>
                      <td><AdminStatusBadge status={t.statusPembayaran} /></td>
                      <td>{formatTanggal(pembayaran?.tanggalBayar)}</td>
                      <td>
                        {t.statusPembayaran === "MENUNGGU_KONFIRMASI" ? (
                          <button
                            className="btn-ipl-review"
                            onClick={() => setReviewItem(t)}
                            title="Review bukti pembayaran"
                          >
                            <Eye size={14} /> Review
                          </button>
                        ) : t.statusPembayaran === "LUNAS" && pembayaran?.buktiTransaksi ? (
                          <a
                            href={`${API_BASE}/uploads/bukti-bayar/${pembayaran.buktiTransaksi}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-ipl-view"
                          >
                            <Eye size={14} /> Lihat Bukti
                          </a>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showGenerate && (
        <GenerateModal
          onClose={() => setShowGenerate(false)}
          onSuccess={loadData}
        />
      )}
      {reviewItem && (
        <ReviewModal
          tagihan={reviewItem}
          onClose={() => setReviewItem(null)}
          onSuccess={loadData}
          buktiBaseUrl={API_BASE}
        />
      )}
    </div>
  );
}

// ── Warga: lihat & bayar tagihan milik sendiri ────────────────────────────────
const MONTHS = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

function getMonthLabel(bulan, tahun) {
  const m = parseInt(bulan, 10);
  return `${MONTHS[m - 1] || bulan} ${tahun}`;
}

function formatRt(rt) {
  return String(rt || "").replace("_", " ");
}

function WargaStatusBadge({ status }) {
  const map = {
    LUNAS: { label: "Lunas", cls: "status-lunas", icon: CheckCircle },
    BELUM_LUNAS: { label: "Belum Lunas", cls: "status-belum", icon: AlertTriangle },
    MENUNGGU_KONFIRMASI: { label: "Menunggu Konfirmasi", cls: "status-menunggu", icon: Clock },
  };
  const { label, cls, icon: Icon } = map[status] || map.BELUM_LUNAS;
  return (
    <span className={`ipl-status-badge ${cls}`}>
      <Icon size={12} /> {label}
    </span>
  );
}

function rupiah(n) {
  return `Rp ${(Number(n) || 0).toLocaleString("id-ID")}`;
}

// ── Modal: Riwayat Transaksi (read-only, untuk tagihan Lunas role Warga) ────
function RiwayatTransaksiModal({ ipl, onClose }) {
  const pembayaran = ipl?.pembayaran?.[0];
  const buktiUrl = pembayaran?.buktiTransaksi
    ? portalApi.buktiUrl(pembayaran.buktiTransaksi)
    : null;

  return (
    <div className="ipl-modal-overlay" onClick={onClose}>
      <div className="ipl-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ipl-modal-header">
          <h3>Riwayat Transaksi</h3>
          <button className="ipl-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="ipl-modal-body">
          {/* Info tagihan */}
          <div className="review-info-grid">
            <div className="review-info-item">
              <span className="review-info-label">Unit</span>
              <span className="review-info-value">
                {ipl?.rumah ? `${ipl.rumah.blokRumah} · ${formatRt(ipl.rumah.rt)}` : `Rumah #${ipl?.idRumah}`}
              </span>
            </div>
            <div className="review-info-item">
              <span className="review-info-label">Periode</span>
              <span className="review-info-value">{getMonthLabel(ipl?.bulanPeriode, ipl?.tahunPeriode)}</span>
            </div>
            <div className="review-info-item">
              <span className="review-info-label">Nominal Tagihan</span>
              <span className="review-info-value review-nominal">{rupiah(ipl?.nominal)}</span>
            </div>
            <div className="review-info-item">
              <span className="review-info-label">Nominal Dibayar</span>
              <span className="review-info-value">{pembayaran ? rupiah(pembayaran.nominal) : "—"}</span>
            </div>
            <div className="review-info-item">
              <span className="review-info-label">Tanggal Bayar</span>
              <span className="review-info-value">{formatTanggal(pembayaran?.tanggalBayar)}</span>
            </div>
            <div className="review-info-item">
              <span className="review-info-label">Status</span>
              <span className="review-info-value"><WargaStatusBadge status={ipl?.statusPembayaran} /></span>
            </div>
          </div>

          {/* Bukti transfer */}
          <div className="review-bukti-section">
            <p className="review-bukti-label">Bukti Transfer</p>
            {buktiUrl ? (
              <a href={buktiUrl} target="_blank" rel="noopener noreferrer">
                <img src={buktiUrl} alt="Bukti Transfer" className="review-bukti-img" />
              </a>
            ) : (
              <div className="review-bukti-empty">Tidak ada file bukti.</div>
            )}
          </div>

          <div className="ipl-modal-footer">
            <button type="button" className="btn-ipl-secondary" onClick={onClose}>
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WargaIuranView({ user }) {
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

  const [rumahList, setRumahList] = useState([]);
  const [tagihanGabungan, setTagihanGabungan] = useState([]);
  const [loadingRumah, setLoadingRumah] = useState(true);
  const [loadingTagihan, setLoadingTagihan] = useState(false);
  const [modalIpl, setModalIpl] = useState(null); // IPL yang akan dibayar
  const [riwayatIpl, setRiwayatIpl] = useState(null); // IPL Lunas yang dilihat riwayatnya

  // Filter hijau model popover — sama seperti Tagihan IPL admin,
  // dengan pola draft + Terapkan + Reset ala filter Keuangan:
  // data baru terfilter setelah tombol Terapkan diklik.
  // Default WARGA: kosong = Semua Periode (langsung tampil semua data)
  const [periodeDari, setPeriodeDari] = useState("");
  const [periodeSampai, setPeriodeSampai] = useState("");
  const [filterStatus, setFilterStatus] = useState("SEMUA");
  const [selectedRumahId, setSelectedRumahId] = useState("semua");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Draft popover (baru diterapkan saat Terapkan diklik)
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftDari, setDraftDari] = useState("");
  const [draftSampai, setDraftSampai] = useState("");
  const [draftStatus, setDraftStatus] = useState("SEMUA");
  const [draftUnit, setDraftUnit] = useState("semua");

  // Normalisasi + validasi turunan — kosong = Semua Periode (tanpa filter)
  const [dari, sampai] = periodeDari && periodeSampai
    ? periodeDari > periodeSampai
      ? [periodeSampai, periodeDari]
      : [periodeDari, periodeSampai]
    : [periodeDari || "", periodeSampai || ""];
  const rangeError = dari && sampai && monthDiffInclusive(dari, sampai) > 12
    ? "Rentang periode maksimal 12 bulan."
    : "";

  // Validasi draft di dalam popover (sebelum diterapkan)
  const [draftDariN, draftSampaiN] = draftDari && draftSampai
    ? draftDari > draftSampai
      ? [draftSampai, draftDari]
      : [draftDari, draftSampai]
    : [draftDari || "", draftSampai || ""];
  const draftError = draftDari && draftSampai && monthDiffInclusive(draftDariN, draftSampaiN) > 12
    ? "Rentang periode maksimal 12 bulan."
    : "";

  const hasActiveFilter = !!periodeDari || !!periodeSampai || filterStatus !== "SEMUA" || selectedRumahId !== "semua";
  const periodeLabel = !periodeDari && !periodeSampai
    ? "Semua Periode"
    : !periodeDari || !periodeSampai
      ? formatYmPanjang(periodeDari || periodeSampai)
      : periodeDari === periodeSampai
        ? formatYmPanjang(periodeDari)
        : `${formatYmPanjang(periodeDari)} – ${formatYmPanjang(periodeSampai)}`;

  // Sinkronkan draft dari filter yang sedang diterapkan setiap popover dibuka
  const handleFilterOpenChange = (next) => {
    if (next) {
      setDraftDari(periodeDari);
      setDraftSampai(periodeSampai);
      setDraftStatus(filterStatus);
      setDraftUnit(selectedRumahId);
    }
    setFilterOpen(next);
  };

  const applyFilter = () => {
    if (draftError) return;
    setPeriodeDari(draftDari || "");
    setPeriodeSampai(draftSampai || "");
    setFilterStatus(draftStatus);
    setSelectedRumahId(draftUnit);
    setFilterOpen(false);
  };

  const handleResetFilter = () => {
    setPeriodeDari("");
    setPeriodeSampai("");
    setFilterStatus("SEMUA");
    setSelectedRumahId("semua");
    setDraftDari("");
    setDraftSampai("");
    setDraftStatus("SEMUA");
    setDraftUnit("semua");
    setFilterOpen(false);
  };

  const loadGabungan = async (uid) => {
    if (rangeError) return;
    setLoadingTagihan(true);
    try {
      const res = await portalApi.getTagihanByUser(uid, {
        dari: dari || undefined,
        sampai: sampai || undefined,
        status: filterStatus,
        search,
      });
      setRumahList(res.rumah || []);
      setTagihanGabungan(res.tagihan || []);
    } catch (err) {
      console.warn("getTagihanByUser gagal, fallback per-rumah:", err);
      // Fallback: ambil rumah lalu tagihan per rumah satu-satu,
      // lalu filter range + status + search di sisi klien
      const rumah = await portalApi.getRumahByUser(uid);
      setRumahList(rumah || []);
      const all = [];
      for (const r of rumah || []) {
        try {
          const { tagihan } = await portalApi.getTagihanByRumah(r.id);
          all.push(...(tagihan || []).map((t) => ({ ...t, rumah: { id: r.id, blokRumah: r.blokRumah, rt: r.rt } })));
        } catch (rumahErr) {
          console.warn(`Gagal memuat tagihan rumah ${r.id}:`, rumahErr);
        }
      }
      const q = search.trim().toLowerCase();
      const filtered = all.filter((t) => {
        const ym = `${t.tahunPeriode}-${t.bulanPeriode}`;
        if (dari && ym < dari) return false;
        if (sampai && ym > sampai) return false;
        if (filterStatus !== "SEMUA" && t.statusPembayaran !== filterStatus) return false;
        if (q) {
          const hay = `${t.bulanPeriode} ${t.tahunPeriode} ${t.rumah?.blokRumah || ""} ${t.nominal || ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
      setTagihanGabungan(filtered);
    } finally {
      setLoadingTagihan(false);
      setLoadingRumah(false);
    }
  };

  // Load data gabungan on mount & saat filter berubah
  useEffect(() => {
    loadGabungan(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dari, sampai, filterStatus, search]);

  // Search debounce (sama seperti filter keuangan admin)
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleUploadSuccess = () => {
    loadGabungan(user.id);
  };

  // Data tabel: filter по rumah terpilih
  const displayData = useMemo(() => {
    if (selectedRumahId === "semua") return tagihanGabungan;
    const id = Number(selectedRumahId);
    return tagihanGabungan.filter((t) => (t.rumah?.id ?? t.idRumah) === id);
  }, [tagihanGabungan, selectedRumahId]);

  // Ringkasan tampilan (periode terpilih, sesuai filter rumah)
  const ringkasan = useMemo(() => {
    const total = displayData.reduce((s, t) => s + (t.nominal || 0), 0);
    return {
      totalNominal: total,
      totalTagihan: displayData.length,
      lunas: displayData.filter((t) => t.statusPembayaran === "LUNAS").length,
      belumLunas: displayData.filter((t) => t.statusPembayaran === "BELUM_LUNAS").length,
      menunggu: displayData.filter((t) => t.statusPembayaran === "MENUNGGU_KONFIRMASI").length,
    };
  }, [displayData]);

  // Label periode untuk hero & tabel (mengikuti filter range yang dipilih)
  const heroLabel = periodeLabel;

  const modalRumah = useMemo(() => {
    if (!modalIpl) return null;
    const rid = modalIpl.rumah?.id ?? modalIpl.idRumah;
    return rumahList.find((r) => r.id === rid) || modalIpl.rumah || null;
  }, [modalIpl, rumahList]);

  if (loadingRumah) {
    return (
      <div className="portal-loading">
        <div className="portal-spinner" />
        <p>Memuat data rumah...</p>
      </div>
    );
  }

  if (rumahList.length === 0 && !loadingTagihan) {
    return (
      <div className="page-stack">
        <div className="portal-empty-notice">
          <Home size={40} />
          <p><strong>Rumah belum terdaftar</strong></p>
          <p>Akun Anda belum dihubungkan ke unit rumah. Hubungi pengurus cluster.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-stack">
      {/* Ringkasan Total Gabungan */}
      <section className="portal-tagihan-hero">
        <div className="portal-tagihan-hero-left">
          <div className="portal-tagihan-hero-icon">
            <CreditCard size={28} />
          </div>
          <div>
            <p className="portal-tagihan-period">
              {selectedRumahId === "semua"
                ? `Semua Unit (${rumahList.length} Rumah)`
                : (() => {
                    const r = rumahList.find((x) => x.id === Number(selectedRumahId));
                    return r ? `${r.blokRumah} · ${formatRt(r.rt)}` : "";
                  })()}
            </p>
            <h3 className="portal-tagihan-month">
              Total Tagihan {heroLabel}
            </h3>
            <p className="portal-stat-sub">
              {ringkasan.lunas} lunas · {ringkasan.belumLunas} belum lunas
              {ringkasan.menunggu > 0 ? ` · ${ringkasan.menunggu} menunggu` : ""}
            </p>
          </div>
        </div>

        {loadingTagihan ? (
          <div className="portal-spinner-sm" />
        ) : (
          <div className="portal-tagihan-hero-right">
            <span className="portal-tagihan-amount">
              {rupiah(ringkasan.totalNominal)}
            </span>
            {ringkasan.totalTagihan > 0 && (
              <span className="portal-stat-sub">
                {ringkasan.totalTagihan} tagihan
                {rumahList.length > 1 && selectedRumahId === "semua" ? ` · ${rumahList.length} unit` : ""}
              </span>
            )}
          </div>
        )}
      </section>

      {/* ── Search + Filter (sama seperti Tagihan IPL admin) ── */}
      <div className="list-toolbar-row">
        <div className="list-search-wrap">
          <Search size={15} className="list-search-icon" />
          <input
            type="text"
            placeholder="Unit / periode / nominal..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="list-search-input"
          />
        </div>

        <FilterPopover
          active={hasActiveFilter}
          open={filterOpen}
          onOpenChange={handleFilterOpenChange}
        >
          <FilterField label="Periode Dari">
            <div style={{ position: "relative" }}>
              <input
                type="month"
                value={draftDari}
                onChange={(e) => setDraftDari(e.target.value)}
                className="ipl-input"
                style={{ width: "100%", color: draftDari ? undefined : "transparent" }}
              />
              {!draftDari && (
                <span
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 13,
                    color: "#94a3b8",
                    pointerEvents: "none",
                  }}
                >
                  Semua Periode
                </span>
              )}
            </div>
          </FilterField>
          <FilterField label="Periode Sampai">
            <div style={{ position: "relative" }}>
              <input
                type="month"
                value={draftSampai}
                onChange={(e) => setDraftSampai(e.target.value)}
                className="ipl-input"
                style={{ width: "100%", color: draftSampai ? undefined : "transparent" }}
              />
              {!draftSampai && (
                <span
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 13,
                    color: "#94a3b8",
                    pointerEvents: "none",
                  }}
                >
                  Semua Periode
                </span>
              )}
            </div>
          </FilterField>
          {draftError && (
            <p style={{ color: "#dc2626", fontSize: 12, margin: 0 }}>{draftError}</p>
          )}
          <FilterField label="Status">
            <select
              className="ipl-select ipl-select-sm"
              value={draftStatus}
              onChange={(e) => setDraftStatus(e.target.value)}
            >
              {STATUS_FILTER_OPTIONS.map(({ val, label }) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </FilterField>
          {rumahList.length > 1 && (
            <FilterField label="Unit">
              <select
                className="ipl-select ipl-select-sm"
                value={draftUnit}
                onChange={(e) => setDraftUnit(e.target.value)}
              >
                <option value="semua">Semua Unit ({rumahList.length})</option>
                {rumahList.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.blokRumah} — {formatRt(r.rt)}
                  </option>
                ))}
              </select>
            </FilterField>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
            {hasActiveFilter && (
              <button
                type="button"
                onClick={handleResetFilter}
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
        </FilterPopover>
      </div>

      {/* Tabel Riwayat Tagihan */}
      <section className="content-card">
        <div className="card-header-row">
          <h3>Riwayat Tagihan {heroLabel}</h3>
          {selectedRumahId !== "semua" && (
            <button type="button" className="link-lihat-semua" onClick={() => setSelectedRumahId("semua")}>
              ← Tampilkan semua unit
            </button>
          )}
        </div>

        {loadingTagihan ? (
          <div className="portal-loading-inline">
            <div className="portal-spinner-sm" />
            <span>Memuat tagihan...</span>
          </div>
        ) : displayData.length === 0 ? (
          <p className="portal-empty-text">
            Belum ada riwayat tagihan untuk periode {heroLabel}
            {selectedRumahId !== "semua" ? " pada unit ini" : " pada semua unit Anda"}.
          </p>
        ) : (
          <>
          <div className="table-wrapper iuran-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  {rumahList.length > 1 && selectedRumahId === "semua" && <th>Unit</th>}
                  <th>Periode</th>
                  <th>Nominal</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {displayData.map((ipl) => (
                  <tr key={ipl.id}>
                    {rumahList.length > 1 && selectedRumahId === "semua" && (
                      <td>{ipl.rumah ? `${ipl.rumah.blokRumah} · ${formatRt(ipl.rumah.rt)}` : `Rumah #${ipl.idRumah}`}</td>
                    )}
                    <td>{getMonthLabel(ipl.bulanPeriode, ipl.tahunPeriode)}</td>
                    <td>{rupiah(ipl.nominal)}</td>
                    <td><WargaStatusBadge status={ipl.statusPembayaran} /></td>
                    <td>
                      {ipl.statusPembayaran === "BELUM_LUNAS" ? (
                        <button
                          type="button"
                          className="btn-primary btn-sm"
                          onClick={() => setModalIpl(ipl)}
                        >
                          <Upload size={13} /> Bayar
                        </button>
                      ) : ipl.statusPembayaran === "MENUNGGU_KONFIRMASI" ? (
                        <span className="text-muted text-sm">Menunggu konfirmasi...</span>
                      ) : ipl.statusPembayaran === "LUNAS" && ipl.pembayaran?.[0] ? (
                        <button
                          type="button"
                          className="btn-ipl-neutral"
                          onClick={() => setRiwayatIpl(ipl)}
                          title="Lihat riwayat transaksi"
                        >
                          <Eye size={14} /> Riwayat
                        </button>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="iuran-grid">
            {displayData.map((ipl) => (
              <div key={ipl.id} className="iuran-grid-card">
                <h3 className="iuran-grid-title">
                  {getMonthLabel(ipl.bulanPeriode, ipl.tahunPeriode)}
                </h3>
                <span className="meta-item iuran-grid-nominal">{rupiah(ipl.nominal)}</span>
                {rumahList.length > 1 && selectedRumahId === "semua" && (
                  <span className="meta-item iuran-grid-unit">
                    {ipl.rumah ? `${ipl.rumah.blokRumah} · ${formatRt(ipl.rumah.rt)}` : `Rumah #${ipl.idRumah}`}
                  </span>
                )}
                <div className="iuran-grid-footer">
                  {ipl.statusPembayaran === "BELUM_LUNAS" ? (
                    <button
                      type="button"
                      className="btn-primary btn-sm"
                      onClick={() => setModalIpl(ipl)}
                    >
                      <Upload size={12} /> Bayar
                    </button>
                  ) : ipl.statusPembayaran === "LUNAS" && ipl.pembayaran?.[0] ? (
                    <button
                      type="button"
                      className="btn-ipl-neutral"
                      onClick={() => setRiwayatIpl(ipl)}
                      title="Lihat riwayat transaksi"
                    >
                      <Eye size={12} /> Riwayat
                    </button>
                  ) : (
                    <span />
                  )}
                  <WargaStatusBadge status={ipl.statusPembayaran} />
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </section>

      {/* Modal Upload Bukti */}
      {modalIpl && (
        <BuktiUploadModal
          ipl={modalIpl}
          user={user}
          rumah={modalRumah}
          onClose={() => setModalIpl(null)}
          onSuccess={handleUploadSuccess}
        />
      )}

      {/* Modal Riwayat Transaksi */}
      {riwayatIpl && (
        <RiwayatTransaksiModal
          ipl={riwayatIpl}
          onClose={() => setRiwayatIpl(null)}
        />
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function IuranPage() {
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

  return user?.role === "WARGA" ? <WargaIuranView user={user} /> : <AdminIuranView />;
}
