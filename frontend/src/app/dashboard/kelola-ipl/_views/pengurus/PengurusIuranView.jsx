"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Search, CheckCircle, XCircle, Clock, AlertTriangle, Eye, Wallet, FileX, Pencil, Trash2 } from "lucide-react";
import { iplApi, portalApi, openProtectedFile } from "@/lib/api";
import { areaLabel, can, scopeOf } from "@/lib/session";
import { showMessage, showConfirm } from "@/lib/message";
import FilterPopover, { FilterField } from "@/components/ui/FilterPopover";
import Pagination from "@/components/ui/Pagination";
import Select from "@/components/ui/Select";
import { usePagination } from "@/lib/usePagination";
import ProtectedImage from "@/components/ui/ProtectedImage";
import CurrencyInput from "@/components/ui/CurrencyInput";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { formatRupiah, formatTanggalPendek as formatTanggal, BULAN_PANJANG as BULAN_NAMES, BULAN_OPTIONS, getCurrentYm, formatYmPendek, formatYmPanjang } from "@/lib/format";
import { RekapRtPanel } from "./RekapRtPanel";

// ── Helpers ───────────────────────────────────────────────────────────────────
const currentYear = new Date().getFullYear();
const TAHUN_OPTIONS = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

const STATUS_FILTER_OPTIONS = [
  { val: "SEMUA", label: "Semua Status" },
  { val: "BELUM_LUNAS", label: "Belum Lunas" },
  { val: "MENUNGGU_KONFIRMASI", label: "Menunggu Konfirmasi" },
  { val: "LUNAS", label: "Lunas" },
];

export function PengurusStatusBadge({ status }) {
  const map = {
    LUNAS: { label: "Lunas", cls: "badge-lunas" },
    BELUM_LUNAS: { label: "Belum Lunas", cls: "badge-belum" },
    MENUNGGU_KONFIRMASI: { label: "Menunggu Konfirmasi", cls: "badge-menunggu" },
  };
  const { label, cls } = map[status] || { label: status, cls: "" };
  return <span className={`ipl-badge ${cls}`}>{label}</span>;
}
// ── Modal: Generate Tagihan (2 input: IPL + kas RT) ───────────────────────────
function GenerateModal({ onClose, onSuccess, pilihRt = false }) {
  const now = new Date();
  const [form, setForm] = useState({
    bulanPeriode: String(now.getMonth() + 1).padStart(2, "0"),
    tahunPeriode: String(now.getFullYear()),
    nominalIpl: "",
    nominalKas: "",
    rt: "RT_01",
  });
  const [loading, setLoading] = useState(false);

  const total = (Number(form.nominalIpl) || 0) + (Number(form.nominalKas) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nominalIpl || Number(form.nominalIpl) <= 0) {
      showMessage("Validasi", "Nominal IPL harus lebih dari 0.", "warning");
      return;
    }
    if (Number(form.nominalKas) < 0) {
      showMessage("Validasi", "Nominal kas tidak boleh negatif.", "warning");
      return;
    }
    const confirmed = await showConfirm(
      "Buat Tagihan?",
      `Tagihan periode ${BULAN_NAMES[form.bulanPeriode]} ${form.tahunPeriode}: IPL ${formatRupiah(form.nominalIpl)} + kas ${formatRupiah(form.nominalKas || 0)} = ${formatRupiah(total)} per rumah ber-pemilik (termasuk rumah kosong — porsi IPL-nya masuk kas RT). Generate ulang periode yang sama hanya menagih rumah baru yang belum punya tagihan.`,
      "question",
      "Ya, Buat!"
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await iplApi.generate({
        bulanPeriode: form.bulanPeriode,
        tahunPeriode: form.tahunPeriode,
        nominalIpl: Number(form.nominalIpl),
        nominalKas: Number(form.nominalKas || 0),
        ...(pilihRt ? { rt: form.rt } : {}),
      });
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
          {pilihRt && (
            <div className="ipl-form-group">
              <label>RT</label>
              <Select
                value={form.rt}
                onChange={(v) => setForm({ ...form, rt: v })}
                className="ipl-select"
                options={["RT_01", "RT_02", "RT_03", "RT_04"].map((rt) => ({ value: rt, label: areaLabel(rt) }))}
              />
            </div>
          )}
          <div className="ipl-form-row">
            <div className="ipl-form-group">
              <label>Bulan</label>
              <Select
                value={form.bulanPeriode}
                onChange={(v) => setForm({ ...form, bulanPeriode: v })}
                className="ipl-select"
                options={BULAN_OPTIONS.map(({ val, label }) => ({ value: val, label }))}
              />
            </div>
            <div className="ipl-form-group">
              <label>Tahun</label>
              <Select
                value={form.tahunPeriode}
                onChange={(v) => setForm({ ...form, tahunPeriode: v })}
                className="ipl-select"
                options={TAHUN_OPTIONS.map((y) => ({ value: y, label: y }))}
              />
            </div>
          </div>
          <div className="ipl-form-row">
            <div className="ipl-form-group">
              <label>IPL (Rp) <span className="label-optional">disetor ke RW</span></label>
              <CurrencyInput
                placeholder="Contoh: 130.000"
                value={form.nominalIpl}
                onChange={(v) => setForm({ ...form, nominalIpl: v })}
                required
              />
            </div>
            <div className="ipl-form-group">
              <label>Kas RT (Rp) <span className="label-optional">masuk kas RT</span></label>
              <CurrencyInput
                placeholder="Contoh: 20.000"
                value={form.nominalKas}
                onChange={(v) => setForm({ ...form, nominalKas: v })}
              />
            </div>
          </div>
          <div className="ipl-total-box">
            <span>Total yang dibayar warga</span>
            <strong>{formatRupiah(total)}</strong>
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
// ── Modal: Koreksi nominal satu tagihan ───────────────────────────────────────
function EditTagihanModal({ tagihan, onClose, onSuccess }) {
  const [form, setForm] = useState({
    nominalIpl: String(tagihan.nominalIpl),
    nominalKas: String(tagihan.nominalKas),
    alasan: "",
  });
  const [loading, setLoading] = useState(false);

  const nominalBerubah =
    Number(form.nominalIpl) !== tagihan.nominalIpl ||
    Number(form.nominalKas || 0) !== tagihan.nominalKas;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (nominalBerubah && !form.alasan.trim()) {
      showMessage("Validasi", "Alasan koreksi wajib diisi bila nominal berubah.", "warning");
      return;
    }
    setLoading(true);
    try {
      await iplApi.update(tagihan.id, {
        nominalIpl: Number(form.nominalIpl),
        nominalKas: Number(form.nominalKas || 0),
        ...(nominalBerubah ? { alasan: form.alasan.trim() } : {}),
      });
      showMessage("Berhasil", "Tagihan berhasil diperbarui.", "success");
      onSuccess();
      onClose();
    } catch (err) {
      showMessage("Gagal Memperbarui", err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ipl-modal-overlay" onClick={onClose}>
      <div className="ipl-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ipl-modal-header">
          <h3>Koreksi Tagihan {tagihan.rumah?.blokRumah}</h3>
          <button className="ipl-modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="ipl-modal-body">
          <p className="field-hint">
            {BULAN_NAMES[tagihan.bulanPeriode]} {tagihan.tahunPeriode} · {tagihan.rumah?.penghuni?.namaUser || "-"}
          </p>
          <div className="ipl-form-row">
            <div className="ipl-form-group">
              <label>IPL (Rp)</label>
              <CurrencyInput required value={form.nominalIpl}
                onChange={(v) => setForm({ ...form, nominalIpl: v })} />
            </div>
            <div className="ipl-form-group">
              <label>Kas RT (Rp)</label>
              <CurrencyInput value={form.nominalKas}
                onChange={(v) => setForm({ ...form, nominalKas: v })} />
            </div>
          </div>
          <div className="ipl-form-group">
            <label>Alasan koreksi {nominalBerubah && <span className="required-star">*</span>}</label>
            <textarea
              rows={2}
              className="ipl-textarea"
              placeholder="Wajib diisi bila nominal berubah. Contoh: tarif kas RT naik per kesepakatan warga…"
              value={form.alasan}
              onChange={(e) => setForm({ ...form, alasan: e.target.value })}
            />
            <span className="field-hint">Koreksi tercatat di riwayat aktivitas dan diteruskan ke RW.</span>
          </div>
          <div className="ipl-modal-footer">
            <button type="button" className="btn-ipl-secondary" onClick={onClose} disabled={loading}>Batal</button>
            <button type="submit" className="btn-ipl-primary" disabled={loading}>{loading ? "Menyimpan..." : "Simpan"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
// ── Modal: Review Bukti Pembayaran ────────────────────────────────────────────
function ReviewModal({ tagihan, onClose, onSuccess }) {
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

  const buktiPath = pembayaran?.buktiTransaksi
    ? portalApi.buktiPath(pembayaran.idPembayaran)
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
              <span className="review-info-value">{tagihan?.rumah?.penghuni?.namaUser || "-"}</span>
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
              <span className="review-info-value">{pembayaran ? formatRupiah(pembayaran.nominal) : "-"}</span>
            </div>
            <div className="review-info-item">
              <span className="review-info-label">Tanggal Upload</span>
              <span className="review-info-value">{formatTanggal(pembayaran?.tanggalBayar)}</span>
            </div>
          </div>

          {/* Bukti transfer */}
          <div className="review-bukti-section">
            <p className="review-bukti-label">Bukti Transfer</p>
            <ProtectedImage path={buktiPath} alt="Bukti Transfer" className="review-bukti-img" />
          </div>

          {/* Textarea catatan penolakan */}
          <div className="ipl-form-group">
            <label>Catatan Penolakan <span className="label-optional">(opsional, khusus jika ditolak)</span></label>
            <textarea
              rows={2}
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
// ── Pengurus: kelola tagihan semua warga ────────────────────────────────
export function PengurusIuranView({ user }) {
  const bolehGenerate = can(user, "ipl.generate");
  const bolehKonfirmasi = can(user, "ipl.konfirmasi");
  // Ketua RT (dan role lain tanpa ipl.konfirmasi) cuma boleh konfirmasi pembayaran
  // pengurus (role.level < 3), bukan warga biasa — dicek juga di backend.
  const bolehKonfirmasiPengurus = can(user, "ipl.konfirmasi_pengurus");
  const bolehUbah = can(user, "ipl.update");
  const bolehHapus = can(user, "ipl.delete");
  // Scope ALL (ketua/bendahara/sekre RW, admin) melihat semua RT; scope AREA hanya RT sendiri.
  const semuaRt = scopeOf(user, "ipl.read") === "ALL";
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [tagihan, setTagihan] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state — range periode, default bulan berjalan
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
  const [filterRt, setFilterRt] = useState("SEMUA");
  const [draftFilterRt, setDraftFilterRt] = useState("SEMUA");
  const [refreshKey, setRefreshKey] = useState(0);

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
    : `${formatYmPanjang(periodeDari)} - ${formatYmPanjang(periodeSampai)}`;
  const periodeLabelSingkat = periodeDari === periodeSampai
    ? formatYmPendek(periodeDari)
    : `${formatYmPendek(periodeDari)} - ${formatYmPendek(periodeSampai)}`;

  const handleFilterOpen = () => {
    setDraftPeriodeDari(periodeDari);
    setDraftPeriodeSampai(periodeSampai);
    setDraftFilterStatus(filterStatus);
    setDraftFilterRt(filterRt);
  };
  const handleFilterApply = () => {
    if (draftRangeError) return;
    setPeriodeDari(draftPeriodeDari);
    setPeriodeSampai(draftPeriodeSampai);
    setFilterStatus(draftFilterStatus);
    setFilterRt(draftFilterRt);
  };
  const handleFilterReset = () => {
    const cur = getCurrentYm();
    setPeriodeDari(cur);
    setPeriodeSampai(cur);
    setFilterStatus("SEMUA");
    setDraftPeriodeDari(cur);
    setDraftPeriodeSampai(cur);
    setDraftFilterStatus("SEMUA");
    setFilterRt("SEMUA");
    setDraftFilterRt("SEMUA");
  };

  // Modal state
  const [showGenerate, setShowGenerate] = useState(false);
  const [reviewItem, setReviewItem] = useState(null);
  const [editItem, setEditItem] = useState(null);

  const loadData = useCallback(async () => {
    if (rangeError) return;
    setIsLoading(true);
    try {
      const res = await iplApi.getAll({
        dari,
        sampai,
        status: filterStatus,
        search,
        rt: filterRt,
      });
      setTagihan(res.tagihan || []);
      setSummary(res.summary || null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      showMessage("Gagal Memuat Data", err.message, "error");
    } finally {
      setIsLoading(false);
    }
  }, [dari, sampai, rangeError, filterStatus, search, filterRt]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const { page, totalPages, paginatedItems: tagihanPage, prev, next } = usePagination(tagihan, [tagihan]);

  // Search debounce
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleHapus = async (t) => {
    const ok = await showConfirm(
      "Hapus tagihan?",
      `Tagihan ${t.rumah?.blokRumah} periode ${BULAN_NAMES[t.bulanPeriode]} ${t.tahunPeriode} akan dihapus.`,
      "warning",
      "Ya, hapus"
    );
    if (!ok) return;
    try {
      await iplApi.remove(t.id);
      showMessage("Berhasil", "Tagihan berhasil dihapus.", "success");
      loadData();
    } catch (err) {
      showMessage("Gagal Menghapus", err.message, "error");
    }
  };

  return (
    <div className="page-stack">
      {/* ── Summary Cards — Tagihan IPL (tint redesign, palet selaras Keuangan) ── */}
      {summary && (
        <div className="ipl-summary-grid keu-summary-grid">
          <div className="ipl-summary-card keu-card keu-teal">
            <div className="keu-icon-circle"><Wallet size={22} strokeWidth={2} /></div>
            <div className="keu-card-text">
              <span className="ipl-summary-label">Total Tagihan</span>
              <span className="ipl-summary-value">{formatRupiah(summary.totalNominal)}</span>
            </div>
          </div>
          <div className="ipl-summary-card keu-card keu-green">
            <div className="keu-icon-circle"><CheckCircle size={22} strokeWidth={2} /></div>
            <div className="keu-card-text">
              <span className="ipl-summary-label">Terkumpul</span>
              <span className="ipl-summary-value">{formatRupiah(summary.totalTerkumpul)}</span>
            </div>
          </div>
          <div className={`ipl-summary-card keu-card ${summary.menungguKonfirmasi > 0 ? "keu-amber" : "keu-muted"}`}>
            <div className="keu-icon-circle">{summary.menungguKonfirmasi > 0 ? <AlertTriangle size={22} strokeWidth={2} /> : <Clock size={22} strokeWidth={2} />}</div>
            <div className="keu-card-text">
              <span className="ipl-summary-label">Menunggu Konfirmasi</span>
              <span className="ipl-summary-value">{summary.menungguKonfirmasi}</span>
            </div>
          </div>
          <div className="ipl-summary-card keu-card keu-red">
            <div className="keu-icon-circle"><FileX size={22} strokeWidth={2} /></div>
            <div className="keu-card-text">
              <span className="ipl-summary-label">Belum Lunas</span>
              <span className="ipl-summary-value">{summary.belumLunas}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Tambah + Search + Filter ── */}
      <div className="page-toolbar-row toolbar-row-reverse-mobile">
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
            active={!isDefaultPeriode || filterStatus !== "SEMUA" || filterRt !== "SEMUA"}
            activeCount={
              (!isDefaultPeriode ? 1 : 0) +
              (filterStatus !== "SEMUA" ? 1 : 0) +
              (filterRt !== "SEMUA" ? 1 : 0)
            }
            onOpen={handleFilterOpen}
            onApply={handleFilterApply}
            onReset={handleFilterReset}
            applyDisabled={!!draftRangeError}
          >
            <FilterField label="Periode Dari">
              <input
                type="month"
                value={draftPeriodeDari}
                max={draftPeriodeSampai || getCurrentYm()}
                onChange={(e) => e.target.value && setDraftPeriodeDari(e.target.value)}
                className="ipl-input"
              />
            </FilterField>
            <FilterField label="Periode Sampai">
              <input
                type="month"
                value={draftPeriodeSampai}
                min={draftPeriodeDari || undefined}
                max={getCurrentYm()}
                onChange={(e) => e.target.value && setDraftPeriodeSampai(e.target.value)}
                className="ipl-input"
              />
            </FilterField>
            {draftRangeError && (
              <p style={{ color: "#dc2626", fontSize: 12, margin: 0 }}>{draftRangeError}</p>
            )}
            <FilterField label="Status">
              <Select
                className="ipl-select ipl-select-sm"
                value={draftFilterStatus}
                onChange={(v) => setDraftFilterStatus(v)}
                options={STATUS_FILTER_OPTIONS.map(({ val, label }) => ({ value: val, label }))}
              />
            </FilterField>
            {semuaRt && (
              <FilterField label="RT">
                <Select
                  className="ipl-select ipl-select-sm"
                  value={draftFilterRt}
                  onChange={(v) => setDraftFilterRt(v)}
                  options={[
                    { value: "SEMUA", label: "Semua RT" },
                    ...["RT_01", "RT_02", "RT_03", "RT_04"].map((rt) => ({ value: rt, label: areaLabel(rt) })),
                  ]}
                />
              </FilterField>
            )}
          </FilterPopover>
        </div>
        {bolehGenerate && (
          <button
            id="btn-generate-tagihan"
            className="btn-ipl-primary"
            onClick={() => setShowGenerate(true)}
          >
            <Plus size={16} /> Buat Tagihan Periode
          </button>
        )}
      </div>

      {/* Tampilan RW: rekap terkumpul & disetor per RT — ikut filter aktif (tanpa search) */}
      {semuaRt && !rangeError && <RekapRtPanel dari={dari} sampai={sampai} status={filterStatus} rt={filterRt} refreshKey={refreshKey} />}

      {/* ── Table ── */}
      <div className="content-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="ipl-table-header">
          <span className="ipl-table-title">
            Data Tagihan ({isMobile ? periodeLabelSingkat : periodeLabel})
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
          <>
          <div className="ipl-table-wrapper pengaduan-table-wrapper">
            <table className="ipl-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Blok / RT</th>
                  <th>Penghuni</th>
                  <th>Periode</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Tanggal Bayar</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {tagihanPage.map((t, index) => {
                  const pembayaran = t.pembayaran?.[0];
                  const penghuniPengurus = (t.rumah?.penghuni?.role?.level ?? 3) < 3;
                  const bisaKonfirmasiBaris = bolehKonfirmasi || (bolehKonfirmasiPengurus && penghuniPengurus);
                  return (
                    <tr key={t.id}>
                      <td>{(page - 1) * 10 + index + 1}</td>
                      <td>
                        <span className="ipl-blok">{t.rumah?.blokRumah}</span>
                        <span className="ipl-rt">{t.rumah?.rt?.replace("_", " ")}</span>
                      </td>
                      <td>{t.rumah?.penghuni?.namaUser || <em className="text-muted">Kosong</em>}</td>
                      <td>{BULAN_NAMES[t.bulanPeriode]} {t.tahunPeriode}</td>
                      <td className="ipl-nominal">
                        {formatRupiah(t.nominal)}
                        <span className="ipl-nominal-split">IPL {formatRupiah(t.nominalIpl)} + kas {formatRupiah(t.nominalKas)}</span>
                        {t.statusPembayaran === "LUNAS" && (
                          <span className="ipl-nominal-split">
                            {t.setoran ? (t.setoran.status === "DIKONFIRMASI" ? "IPL sudah disetor" : "IPL dalam setoran") : "IPL belum disetor"}
                          </span>
                        )}
                      </td>
                      <td><PengurusStatusBadge status={t.statusPembayaran} /></td>
                      <td>{formatTanggal(pembayaran?.tanggalBayar)}</td>
                      <td>
                        <div className="table-actions">
                          {t.statusPembayaran === "MENUNGGU_KONFIRMASI" && bisaKonfirmasiBaris ? (
                            <button
                              className="btn-ipl-review"
                              onClick={() => setReviewItem(t)}
                              title="Review bukti pembayaran"
                            >
                              <Eye size={14} /> Review
                            </button>
                          ) : pembayaran?.buktiTransaksi && t.statusPembayaran !== "BELUM_LUNAS" ? (
                            <button
                              type="button"
                              className="btn-ipl-view"
                              onClick={() => openProtectedFile(portalApi.buktiPath(pembayaran.idPembayaran))}
                            >
                              <Eye size={14} /> Lihat Bukti
                            </button>
                          ) : null}
                          {t.statusPembayaran === "BELUM_LUNAS" && bolehUbah && (
                            <button type="button" className="btn-icon" title="Koreksi nominal" aria-label="Koreksi nominal" onClick={() => setEditItem(t)}>
                              <Pencil size={15} />
                            </button>
                          )}
                          {t.statusPembayaran === "BELUM_LUNAS" && bolehHapus && !pembayaran && (
                            <button type="button" className="btn-icon danger" title="Hapus tagihan" aria-label="Hapus tagihan" onClick={() => handleHapus(t)}>
                              <Trash2 size={15} />
                            </button>
                          )}
                          {t.statusPembayaran === "BELUM_LUNAS" && !bolehUbah && !bolehHapus && (
                            <span className="text-muted">-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pengaduan-cards">
            {tagihanPage.map((t) => {
              const pembayaran = t.pembayaran?.[0];
              const penghuniPengurus = (t.rumah?.penghuni?.role?.level ?? 3) < 3;
              const bisaKonfirmasiBaris = bolehKonfirmasi || (bolehKonfirmasiPengurus && penghuniPengurus);
              return (
                <div key={t.id} className="pengaduan-card" style={{ cursor: "default" }}>
                  <div className="pengaduan-card-top">
                    <h3 className="pengaduan-card-title" style={{ fontSize: "0.85rem" }}>
                      {t.rumah?.blokRumah} <span className="rt-badge">{t.rumah?.rt?.replace("_", " ")}</span>
                    </h3>
                    <PengurusStatusBadge status={t.statusPembayaran} />
                  </div>
                  <div className="pengaduan-card-meta">
                    <span className="pengaduan-meta-item">{t.rumah?.penghuni?.namaUser || "Kosong"}</span>
                    <span className="pengaduan-meta-item">{BULAN_NAMES[t.bulanPeriode]} {t.tahunPeriode}</span>
                    {pembayaran?.tanggalBayar && <span className="pengaduan-meta-item">{formatTanggal(pembayaran.tanggalBayar)}</span>}
                  </div>
                  <span className="warga-grid-penghuni">
                    {formatRupiah(t.nominal)} <span className="text-muted" style={{ fontWeight: 400 }}>(IPL {formatRupiah(t.nominalIpl)} + kas {formatRupiah(t.nominalKas)})</span>
                  </span>
                  <div className="pengaduan-card-actions">
                    <div className="table-actions">
                      {t.statusPembayaran === "MENUNGGU_KONFIRMASI" && bisaKonfirmasiBaris ? (
                        <button className="btn-ipl-review" onClick={() => setReviewItem(t)} title="Review bukti pembayaran">
                          <Eye size={14} /> Review
                        </button>
                      ) : pembayaran?.buktiTransaksi && t.statusPembayaran !== "BELUM_LUNAS" ? (
                        <button
                          type="button"
                          className="btn-ipl-view"
                          onClick={() => openProtectedFile(portalApi.buktiPath(pembayaran.idPembayaran))}
                        >
                          <Eye size={14} /> Lihat Bukti
                        </button>
                      ) : null}
                      {t.statusPembayaran === "BELUM_LUNAS" && bolehUbah && (
                        <button type="button" className="btn-icon" title="Koreksi nominal" aria-label="Koreksi nominal" onClick={() => setEditItem(t)}>
                          <Pencil size={15} />
                        </button>
                      )}
                      {t.statusPembayaran === "BELUM_LUNAS" && bolehHapus && !pembayaran && (
                        <button type="button" className="btn-icon danger" title="Hapus tagihan" aria-label="Hapus tagihan" onClick={() => handleHapus(t)}>
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination page={page} totalPages={totalPages} total={tagihan.length} onPrev={prev} onNext={next} />
          </>
        )}
      </div>

      {/* ── Modals ── */}
      {showGenerate && (
        <GenerateModal
          pilihRt={semuaRt}
          onClose={() => setShowGenerate(false)}
          onSuccess={loadData}
        />
      )}
      {editItem && (
        <EditTagihanModal tagihan={editItem} onClose={() => setEditItem(null)} onSuccess={loadData} />
      )}
      {reviewItem && (
        <ReviewModal
          tagihan={reviewItem}
          onClose={() => setReviewItem(null)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
