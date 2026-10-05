"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle, XCircle, Clock, Eye, Landmark, Upload, Wallet } from "lucide-react";
import { setoranApi } from "@/lib/api";
import { areaLabel, can, scopeOf } from "@/lib/session";
import { useUser } from "@/lib/useUser";
import { showMessage } from "@/lib/message";
import FilterPopover, { FilterField } from "@/components/ui/FilterPopover";
import Pagination from "@/components/ui/Pagination";
import Select from "@/components/ui/Select";
import FileDropzone from "@/components/ui/FileDropzone";
import { usePagination } from "@/lib/usePagination";
import SetoranDetailModal from "@/components/setoran/SetoranDetailModal";
import {
  formatRupiah as rupiah,
  formatTanggalPendek as tanggal,
  formatYmPendek,
  getCurrentYm,
} from "@/lib/format";

const STATUS = {
  MENUNGGU_KONFIRMASI: { label: "Menunggu Konfirmasi", cls: "badge-menunggu" },
  DIKONFIRMASI: { label: "Dikonfirmasi", cls: "badge-lunas" },
  DITOLAK: { label: "Ditolak", cls: "badge-belum" },
};

function StatusBadge({ status }) {
  const s = STATUS[status] ?? { label: status, cls: "" };
  return <span className={`ipl-badge ${s.cls}`}>{s.label}</span>;
}

// ── Modal: setor ke RW (upload bukti transfer) ────────────────────────────────
function SetorModal({ siap, pilihRt, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return showMessage("Validasi", "Bukti transfer wajib diunggah.", "warning");
    setLoading(true);
    try {
      const res = await setoranApi.create({ bukti: file, rt: pilihRt ? siap.rt : undefined });
      showMessage("Berhasil", res.message, "success");
      onSuccess();
      onClose();
    } catch (err) {
      showMessage("Gagal Menyetor", err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ipl-modal-overlay" onClick={onClose}>
      <div className="ipl-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ipl-modal-header">
          <h3>Setor IPL ke Bendahara RW</h3>
          <button className="ipl-modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="ipl-modal-body">
          <div className="ipl-total-box">
            <span>{areaLabel(siap.rt)} · {siap.jumlahTagihan} tagihan lunas</span>
            <strong>{rupiah(siap.totalIpl)}</strong>
          </div>
          <p className="field-hint">
            Yang disetor hanya porsi IPL rumah yang dihuni. Kas RT tidak ikut dan tetap di keuangan RT.
            Tagihan rumah kosong dikecualikan — porsi IPL-nya masuk kas RT. Transfer sesuai nominal
            di atas, lalu unggah buktinya.
          </p>
          {siap.dikecualikanRumahKosong?.jumlahTagihan > 0 && (
            <p className="field-hint">
              {siap.dikecualikanRumahKosong.jumlahTagihan} tagihan rumah kosong ({rupiah(siap.dikecualikanRumahKosong.totalMasukKasRt)}) masuk kas RT, tidak disetor.
            </p>
          )}
          <div className="ipl-form-group">
            <label>Bukti transfer <span className="required-star">*</span></label>
            <FileDropzone
              file={file}
              onFileSelect={setFile}
              onRemove={() => setFile(null)}
              accept=".jpg,.jpeg,.png"
              maxSizeMB={5}
              placeholder="Klik atau seret foto bukti transfer ke sini"
              hint="JPG / PNG · Maks. 5 MB"
              onError={(msg) => showMessage("File Terlalu Besar", msg, "warning")}
            />
          </div>
          <div className="ipl-modal-footer">
            <button type="button" className="btn-ipl-secondary" onClick={onClose} disabled={loading}>Batal</button>
            <button type="submit" className="btn-ipl-primary" disabled={loading}>
              {loading ? "Mengirim..." : "Kirim Setoran"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SetoranPage() {
  const { user, ready } = useUser();
  const [data, setData] = useState({ setoran: [], summary: null });
  const [siap, setSiap] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [siapRt, setSiapRt] = useState("RT_01");
  const [showSetor, setShowSetor] = useState(false);
  const [detailId, setDetailId] = useState(null);

  const bolehSetor = can(user, "setoran.create");
  const bolehKonfirmasi = can(user, "setoran.konfirmasi");
  const semuaRt = scopeOf(user, "setoran.read") === "ALL";
  const pilihRtSetor = scopeOf(user, "setoran.create") === "ALL";

  // ── Filter: periode (bulan berjalan default) + status + wilayah — pola sama Keuangan/Tagihan ──
  const formatYmPanjang = formatYmPendek;
  const monthDiffInclusive = (dari, sampai) => {
    const [y1, m1] = dari.split("-").map(Number);
    const [y2, m2] = sampai.split("-").map(Number);
    return (y2 - y1) * 12 + (m2 - m1) + 1;
  };

  const [periodeDari, setPeriodeDari] = useState(getCurrentYm);
  const [periodeSampai, setPeriodeSampai] = useState(getCurrentYm);
  const [filterStatus, setFilterStatus] = useState("SEMUA");
  const [filterRt, setFilterRt] = useState("SEMUA");

  const [draftPeriodeDari, setDraftPeriodeDari] = useState(getCurrentYm);
  const [draftPeriodeSampai, setDraftPeriodeSampai] = useState(getCurrentYm);
  const [draftFilterStatus, setDraftFilterStatus] = useState("SEMUA");
  const [draftFilterRt, setDraftFilterRt] = useState("SEMUA");

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

  const load = useCallback(async () => {
    if (!user) return;
    if (rangeError) return;
    setIsLoading(true);
    try {
      const [list, pratinjau] = await Promise.all([
        can(user, "setoran.read")
          ? setoranApi.getAll({ status: filterStatus, rt: filterRt, dari, sampai })
          : Promise.resolve({ setoran: [], summary: null }),
        bolehSetor ? setoranApi.getSiapSetor({ rt: pilihRtSetor ? siapRt : undefined }) : Promise.resolve(null),
      ]);
      setData(list);
      setSiap(pratinjau);
    } catch (err) {
      showMessage("Gagal Memuat Data", err.message, "error");
    } finally {
      setIsLoading(false);
    }
  }, [user, filterStatus, filterRt, dari, sampai, rangeError, siapRt, bolehSetor, pilihRtSetor]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = data.summary;
  const list = useMemo(() => data.setoran ?? [], [data]);

  const { page, totalPages, paginatedItems: listPage, prev, next } = usePagination(list, [list]);

  if (!ready || !user) return null;

  return (
    <div className="page-stack">
      {( (bolehSetor && siap) || summary ) && (
        <div className="ipl-summary-grid keu-summary-grid">
          {bolehSetor && siap && (
            <div className={`ipl-summary-card keu-card ${siap.jumlahTagihan > 0 ? "keu-teal" : "keu-muted"}`}>
              <div className="keu-icon-circle"><Landmark size={22} strokeWidth={2} /></div>
              <div className="keu-card-text">
                <span className="ipl-summary-label">Siap Disetor {pilihRtSetor ? areaLabel(siap.rt) : ""}</span>
                <span className="ipl-summary-value">{rupiah(siap.totalIpl)}</span>
                {siap.dikecualikanRumahKosong?.jumlahTagihan > 0 && (
                  <span className="ipl-summary-sub">
                    {siap.dikecualikanRumahKosong.jumlahTagihan} tagihan rumah kosong masuk kas RT
                  </span>
                )}
              </div>
            </div>
          )}
          {summary && (
            <>
              <div className="ipl-summary-card keu-card keu-green">
                <div className="keu-icon-circle"><CheckCircle size={22} strokeWidth={2} /></div>
                <div className="keu-card-text">
                  <span className="ipl-summary-label">Sudah Dikonfirmasi</span>
                  <span className="ipl-summary-value">{rupiah(summary.totalDikonfirmasi)}</span>
                </div>
              </div>
              <div className="ipl-summary-card keu-card keu-amber">
                <div className="keu-icon-circle"><Clock size={22} strokeWidth={2} /></div>
                <div className="keu-card-text">
                  <span className="ipl-summary-label">Menunggu Konfirmasi</span>
                  <span className="ipl-summary-value">{rupiah(summary.totalMenunggu)}</span>
                </div>
              </div>
              <div className="ipl-summary-card keu-card keu-red">
                <div className="keu-icon-circle"><XCircle size={22} strokeWidth={2} /></div>
                <div className="keu-card-text">
                  <span className="ipl-summary-label">Ditolak</span>
                  <span className="ipl-summary-value">{summary.ditolak}</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div className="page-toolbar-row">
        {bolehSetor && siap && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {pilihRtSetor && (
              <Select
                className="ipl-select ipl-select-sm"
                value={siapRt}
                onChange={(v) => setSiapRt(v)}
                options={["RT_01", "RT_02", "RT_03", "RT_04"].map((rt) => ({ value: rt, label: areaLabel(rt) }))}
              />
            )}
            <button
              type="button"
              className="btn-ipl-primary"
              disabled={siap.jumlahTagihan === 0}
              onClick={() => setShowSetor(true)}
            >
              <Upload size={16} /> Setor ke RW
            </button>
          </div>
        )}
        <div className="list-toolbar-row" style={{ justifyContent: "flex-end", marginLeft: "auto" }}>
          <FilterPopover
            active={!isDefaultPeriode || filterStatus !== "SEMUA" || filterRt !== "SEMUA"}
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
                options={[
                  { value: "SEMUA", label: "Semua Status" },
                  { value: "MENUNGGU_KONFIRMASI", label: "Menunggu Konfirmasi" },
                  { value: "DIKONFIRMASI", label: "Dikonfirmasi" },
                  { value: "DITOLAK", label: "Ditolak" },
                ]}
              />
            </FilterField>
            {semuaRt && (
              <FilterField label="Wilayah">
                <Select
                  className="ipl-select ipl-select-sm"
                  value={draftFilterRt}
                  onChange={(v) => setDraftFilterRt(v)}
                  options={[
                    { value: "SEMUA", label: "Semua Wilayah" },
                    ...["RT_01", "RT_02", "RT_03", "RT_04"].map((rt) => ({ value: rt, label: areaLabel(rt) })),
                  ]}
                />
              </FilterField>
            )}
          </FilterPopover>
        </div>
      </div>

      {rangeError && (
        <p style={{ color: "#dc2626", fontSize: 13, margin: "-8px 0 0" }}>{rangeError}</p>
      )}

      <div className="content-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="ipl-table-header">
          <span className="ipl-table-title">Riwayat Setoran - {rangeError ? "-" : periodeLabel}</span>
          <span className="ipl-table-count">{list.length} data</span>
        </div>

        {isLoading ? (
          <div className="ipl-loading"><div className="ipl-spinner" /><span>Memuat setoran...</span></div>
        ) : list.length === 0 ? (
          <div className="ipl-empty">
            <Wallet size={40} strokeWidth={1.2} />
            <p>Belum ada setoran.</p>
          </div>
        ) : (
          <>
          <div className="ipl-table-wrapper pengaduan-table-wrapper">
            <table className="ipl-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Tanggal</th>
                  <th>RT</th>
                  <th>Tagihan</th>
                  <th>Total IPL</th>
                  <th>Status</th>
                  <th>Diputuskan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {listPage.map((s, index) => (
                  <tr key={s.id}>
                    <td>{(page - 1) * 10 + index + 1}</td>
                    <td>{tanggal(s.createDate)}</td>
                    <td><span className="rt-badge">{areaLabel(s.area)}</span></td>
                    <td>{s.jumlahTagihan}</td>
                    <td className="ipl-nominal">{rupiah(s.totalIpl)}</td>
                    <td><StatusBadge status={s.status} /></td>
                    <td>
                      {s.konfirmasiBy ? (
                        <>
                          {s.konfirmasiBy}
                          <span className="ipl-nominal-split">{tanggal(s.tanggalKonfirmasi)}</span>
                        </>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={s.status === "MENUNGGU_KONFIRMASI" && bolehKonfirmasi ? "btn-ipl-review" : "btn-ipl-view"}
                        onClick={() => setDetailId(s.id)}
                      >
                        <Eye size={14} /> {s.status === "MENUNGGU_KONFIRMASI" && bolehKonfirmasi ? "Review" : "Detail"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pengaduan-cards">
            {listPage.map((s) => (
              <div key={s.id} className="pengaduan-card" style={{ cursor: "default" }}>
                <div className="pengaduan-card-top">
                  <h3 className="pengaduan-card-title" style={{ fontSize: "0.85rem" }}>
                    <span className="rt-badge">{areaLabel(s.area)}</span> {tanggal(s.createDate)}
                  </h3>
                  <StatusBadge status={s.status} />
                </div>
                <div className="pengaduan-card-meta">
                  <span className="pengaduan-meta-item">{s.jumlahTagihan} tagihan</span>
                  <span className="pengaduan-meta-item">{rupiah(s.totalIpl)}</span>
                </div>
                {s.konfirmasiBy && (
                  <span className="warga-grid-penghuni">
                    {s.konfirmasiBy} <span className="text-muted" style={{ fontWeight: 400 }}>· {tanggal(s.tanggalKonfirmasi)}</span>
                  </span>
                )}
                <div className="pengaduan-card-actions">
                  <button
                    type="button"
                    className={s.status === "MENUNGGU_KONFIRMASI" && bolehKonfirmasi ? "btn-ipl-review" : "btn-ipl-view"}
                    onClick={() => setDetailId(s.id)}
                  >
                    <Eye size={14} /> {s.status === "MENUNGGU_KONFIRMASI" && bolehKonfirmasi ? "Review" : "Detail"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <Pagination page={page} totalPages={totalPages} total={list.length} onPrev={prev} onNext={next} />
          </>
        )}
      </div>

      {showSetor && siap && (
        <SetorModal siap={siap} pilihRt={pilihRtSetor} onClose={() => setShowSetor(false)} onSuccess={load} />
      )}
      {detailId && (
        <SetoranDetailModal
          id={detailId}
          bolehKonfirmasi={bolehKonfirmasi}
          onClose={() => setDetailId(null)}
          onSuccess={load}
        />
      )}
    </div>
  );
}
