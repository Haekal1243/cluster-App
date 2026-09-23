"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle, XCircle, Clock, Eye, Landmark, Upload, Wallet } from "lucide-react";
import { setoranApi } from "@/lib/api";
import { areaLabel, can, scopeOf } from "@/lib/session";
import { useUser } from "@/lib/useUser";
import { showConfirm, showMessage } from "@/lib/message";
import FilterPopover, { FilterField } from "@/components/ui/FilterPopover";

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n || 0);

const tanggal = (d) =>
  d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—";

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
            Yang disetor hanya porsi IPL. Kas RT tidak ikut dan tetap di keuangan RT. Transfer sesuai nominal
            di atas, lalu unggah buktinya.
          </p>
          <div className="ipl-form-group">
            <label>Bukti transfer <span className="required-star">*</span></label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="ipl-input"
              required
            />
            <span className="field-hint">JPG / PNG · Maks. 5 MB</span>
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

// ── Modal: detail + konfirmasi/tolak ──────────────────────────────────────────
function DetailModal({ id, bolehKonfirmasi, onClose, onSuccess }) {
  const [data, setData] = useState(null);
  const [alasan, setAlasan] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setoranApi.getById(id).then(setData).catch((e) => {
      showMessage("Gagal Memuat", e.message, "error");
      onClose();
    });
    // onClose dibuat ulang tiap render induk; efek ini cukup jalan sekali per id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const proses = async (action) => {
    if (action === "TOLAK" && !alasan.trim()) {
      return showMessage("Validasi", "Alasan penolakan wajib diisi.", "warning");
    }
    const ok = await showConfirm(
      action === "TERIMA" ? "Konfirmasi setoran?" : "Tolak setoran?",
      action === "TERIMA"
        ? `Setoran ${rupiah(data.totalIpl)} dari ${areaLabel(data.area)} akan dicatat sebagai pemasukan kas RW.`
        : "Tagihan dalam setoran ini akan kembali ke antrean setor RT.",
      action === "TERIMA" ? "question" : "warning",
      action === "TERIMA" ? "Ya, konfirmasi" : "Ya, tolak"
    );
    if (!ok) return;

    setLoading(true);
    try {
      const res = await setoranApi.konfirmasi(id, { action, catatan: alasan || undefined });
      showMessage(action === "TERIMA" ? "Dikonfirmasi" : "Ditolak", res.message, action === "TERIMA" ? "success" : "info");
      onSuccess();
      onClose();
    } catch (err) {
      showMessage("Gagal", err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const buktiUrl = data ? setoranApi.buktiUrl(data.buktiTransaksi) : null;

  return (
    <div className="ipl-modal-overlay" onClick={onClose}>
      <div className="ipl-modal ipl-modal-review" onClick={(e) => e.stopPropagation()}>
        <div className="ipl-modal-header">
          <h3>Detail Setoran {data ? areaLabel(data.area) : ""}</h3>
          <button className="ipl-modal-close" onClick={onClose}>✕</button>
        </div>
        {!data ? (
          <div className="ipl-loading"><div className="ipl-spinner" /><span>Memuat...</span></div>
        ) : (
          <div className="ipl-modal-body">
            <div className="review-info-grid">
              <div className="review-info-item">
                <span className="review-info-label">Total IPL</span>
                <span className="review-info-value review-nominal">{rupiah(data.totalIpl)}</span>
              </div>
              <div className="review-info-item">
                <span className="review-info-label">Jumlah tagihan</span>
                <span className="review-info-value">{data.jumlahTagihan}</span>
              </div>
              <div className="review-info-item">
                <span className="review-info-label">Disetor oleh</span>
                <span className="review-info-value">{data.createBy || "—"} · {tanggal(data.createDate)}</span>
              </div>
              <div className="review-info-item">
                <span className="review-info-label">Status</span>
                <span className="review-info-value"><StatusBadge status={data.status} /></span>
              </div>
              {data.konfirmasiBy && (
                <div className="review-info-item">
                  <span className="review-info-label">Diputuskan oleh</span>
                  <span className="review-info-value">{data.konfirmasiBy} · {tanggal(data.tanggalKonfirmasi)}</span>
                </div>
              )}
              {data.catatan && (
                <div className="review-info-item">
                  <span className="review-info-label">Catatan</span>
                  <span className="review-info-value">{data.catatan}</span>
                </div>
              )}
            </div>

            <div className="review-bukti-section">
              <p className="review-bukti-label">Bukti Transfer</p>
              {buktiUrl ? (
                <a href={buktiUrl} target="_blank" rel="noopener noreferrer">
                  <img src={buktiUrl} alt="Bukti setoran" className="review-bukti-img" />
                </a>
              ) : (
                <div className="review-bukti-empty">Tidak ada file bukti.</div>
              )}
            </div>

            {data.tagihan?.length > 0 && (
              <div className="setoran-tagihan-list">
                <p className="review-bukti-label">Tagihan yang disetor</p>
                <table className="ipl-table">
                  <thead>
                    <tr><th>Blok</th><th>Penghuni</th><th>Periode</th><th>IPL</th></tr>
                  </thead>
                  <tbody>
                    {data.tagihan.map((t) => (
                      <tr key={t.id}>
                        <td>{t.rumah?.blokRumah}</td>
                        <td>{t.rumah?.penghuni?.namaUser || "—"}</td>
                        <td>{BULAN[Number(t.bulanPeriode) - 1]} {t.tahunPeriode}</td>
                        <td>{rupiah(t.nominalIpl)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {bolehKonfirmasi && data.status === "MENUNGGU_KONFIRMASI" && (
              <>
                <div className="ipl-form-group">
                  <label>Alasan penolakan <span className="label-optional">(wajib bila ditolak)</span></label>
                  <textarea
                    rows={2}
                    className="ipl-textarea"
                    placeholder="Contoh: Nominal transfer tidak sesuai..."
                    value={alasan}
                    onChange={(e) => setAlasan(e.target.value)}
                  />
                </div>
                <div className="review-action-row">
                  <button className="btn-ipl-danger" onClick={() => proses("TOLAK")} disabled={loading}>
                    <XCircle size={16} /> Tolak
                  </button>
                  <button className="btn-ipl-success" onClick={() => proses("TERIMA")} disabled={loading}>
                    <CheckCircle size={16} /> Konfirmasi Setoran
                  </button>
                </div>
              </>
            )}
          </div>
        )}
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
  const BULAN_NAMES = {
    "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr",
    "05": "Mei", "06": "Jun", "07": "Jul", "08": "Agu",
    "09": "Sep", "10": "Okt", "11": "Nov", "12": "Des",
  };
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
    : `${formatYmPanjang(periodeDari)} – ${formatYmPanjang(periodeSampai)}`;

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

  if (!ready || !user) return null;

  return (
    <div className="page-stack">
      {( (bolehSetor && siap) || summary ) && (
        <div className="ipl-summary-grid keu-summary-grid">
          {bolehSetor && siap && (
            <div className={`ipl-summary-card keu-card ${siap.jumlahTagihan > 0 ? "keu-teal" : "keu-muted"}`}>
              <div className="keu-card-head">
                <div className="keu-icon-circle"><Landmark size={18} strokeWidth={2} /></div>
                <span className="ipl-summary-label">Siap Disetor {pilihRtSetor ? areaLabel(siap.rt) : ""}</span>
              </div>
              <span className="ipl-summary-value">{rupiah(siap.totalIpl)}</span>
              <span className="ipl-summary-sub">{siap.jumlahTagihan} tagihan lunas belum disetor</span>
            </div>
          )}
          {summary && (
            <>
              <div className="ipl-summary-card keu-card keu-green">
                <div className="keu-card-head">
                  <div className="keu-icon-circle"><CheckCircle size={18} strokeWidth={2} /></div>
                  <span className="ipl-summary-label">Sudah Dikonfirmasi</span>
                </div>
                <span className="ipl-summary-value">{rupiah(summary.totalDikonfirmasi)}</span>
                <span className="ipl-summary-sub">{summary.dikonfirmasi} setoran</span>
              </div>
              <div className={`ipl-summary-card keu-card ${summary.menunggu > 0 ? "keu-amber" : "keu-muted"}`}>
                <div className="keu-card-head">
                  <div className="keu-icon-circle"><Clock size={18} strokeWidth={2} /></div>
                  <span className="ipl-summary-label">Menunggu Konfirmasi</span>
                </div>
                <span className="ipl-summary-value">{rupiah(summary.totalMenunggu)}</span>
                <span className="ipl-summary-sub">{summary.menunggu} setoran</span>
              </div>
              <div className={`ipl-summary-card keu-card ${summary.ditolak > 0 ? "keu-red" : "keu-muted"}`}>
                <div className="keu-card-head">
                  <div className="keu-icon-circle"><XCircle size={18} strokeWidth={2} /></div>
                  <span className="ipl-summary-label">Ditolak</span>
                </div>
                <span className="ipl-summary-value">{summary.ditolak}</span>
                <span className="ipl-summary-sub">tagihan kembali ke antrean</span>
              </div>
            </>
          )}
        </div>
      )}

      <div className="page-toolbar-row">
        {bolehSetor && siap && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {pilihRtSetor && (
              <select className="ipl-select ipl-select-sm" value={siapRt} onChange={(e) => setSiapRt(e.target.value)}>
                {["RT_01", "RT_02", "RT_03", "RT_04"].map((rt) => (
                  <option key={rt} value={rt}>{areaLabel(rt)}</option>
                ))}
              </select>
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
                <option value="SEMUA">Semua Status</option>
                <option value="MENUNGGU_KONFIRMASI">Menunggu Konfirmasi</option>
                <option value="DIKONFIRMASI">Dikonfirmasi</option>
                <option value="DITOLAK">Ditolak</option>
              </select>
            </FilterField>
            {semuaRt && (
              <FilterField label="Wilayah">
                <select
                  className="ipl-select ipl-select-sm"
                  value={draftFilterRt}
                  onChange={(e) => setDraftFilterRt(e.target.value)}
                >
                  <option value="SEMUA">Semua Wilayah</option>
                  {["RT_01", "RT_02", "RT_03", "RT_04"].map((rt) => (
                    <option key={rt} value={rt}>{areaLabel(rt)}</option>
                  ))}
                </select>
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
          <span className="ipl-table-title">Riwayat Setoran — {rangeError ? "—" : periodeLabel}</span>
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
          <div className="ipl-table-wrapper">
            <table className="ipl-table">
              <thead>
                <tr>
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
                {list.map((s) => (
                  <tr key={s.id}>
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
                        <span className="text-muted">—</span>
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
        )}
      </div>

      {showSetor && siap && (
        <SetorModal siap={siap} pilihRt={pilihRtSetor} onClose={() => setShowSetor(false)} onSuccess={load} />
      )}
      {detailId && (
        <DetailModal
          id={detailId}
          bolehKonfirmasi={bolehKonfirmasi}
          onClose={() => setDetailId(null)}
          onSuccess={load}
        />
      )}
    </div>
  );
}
