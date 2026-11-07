"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, CheckCircle, Clock, AlertTriangle, Eye, Home, Upload } from "lucide-react";
import { portalApi } from "@/lib/api";
import { BillSummaryCard } from "@/components/ipl/BillSummaryCard";
import FilterPopover, { FilterField } from "@/components/ui/FilterPopover";
import Pagination from "@/components/ui/Pagination";
import Select from "@/components/ui/Select";
import { usePagination } from "@/lib/usePagination";
import BuktiUploadModal from "@/components/portal/BuktiUploadModal";
import ProtectedImage from "@/components/ui/ProtectedImage";
import { formatRupiah, formatTanggalPendek as formatTanggal, getCurrentYm, getMonthLabel, formatYmPendek, formatYmPanjang } from "@/lib/format";

const STATUS_FILTER_OPTIONS = [
  { val: "SEMUA", label: "Semua Status" },
  { val: "BELUM_LUNAS", label: "Belum Lunas" },
  { val: "MENUNGGU_KONFIRMASI", label: "Menunggu Konfirmasi" },
  { val: "LUNAS", label: "Lunas" },
];

// ── Warga: lihat & bayar tagihan milik sendiri ────────────────────────────────
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

const rupiah = formatRupiah;

// ── Modal: Riwayat Transaksi (read-only, untuk tagihan Lunas role Warga) ────
function RiwayatTransaksiModal({ ipl, onClose }) {
  const pembayaran = ipl?.pembayaran?.[0];
  const buktiPath = pembayaran?.buktiTransaksi
    ? portalApi.buktiPath(pembayaran.idPembayaran)
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
              <span className="review-info-value">{pembayaran ? rupiah(pembayaran.nominal) : "-"}</span>
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
            <ProtectedImage path={buktiPath} alt="Bukti Transfer" className="review-bukti-img" />
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

// View tagihan milik sendiri — dipakai route /kelola-ipl/tagihan-warga (warga)
// dan /kelola-ipl/tagihan-pengurus (pengurus) tanpa duplikasi kode.
export function WargaIuranView({ user }) {
  const currentYm = getCurrentYm();
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
  // displayDari/displaySampai terurut kronologis agar label tidak terbalik jika user isi Dari > Sampai
  const displayDari = periodeDari && periodeSampai && periodeDari > periodeSampai ? periodeSampai : periodeDari;
  const displaySampai = periodeDari && periodeSampai && periodeDari > periodeSampai ? periodeDari : periodeSampai;
  const periodeLabel = !displayDari && !displaySampai
    ? "Semua Periode"
    : !displayDari || !displaySampai
      ? formatYmPanjang(displayDari || displaySampai)
      : displayDari === displaySampai
        ? formatYmPanjang(displayDari)
        : `${formatYmPanjang(displayDari)} - ${formatYmPanjang(displaySampai)}`;

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

  // Ringkasan tampilan (periode terpilih, sesuai filter rumah).
  // Nominal hanya menjumlah tagihan yang belum lunas (BELUM_LUNAS + MENUNGGU_KONFIRMASI);
  // yang sudah LUNAS dikecualikan.
  const ringkasan = useMemo(() => {
    const tagihanAktif = displayData.filter((t) => t.statusPembayaran !== "LUNAS");
    const total = tagihanAktif.reduce((s, t) => s + (Number(t.nominal) || 0), 0);
    return {
      totalNominal: total,
      totalTagihan: tagihanAktif.length,
      lunas: displayData.filter((t) => t.statusPembayaran === "LUNAS").length,
      belumLunas: displayData.filter((t) => t.statusPembayaran === "BELUM_LUNAS").length,
      menunggu: displayData.filter((t) => t.statusPembayaran === "MENUNGGU_KONFIRMASI").length,
    };
  }, [displayData]);

  // Label periode untuk hero & tabel (mengikuti filter range yang dipilih)
  const heroLabel = periodeLabel;

  const { page: pageRiwayat, totalPages: totalPagesRiwayat, paginatedItems: riwayatPage, prev: prevRiwayat, next: nextRiwayat } = usePagination(
    displayData,
    [selectedRumahId, search, tagihanGabungan],
  );

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
      <BillSummaryCard
        unitLabel={
          selectedRumahId === "semua"
            ? `Semua Unit (${rumahList.length} Rumah)`
            : (() => {
              const r = rumahList.find((x) => x.id === Number(selectedRumahId));
              return r ? `${r.blokRumah} · ${formatRt(r.rt)}` : "";
            })()
        }
        periodLabel={heroLabel}
        outstanding={ringkasan.totalNominal}
        paidCount={ringkasan.lunas}
        unpaidCount={ringkasan.belumLunas + ringkasan.menunggu}
        loading={loadingTagihan}
      />

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
          activeCount={
            (periodeDari ? 1 : 0) +
            (periodeSampai ? 1 : 0) +
            (filterStatus !== "SEMUA" ? 1 : 0) +
            (selectedRumahId !== "semua" ? 1 : 0)
          }
          open={filterOpen}
          onOpenChange={handleFilterOpenChange}
          onApply={applyFilter}
          onReset={handleResetFilter}
          applyDisabled={!!draftError}
          hint="Maksimal 12 bulan"
        >
          <FilterField label="Periode Dari">
            <div
              className={`ipl-month-input-wrap ${!draftDari ? "has-empty" : ""}`}
              data-placeholder={draftDari ? undefined : "Semua Periode"}
              style={{ position: "relative" }}
            >
              <input
                type="month"
                value={draftDari}
                max={draftSampai || currentYm}
                onChange={(e) => setDraftDari(e.target.value)}
                className="ipl-input"
                style={{ width: "100%" }}
              />
            </div>
          </FilterField>
          <FilterField label="Periode Sampai">
            <div
              className={`ipl-month-input-wrap ${!draftSampai ? "has-empty" : ""}`}
              data-placeholder={draftSampai ? undefined : "Semua Periode"}
              style={{ position: "relative" }}
            >
              <input
                type="month"
                value={draftSampai}
                min={draftDari || undefined}
                max={currentYm}
                onChange={(e) => setDraftSampai(e.target.value)}
                className="ipl-input"
                style={{ width: "100%" }}
              />
            </div>
          </FilterField>
          {draftError && (
            <p style={{ color: "#dc2626", fontSize: 12, margin: 0 }}>{draftError}</p>
          )}
          <FilterField label="Status">
            <Select
              className="ipl-select ipl-select-sm"
              value={draftStatus}
              onChange={(v) => setDraftStatus(v)}
              options={STATUS_FILTER_OPTIONS.map(({ val, label }) => ({ value: val, label }))}
            />
          </FilterField>
          {rumahList.length > 1 && (
            <FilterField label="Unit">
              <Select
                className="ipl-select ipl-select-sm"
                value={draftUnit}
                onChange={(v) => setDraftUnit(v)}
                options={[
                  { value: "semua", label: `Semua Unit (${rumahList.length})` },
                  ...rumahList.map((r) => ({ value: String(r.id), label: `${r.blokRumah} - ${formatRt(r.rt)}` })),
                ]}
              />
            </FilterField>
          )}
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
                    <th>No</th>
                    {rumahList.length > 1 && selectedRumahId === "semua" && <th>Unit</th>}
                    <th>Periode</th>
                    <th>Nominal</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {riwayatPage.map((ipl, index) => (
                    <tr key={ipl.id}>
                      <td>{(pageRiwayat - 1) * 10 + index + 1}</td>
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
                            className="btn-icon"
                            onClick={() => setRiwayatIpl(ipl)}
                            title="Lihat riwayat transaksi"
                            aria-label="Lihat riwayat transaksi"
                          >
                            <Eye size={14} />
                          </button>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="iuran-grid">
              {riwayatPage.map((ipl) => {
                const bisaRiwayat = ipl.statusPembayaran === "LUNAS" && !!ipl.pembayaran?.[0];
                return (
                <div
                  key={ipl.id}
                  className={`iuran-grid-card${bisaRiwayat ? " card-clickable" : ""}`}
                  {...(bisaRiwayat && {
                    role: "button",
                    tabIndex: 0,
                    onClick: () => setRiwayatIpl(ipl),
                    onKeyDown: (e) => { if (e.key === "Enter") setRiwayatIpl(ipl); },
                  })}
                >
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
                        onClick={(e) => { e.stopPropagation(); setModalIpl(ipl); }}
                      >
                        <Upload size={12} /> Bayar
                      </button>
                    ) : (
                      <span />
                    )}
                    <WargaStatusBadge status={ipl.statusPembayaran} />
                  </div>
                </div>
                );
              })}
            </div>
            <Pagination page={pageRiwayat} totalPages={totalPagesRiwayat} total={displayData.length} onPrev={prevRiwayat} onNext={nextRiwayat} />
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
