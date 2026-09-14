"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  Wallet,
  TrendingUp,
  FileX,
  RefreshCw,
} from "lucide-react";
import { iplApi } from "@/lib/api";
import { showMessage, showConfirm } from "@/lib/message";

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

function StatusBadge({ status }) {
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
      "Generate Tagihan?",
      `Akan membuat tagihan IPL periode ${BULAN_NAMES[form.bulanPeriode]} ${form.tahunPeriode} sebesar ${formatRupiah(form.nominal)} untuk semua rumah aktif.`,
      "question",
      "Ya, Generate!"
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await iplApi.generate({ ...form, nominal: Number(form.nominal) });
      showMessage("Berhasil!", res.message, "success");
      onSuccess();
      onClose();
    } catch (err) {
      showMessage("Gagal Generate", err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ipl-modal-overlay" onClick={onClose}>
      <div className="ipl-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ipl-modal-header">
          <h3>Generate Tagihan IPL Periode Baru</h3>
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
              {loading ? "Memproses..." : "Generate Tagihan"}
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function IuranPage() {
  const now = new Date();
  const [tagihan, setTagihan] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state — default ke bulan & tahun sekarang
  const [filterBulan, setFilterBulan] = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const [filterTahun, setFilterTahun] = useState(String(now.getFullYear()));
  const [filterStatus, setFilterStatus] = useState("SEMUA");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Modal state
  const [showGenerate, setShowGenerate] = useState(false);
  const [reviewItem, setReviewItem] = useState(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await iplApi.getAll({
        bulan: filterBulan,
        tahun: filterTahun,
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
  }, [filterBulan, filterTahun, filterStatus, search]);

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
            Kelola tagihan Iuran Pengelolaan Lingkungan warga cluster
          </p>
        </div>
        <button
          id="btn-generate-tagihan"
          className="btn-ipl-primary"
          onClick={() => setShowGenerate(true)}
        >
          <Plus size={16} /> Generate Tagihan Periode
        </button>
      </div>

      {/* ── Filter Bar ── */}
      <div className="ipl-filter-bar">
        <div className="ipl-filter-group">
          <label>Bulan</label>
          <select
            className="ipl-select ipl-select-sm"
            value={filterBulan}
            onChange={(e) => setFilterBulan(e.target.value)}
          >
            {BULAN_OPTIONS.map(({ val, label }) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
        <div className="ipl-filter-group">
          <label>Tahun</label>
          <select
            className="ipl-select ipl-select-sm"
            value={filterTahun}
            onChange={(e) => setFilterTahun(e.target.value)}
          >
            {TAHUN_OPTIONS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="ipl-filter-group">
          <label>Status</label>
          <select
            className="ipl-select ipl-select-sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            {STATUS_FILTER_OPTIONS.map(({ val, label }) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
        <div className="ipl-filter-group ipl-filter-search">
          <label>Cari</label>
          <div className="ipl-search-wrapper">
            <Search size={15} className="ipl-search-icon" />
            <input
              type="text"
              placeholder="Nama warga / blok rumah..."
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

      {/* ── Table ── */}
      <div className="content-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="ipl-table-header">
          <span className="ipl-table-title">
            Data Tagihan —{" "}
            {filterBulan ? BULAN_NAMES[filterBulan] : "Semua Bulan"}{" "}
            {filterTahun}
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
            <button className="btn-ipl-primary" onClick={() => setShowGenerate(true)}>
              <Plus size={15} /> Generate Sekarang
            </button>
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
                      <td><StatusBadge status={t.statusPembayaran} /></td>
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
