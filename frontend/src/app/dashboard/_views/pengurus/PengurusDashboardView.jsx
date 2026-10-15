"use client";

import { useEffect, useState } from "react";
import {
  Users, Wallet, AlertTriangle, CheckCircle,
  TrendingUp, Clock, ArrowRight, Megaphone, CalendarDays,
  Calendar, FileText,
} from "lucide-react";
import { iplApi, kegiatanApi, pengumumanApi } from "@/lib/api";
import FilterPopover, { FilterField } from "@/components/ui/FilterPopover";
import Link from "next/link";
import KegiatanDetailModal from "@/components/kegiatan/KegiatanDetailModal";
import PengumumanDetailModal from "@/components/pengumuman/PengumumanDetailModal";
import {
  formatRupiah,
  formatRupiahSingkat,
  BULAN_PENDEK as BULAN_NAMES,
  getCurrentYm,
  formatYmPendek,
  formatTanggalLengkap as formatKegiatanDate,
  formatTanggalPanjang as formatPengumumanDate,
} from "@/lib/format";

// ── Mini Bar Chart (SVG) ──────────────────────────────────────────────────────
function TrenChart({ data }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.kasMasuk), 1);

  return (
    <div className="db-chart-wrap">
      <div className="db-chart-bars">
        {data.map((d, i) => {
          const pct = max > 0 ? (d.kasMasuk / max) * 100 : 0;
          const isLast = i === data.length - 1;
          return (
            <div key={i} className="db-chart-col" title={`${d.label}: ${formatRupiah(d.kasMasuk)}`}>
              <div className="db-bar-wrapper">
                <div
                  className={`db-bar ${isLast ? "db-bar-active" : ""}`}
                  style={{ height: `${Math.max(pct, 4)}%` }}
                />
              </div>
              <span className="db-chart-label">{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Status badge kecil ────────────────────────────────────────────────────────
function StatusDot({ status }) {
  const map = {
    LUNAS: { cls: "dot-lunas", label: "Lunas" },
    BELUM_LUNAS: { cls: "dot-belum", label: "Belum Lunas" },
    MENUNGGU_KONFIRMASI: { cls: "dot-menunggu", label: "Menunggu" },
  };
  const { cls, label } = map[status] || { cls: "", label: status };
  return <span className={`db-status-dot ${cls}`}>{label}</span>;
}


// ── Admin/Pengurus: ringkasan seluruh cluster ─────────────────────────────────
export function PengurusDashboardView({ user }) {
  const formatYm = formatYmPendek;
  const monthDiffInclusive = (dari, sampai) => {
    const [y1, m1] = dari.split("-").map(Number);
    const [y2, m2] = sampai.split("-").map(Number);
    return (y2 - y1) * 12 + (m2 - m1) + 1;
  };

  const [stats, setStats] = useState(null);
  const [loadedKey, setLoadedKey] = useState(null);
  const [periodeDari, setPeriodeDari] = useState(getCurrentYm);
  const [periodeSampai, setPeriodeSampai] = useState(getCurrentYm);
  const [draftDari, setDraftDari] = useState(getCurrentYm);
  const [draftSampai, setDraftSampai] = useState(getCurrentYm);
  const [filterOpen, setFilterOpen] = useState(false);
  const [kegiatan, setKegiatan] = useState([]);
  const [pengumuman, setPengumuman] = useState([]);
  const [selectedKegiatan, setSelectedKegiatan] = useState(null);
  const [selectedPengumuman, setSelectedPengumuman] = useState(null);

  // Normalisasi + validasi turunan (tanpa setState di dalam effect)
  const [dari, sampai] = periodeDari > periodeSampai
    ? [periodeSampai, periodeDari]
    : [periodeDari, periodeSampai];
  const rangeError = monthDiffInclusive(dari, sampai) > 12
    ? "Rentang periode maksimal 12 bulan."
    : "";

  // Validasi draft di dalam popover (sebelum diterapkan)
  const [draftDariN, draftSampaiN] = draftDari > draftSampai
    ? [draftSampai, draftDari]
    : [draftDari, draftSampai];
  const draftError = draftDari && draftSampai && monthDiffInclusive(draftDariN, draftSampaiN) > 12
    ? "Rentang periode maksimal 12 bulan."
    : "";

  // Status loading diturunkan saat render dari kunci filter vs kunci data terakhir,
  // jadi effect di bawah bebas setState sinkron (lolos aturan react-hooks/set-state-in-effect).
  const filterKey = rangeError ? null : `${dari}|${sampai}`;
  const loadingStats = filterKey !== null && filterKey !== loadedKey;

  useEffect(() => {
    if (!filterKey) return;
    let cancelled = false;
    iplApi.getDashboardStats({ dari, sampai })
      .then((s) => {
        if (cancelled) return;
        setStats(s);
        setLoadedKey(filterKey);
      })
      .catch(() => {
        // Gagal muat: hentikan loading, data lama tetap tampil.
        if (!cancelled) setLoadedKey(filterKey);
      });
    return () => { cancelled = true; };
  }, [dari, sampai, rangeError, filterKey]);

  // Sama kayak dashboard warga: kegiatan yang belum lewat tanggalnya + pengumuman aktif,
  // biar pengurus juga bisa lihat sekilas apa yang tampil ke warga tanpa pindah menu.
  useEffect(() => {
    let cancelled = false;
    async function loadKegiatan() {
      let data = await kegiatanApi.getFeed().catch(() => null);
      if (!Array.isArray(data)) data = await kegiatanApi.getActive().catch(() => []);
      if (cancelled) return;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const akanDatang = (data || []).filter((k) => {
        const t = new Date(k.tanggalAcara);
        return Number.isNaN(t.getTime()) || t >= today;
      });
      akanDatang.sort((a, b) => new Date(a.tanggalAcara).getTime() - new Date(b.tanggalAcara).getTime());
      setKegiatan(akanDatang);
    }
    loadKegiatan();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadPengumuman() {
      let data = await pengumumanApi.getFeed().catch(() => null);
      if (!Array.isArray(data)) data = await pengumumanApi.getActive().catch(() => []);
      if (cancelled) return;
      const terbaru = [...(data || [])].sort((a, b) => new Date(b.createDate || 0) - new Date(a.createDate || 0));
      setPengumuman(terbaru);
    }
    loadPengumuman();
    return () => { cancelled = true; };
  }, []);

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

  const isDefaultPeriode = periodeDari === getCurrentYm() && periodeSampai === getCurrentYm();
  const periodeLabel = periodeDari === periodeSampai
    ? formatYm(periodeDari)
    : `${formatYm(periodeDari)} - ${formatYm(periodeSampai)}`;

  const userName = user?.nama || user?.name || "Admin";

  return (
    <div className="page-stack">

      {/* ── Welcome + Filter Periode (satu field) ── */}
      <section className="welcome-banner">
        <h2 className="welcome-banner-title">Selamat datang kembali, {userName}</h2>
        <p className="welcome-banner-sub">Ini ringkasan aktivitas cluster Topaz periode {periodeLabel}.</p>
        <FilterPopover
          active={!isDefaultPeriode}
          activeCount={!isDefaultPeriode ? 1 : 0}
          label={isDefaultPeriode ? "Filter periode" : periodeLabel}
          hint="Maksimal 12 bulan · Total Warga tidak ikut filter"
          open={filterOpen}
          onOpenChange={setFilterOpen}
          onOpen={openFilter}
          onApply={applyFilter}
          onReset={handleResetPeriode}
          applyDisabled={!!draftError}
        >
          <FilterField label="Dari">
            <input
              type="month"
              className="form-control"
              value={draftDari}
              max={draftSampai || getCurrentYm()}
              onChange={(e) => e.target.value && setDraftDari(e.target.value)}
            />
          </FilterField>
          <FilterField label="Sampai">
            <input
              type="month"
              className="form-control"
              value={draftSampai}
              min={draftDari || undefined}
              max={getCurrentYm()}
              onChange={(e) => e.target.value && setDraftSampai(e.target.value)}
            />
          </FilterField>
          {draftError && (
            <p style={{ color: "#dc2626", fontSize: 12, margin: 0 }}>{draftError}</p>
          )}
        </FilterPopover>
      </section>

      {/* ── Alert: menunggu konfirmasi ── */}
      {stats?.menungguKonfirmasi > 0 && (
        <Link href="/dashboard/kelola-ipl/tagihan-warga" className="ipl-dashboard-alert">
          <AlertTriangle size={18} />
          <span>
            Ada <strong>{stats.menungguKonfirmasi} pembayaran</strong> menunggu konfirmasi
          </span>
          <ArrowRight size={16} style={{ marginLeft: "auto" }} />
        </Link>
      )}

      {/* ── Metric Cards — Beranda (tint redesign, selaras Keuangan/Iuran) ── */}
      <section className="ipl-summary-grid keu-summary-grid">

        {/* Kas Masuk */}
        <Link href="/dashboard/kelola-ipl/tagihan-warga" className="ipl-summary-card keu-card keu-teal">
          <div className="keu-icon-circle"><Wallet size={22} strokeWidth={2} /></div>
          <div className="keu-card-text">
            <span className="ipl-summary-label">Total Pembayaran IPL</span>
            <span className="ipl-summary-value">
              {loadingStats ? "-" : formatRupiahSingkat(stats?.totalKasMasukBulanIni ?? 0)}
            </span>
          </div>
        </Link>

        {/* Lunas */}
        <Link href="/dashboard/kelola-ipl/tagihan-warga" className="ipl-summary-card keu-card keu-green">
          <div className="keu-icon-circle"><CheckCircle size={22} strokeWidth={2} /></div>
          <div className="keu-card-text">
            <span className="ipl-summary-label">Rumah Lunas</span>
            <span className="ipl-summary-value">
              {loadingStats ? "-" : `${stats?.lunasBulanIni ?? 0} / ${stats?.totalTagihanBulanIni ?? 0}`}
            </span>
          </div>
        </Link>

        {/* Menunggu Konfirmasi */}
        <Link href="/dashboard/kelola-ipl/tagihan-warga" className="ipl-summary-card keu-card keu-amber">
          <div className="keu-icon-circle"><Clock size={22} strokeWidth={2} /></div>
          <div className="keu-card-text">
            <span className="ipl-summary-label">Menunggu Konfirmasi</span>
            <span className="ipl-summary-value">
              {loadingStats ? "-" : (stats?.menungguKonfirmasi ?? 0)}
            </span>
          </div>
        </Link>

        {/* Total Warga */}
        <Link href="/dashboard/data-warga" className="ipl-summary-card keu-card keu-purple">
          <div className="keu-icon-circle"><Users size={22} strokeWidth={2} /></div>
          <div className="keu-card-text">
            <span className="ipl-summary-label">Total Warga</span>
            <span className="ipl-summary-value">
              {loadingStats ? "-" : (stats?.totalWarga ?? "-")}
            </span>
          </div>
        </Link>

      </section>

      {/* ── Chart + Tabel row ── */}
      <div className="db-bottom-row">

        {/* Mini Chart: Tren 6 bulan */}
        <div className="content-card db-chart-card">
          <div className="db-section-header">
            <TrendingUp size={17} />
            <h3>Tren Kas Masuk IPL</h3>
            <span className="db-section-sub">{periodeLabel}</span>
          </div>
          {loadingStats || !stats?.trenPemasukan ? (
            <div className="db-chart-loading">Memuat grafik...</div>
          ) : (
            <>
              <TrenChart data={stats.trenPemasukan} />
              {/* Legend angka bulan terakhir */}
              <div className="db-chart-legend">
                {stats.trenPemasukan.map((d, i) => (
                  <div key={i} className="db-legend-item">
                    <span className="db-legend-label">{d.label}</span>
                    <span className="db-legend-value">{formatRupiah(d.kasMasuk)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Tabel: 5 pembayaran terbaru */}
        <div className="content-card db-recent-card">
          <div className="db-section-header">
            <Clock size={17} />
            <h3>Pembayaran Terbaru</h3>
            <div className="db-section-header-right">
              <span className="db-section-sub">{periodeLabel}</span>
              <Link href="/dashboard/kelola-ipl/tagihan-warga" className="db-section-link">
                Lihat semua <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          {loadingStats ? (
            <div className="db-chart-loading">Memuat data...</div>
          ) : !stats?.pembayaranTerbaru?.length ? (
            <div className="db-empty-recent">Belum ada pembayaran pada periode {periodeLabel}.</div>
          ) : (
            <div className="db-recent-list">
              {stats.pembayaranTerbaru.map((p) => (
                <div key={p.idPembayaran} className="db-recent-item">
                  <div className="db-recent-avatar">
                    {p.user?.namaUser?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="db-recent-info">
                    <span className="db-recent-name">{p.user?.namaUser ?? "-"}</span>
                    <span className="db-recent-sub">
                      {p.ipl?.rumah?.blokRumah} · {BULAN_NAMES[p.ipl?.bulanPeriode]} {p.ipl?.tahunPeriode}
                    </span>
                  </div>
                  <div className="db-recent-right">
                    <span className="db-recent-nominal">{formatRupiah(p.nominal)}</span>
                    <StatusDot status={p.ipl?.statusPembayaran} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Kegiatan Cluster */}
      <section className="content-card">
        <div className="db-section-header">
          <CalendarDays size={17} />
          <h3>Kegiatan Cluster</h3>
          <div className="db-section-header-right">
            <Link href="/dashboard/kegiatan" className="db-section-link">
              Lihat semua <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {kegiatan.length === 0 ? (
          <div className="portal-empty-notice">
            <CalendarDays size={32} />
            <p>Belum ada kegiatan akan datang.</p>
          </div>
        ) : (
          <div className="portal-kegiatan-grid">
            {kegiatan.map((k) => (
              <div
                key={k.id}
                className="portal-kegiatan-card"
                role="button"
                tabIndex={0}
                onClick={() => setSelectedKegiatan(k)}
                onKeyDown={(e) => { if (e.key === "Enter") setSelectedKegiatan(k); }}
              >
                {k.gambarUrl && (
                  <div className="portal-kegiatan-img-wrap">
                    <img
                      src={kegiatanApi.imageUrl(k.gambarUrl)}
                      alt={k.judul}
                      className="portal-kegiatan-img"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  </div>
                )}
                <div className="portal-kegiatan-body">
                  <h3 className="portal-kegiatan-title">{k.judul}</h3>
                  {k.deskripsi && (
                    <p className="portal-kegiatan-desc">{k.deskripsi}</p>
                  )}
                  <div className="portal-kegiatan-meta">
                    <span className="meta-item"><Calendar size={13} /> {formatKegiatanDate(k.tanggalAcara)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Pengumuman */}
      <section className="content-card">
        <div className="db-section-header">
          <Megaphone size={17} />
          <h3>Pengumuman</h3>
          <div className="db-section-header-right">
            <Link href="/dashboard/pengumuman" className="db-section-link">
              Lihat semua <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {pengumuman.length === 0 ? (
          <p className="portal-empty-text">Belum ada pengumuman aktif saat ini.</p>
        ) : (
          <div className="portal-card-list">
            {pengumuman.map((p) => (
              <div
                key={p.id}
                className="portal-info-card"
                role="button"
                tabIndex={0}
                onClick={() => setSelectedPengumuman(p)}
                onKeyDown={(e) => { if (e.key === "Enter") setSelectedPengumuman(p); }}
              >
                <div className="portal-info-card-icon">
                  <Megaphone size={18} />
                </div>
                <div className="portal-info-card-body">
                  <h3 className="portal-info-card-title">{p.judul}</h3>
                  {p.keteranganPengumuman && (
                    <p className="portal-info-card-desc">{p.keteranganPengumuman}</p>
                  )}
                  <div className="portal-info-card-meta">
                    <span className="meta-item"><Calendar size={12} /> {formatPengumumanDate(p.createDate)}</span>
                    {p.filePengumuman && (
                      <span className="portal-download-link">
                        <FileText size={12} /> Ada lampiran
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {selectedKegiatan && (
        <KegiatanDetailModal kegiatan={selectedKegiatan} onClose={() => setSelectedKegiatan(null)} />
      )}
      {selectedPengumuman && (
        <PengumumanDetailModal pengumuman={selectedPengumuman} onClose={() => setSelectedPengumuman(null)} />
      )}
    </div>
  );
}

