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
  ChevronDown,
  Upload,
  Calendar,
  Building2,
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

function WargaIuranView({ user }) {
  const now = new Date();
  const bulanIniDefault = String(now.getMonth() + 1).padStart(2, "0");
  const tahunIniDefault = String(now.getFullYear());

  const [rumahList, setRumahList] = useState([]);
  const [tagihanGabungan, setTagihanGabungan] = useState([]);
  const [loadingRumah, setLoadingRumah] = useState(true);
  const [loadingTagihan, setLoadingTagihan] = useState(false);
  const [modalIpl, setModalIpl] = useState(null); // IPL yang akan dibayar

  // Filter periode + filter rumah
  const [filterBulan, setFilterBulan] = useState(bulanIniDefault);
  const [filterTahun, setFilterTahun] = useState(tahunIniDefault);
  const [selectedRumahId, setSelectedRumahId] = useState("semua");

  const tahunOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return [String(y - 2), String(y - 1), String(y), String(y + 1)];
  }, []);

  const loadGabungan = async (uid, bulan, tahun) => {
    setLoadingTagihan(true);
    try {
      const res = await portalApi.getTagihanByUser(uid, { bulan, tahun });
      setRumahList(res.rumah || []);
      setTagihanGabungan(res.tagihan || []);
    } catch (err) {
      console.warn("getTagihanByUser gagal, fallback per-rumah:", err);
      // Fallback: ambil rumah lalu tagihan per rumah satu-satu
      const rumah = await portalApi.getRumahByUser(uid);
      setRumahList(rumah || []);
      const all = [];
      for (const r of rumah || []) {
        try {
          const { tagihan } = await portalApi.getTagihanByRumah(r.id);
          let filtered = tagihan || [];
          if (bulan) filtered = filtered.filter((t) => t.bulanPeriode === bulan);
          if (tahun) filtered = filtered.filter((t) => t.tahunPeriode === tahun);
          all.push(...filtered.map((t) => ({ ...t, rumah: { id: r.id, blokRumah: r.blokRumah, rt: r.rt } })));
        } catch (rumahErr) {
          console.warn(`Gagal memuat tagihan rumah ${r.id}:`, rumahErr);
        }
      }
      setTagihanGabungan(all);
    } finally {
      setLoadingTagihan(false);
      setLoadingRumah(false);
    }
  };

  // Load data gabungan on mount & saat filter periode berubah
  useEffect(() => {
    loadGabungan(user.id, filterBulan, filterTahun);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterBulan, filterTahun]);

  const handleUploadSuccess = () => {
    loadGabungan(user.id, filterBulan, filterTahun);
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

  // Label periode untuk hero & tabel (mengikuti filter yang dipilih)
  const heroLabel = filterBulan && filterTahun
    ? getMonthLabel(filterBulan, filterTahun)
    : "Semua Periode";

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

      {/* Filter Periode + Filter Rumah */}
      <section className="content-card">
        <div className="card-header-row">
          <h3><Calendar size={16} /> Filter Periode & Unit</h3>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div className="portal-select-wrap" style={{ minWidth: 150, flex: 1 }}>
            <label className="portal-selector-label" htmlFor="filter-bulan">
              <Calendar size={13} /> Bulan
            </label>
            <select
              id="filter-bulan"
              className="portal-select"
              value={filterBulan}
              onChange={(e) => setFilterBulan(e.target.value)}
            >
              <option value="">Semua Bulan</option>
              {MONTHS.map((m, i) => {
                const v = String(i + 1).padStart(2, "0");
                return <option key={v} value={v}>{m}</option>;
              })}
            </select>
          </div>
          <div className="portal-select-wrap" style={{ minWidth: 130, flex: 1 }}>
            <label className="portal-selector-label" htmlFor="filter-tahun">
              <Calendar size={13} /> Tahun
            </label>
            <select
              id="filter-tahun"
              className="portal-select"
              value={filterTahun}
              onChange={(e) => setFilterTahun(e.target.value)}
            >
              <option value="">Semua Tahun</option>
              {tahunOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          {rumahList.length > 1 && (
            <div className="portal-select-wrap" style={{ minWidth: 200, flex: 2 }}>
              <label className="portal-selector-label" htmlFor="rumah-select">
                <Building2 size={13} /> Unit Rumah
              </label>
              <select
                id="rumah-select"
                className="portal-select"
                value={selectedRumahId}
                onChange={(e) => setSelectedRumahId(e.target.value)}
              >
                <option value="semua">Semua Unit ({rumahList.length})</option>
                {rumahList.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.blokRumah} — {formatRt(r.rt)}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="portal-select-icon" />
            </div>
          )}
        </div>
      </section>

      {/* Rincian per Rumah (tampil saat mode gabungan) */}
      {rumahList.length > 1 && selectedRumahId === "semua" && displayData.length > 0 && (
        <section className="content-card">
          <div className="card-header-row">
            <h3><Home size={16} /> Rincian per Unit</h3>
          </div>
          <ul className="portal-pengumuman-list">
            {rumahList.map((r) => {
              const items = tagihanGabungan.filter((t) => (t.rumah?.id ?? t.idRumah) === r.id);
              if (items.length === 0) return null;
              const subtotal = items.reduce((s, t) => s + (t.nominal || 0), 0);
              const belum = items.filter((t) => t.statusPembayaran === "BELUM_LUNAS").length;
              return (
                <li key={r.id} className="portal-pengumuman-item">
                  <div className="portal-stat-icon" style={{ width: 36, height: 36 }}>
                    <Home size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p className="portal-peng-judul">{r.blokRumah} — {formatRt(r.rt)}</p>
                    <p className="portal-peng-desc">
                      {items.length} tagihan · {rupiah(subtotal)}
                      {belum > 0 ? ` · ${belum} belum lunas` : " · semua lunas"}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-primary btn-sm"
                    onClick={() => setSelectedRumahId(String(r.id))}
                  >
                    Detail
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

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
            Belum ada riwayat tagihan {filterBulan || filterTahun ? `untuk periode ${heroLabel}` : ""}
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
                      ) : (
                        <span className="text-success text-sm">✓ Lunas</span>
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
