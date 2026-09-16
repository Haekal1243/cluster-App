"use client";

import { useEffect, useRef, useState } from "react";
import {
  Users, Wallet, AlertTriangle, CheckCircle,
  TrendingUp, Clock, ArrowRight, Home, CreditCard, Megaphone, CalendarDays,
  Calendar, FileText,
} from "lucide-react";
import { iplApi, portalApi, kegiatanApi, pengumumanApi, keuanganApi } from "@/lib/api";
import Link from "next/link";
import KegiatanDetailModal from "@/components/kegiatan/KegiatanDetailModal";
import PengumumanDetailModal from "@/components/pengumuman/PengumumanDetailModal";

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatRupiah(n) {
  if (!n && n !== 0) return "—";
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}rb`;
  return `Rp ${n}`;
}

function formatRupiahFull(n) {
  if (!n && n !== 0) return "—";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

const BULAN_NAMES = {
  "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr",
  "05": "Mei", "06": "Jun", "07": "Jul", "08": "Agu",
  "09": "Sep", "10": "Okt", "11": "Nov", "12": "Des",
};

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
            <div key={i} className="db-chart-col" title={`${d.label}: ${formatRupiahFull(d.kasMasuk)}`}>
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

function StatusBadge({ status }) {
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

const MONTHS = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

function getMonthLabel(bulan, tahun) {
  const m = parseInt(bulan, 10);
  return `${MONTHS[m - 1] || bulan} ${tahun}`;
}

function formatKegiatanDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function formatPengumumanDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
  });
}

// ── Admin/Pengurus: ringkasan seluruh cluster ─────────────────────────────────
function AdminDashboardView({ user }) {
  const getCurrentYm = () => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
  };
  const formatYm = (ym) => {
    if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return ym || "—";
    const [y, m] = ym.split("-");
    return `${MONTHS[parseInt(m, 10) - 1] || m} ${y}`;
  };
  const monthDiffInclusive = (dari, sampai) => {
    const [y1, m1] = dari.split("-").map(Number);
    const [y2, m2] = sampai.split("-").map(Number);
    return (y2 - y1) * 12 + (m2 - m1) + 1;
  };

  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [periodeDari, setPeriodeDari] = useState(getCurrentYm);
  const [periodeSampai, setPeriodeSampai] = useState(getCurrentYm);
  const [draftDari, setDraftDari] = useState(getCurrentYm);
  const [draftSampai, setDraftSampai] = useState(getCurrentYm);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef(null);

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

  useEffect(() => {
    if (rangeError) return;
    setLoadingStats(true);
    iplApi.getDashboardStats({ dari, sampai })
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoadingStats(false));
  }, [dari, sampai, rangeError]);

  // Ringkasan keuangan mengikuti periode yang sama
  const [keuangan, setKeuangan] = useState(null);
  const [loadingKeu, setLoadingKeu] = useState(true);

  useEffect(() => {
    if (rangeError) return;
    setLoadingKeu(true);
    keuanganApi.getRingkasan({ dari, sampai })
      .then(setKeuangan)
      .catch(() => {})
      .finally(() => setLoadingKeu(false));
  }, [dari, sampai, rangeError]);

  // Tutup popover saat klik di luar / tekan Escape
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
    : `${formatYm(periodeDari)} – ${formatYm(periodeSampai)}`;

  const userName = user?.nama || user?.name || "Admin";

  return (
    <div className="page-stack">

      {/* ── Welcome + Filter Periode (satu field) ── */}
      <section className="welcome-banner" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2>Selamat datang kembali, {userName} 👋</h2>
          <p>Ini ringkasan aktivitas cluster Topaz periode {periodeLabel}.</p>
        </div>
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
              padding: "8px 14px", borderRadius: 999, cursor: "pointer",
              background: isDefaultPeriode ? "rgba(255,255,255,.14)" : "#fff",
              border: `1px solid ${isDefaultPeriode ? "rgba(255,255,255,.45)" : "#fff"}`,
              boxShadow: filterOpen
                ? "0 0 0 3px rgba(255,255,255,.35)"
                : isDefaultPeriode ? "none" : "0 4px 12px rgba(0,0,0,.25)",
              fontSize: 13, fontWeight: 600,
              color: isDefaultPeriode ? "#fff" : "#1d4ed8",
              whiteSpace: "nowrap",
              transition: "background .15s ease, border-color .15s ease, color .15s ease",
            }}
            onMouseEnter={(e) => {
              if (isDefaultPeriode) {
                e.currentTarget.style.background = "rgba(255,255,255,.24)";
              } else {
                e.currentTarget.style.background = "#eff6ff";
              }
            }}
            onMouseLeave={(e) => {
              if (isDefaultPeriode) {
                e.currentTarget.style.background = "rgba(255,255,255,.14)";
              } else {
                e.currentTarget.style.background = "#fff";
              }
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
                position: "absolute", right: 0, top: "calc(100% + 8px)", zIndex: 30,
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
                Maksimal 12 bulan · Total Warga tidak ikut filter
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Alert: menunggu konfirmasi ── */}
      {stats?.menungguKonfirmasi > 0 && (
        <Link href="/dashboard/iuran" className="ipl-dashboard-alert">
          <AlertTriangle size={18} />
          <span>
            Ada <strong>{stats.menungguKonfirmasi} pembayaran</strong> menunggu konfirmasi
            — klik untuk meninjau.
          </span>
          <ArrowRight size={16} style={{ marginLeft: "auto" }} />
        </Link>
      )}

      {/* ── Metric Cards ── */}
      <section className="db-metric-grid">

        {/* Kas Masuk */}
        <Link href="/dashboard/iuran" className="db-metric-card db-card-primary">
          <div className="db-metric-icon"><Wallet size={22} /></div>
          <div className="db-metric-body">
            <span className="db-metric-label">Total Kas Masuk Periode</span>
            <span className="db-metric-value">
              {loadingStats ? "—" : formatRupiah(stats?.totalKasMasukBulanIni ?? 0)}
            </span>
            <span className="db-metric-sub">
              {stats ? `dari ${formatRupiahFull((stats.totalTagihanBulanIni ?? 0) * (stats.totalKasMasukBulanIni / Math.max(stats.lunasBulanIni, 1) || 0))}` : ""}
            </span>
          </div>
        </Link>

        {/* Lunas */}
        <Link href="/dashboard/iuran" className="db-metric-card db-card-success">
          <div className="db-metric-icon"><CheckCircle size={22} /></div>
          <div className="db-metric-body">
            <span className="db-metric-label">Rumah Lunas</span>
            <span className="db-metric-value">
              {loadingStats ? "—" : `${stats?.lunasBulanIni ?? 0} / ${stats?.totalTagihanBulanIni ?? 0}`}
            </span>
            <span className="db-metric-sub">
              {stats?.totalTagihanBulanIni > 0
                ? `${Math.round(((stats?.lunasBulanIni ?? 0) / stats.totalTagihanBulanIni) * 100)}% sudah lunas`
                : "belum ada tagihan"}
            </span>
          </div>
        </Link>

        {/* Menunggu Konfirmasi */}
        <Link href="/dashboard/iuran" className={`db-metric-card ${stats?.menungguKonfirmasi > 0 ? "db-card-warning" : "db-card-muted"}`}>
          <div className="db-metric-icon"><Clock size={22} /></div>
          <div className="db-metric-body">
            <span className="db-metric-label">Menunggu Konfirmasi</span>
            <span className="db-metric-value">
              {loadingStats ? "—" : (stats?.menungguKonfirmasi ?? 0)}
            </span>
            <span className="db-metric-sub">bukti transfer perlu ditinjau</span>
          </div>
        </Link>

        {/* Total Warga */}
        <Link href="/dashboard/warga" className="db-metric-card db-card-info">
          <div className="db-metric-icon"><Users size={22} /></div>
          <div className="db-metric-body">
            <span className="db-metric-label">Total Warga</span>
            <span className="db-metric-value">
              {loadingStats ? "—" : (stats?.totalWarga ?? "—")}
            </span>
            <span className="db-metric-sub">akun terdaftar</span>
          </div>
        </Link>

      </section>

      {/* ── Ringkasan Keuangan ── */}
      <div className="content-card">
        <div className="db-section-header">
          <Wallet size={17} />
          <h3>Keuangan Kas</h3>
          <span className="db-section-sub">{periodeLabel}</span>
          <Link href="/dashboard/keuangan" className="db-section-link">
            Lihat laporan <ArrowRight size={13} />
          </Link>
        </div>
        {loadingKeu ? (
          <div className="db-chart-loading">Memuat data keuangan...</div>
        ) : (
          <div className="db-metric-grid" style={{ marginTop: 4 }}>
            <div className="db-recent-item" style={{ cursor: "default" }}>
              <div className="db-metric-body">
                <span className="db-metric-label">Saldo Kas</span>
                <span className="db-metric-value">
                  {formatRupiah(keuangan?.saldoKas ?? 0)}
                </span>
                <span className="db-metric-sub">kumulatif</span>
              </div>
            </div>
            <div className="db-recent-item" style={{ cursor: "default" }}>
              <div className="db-metric-body">
                <span className="db-metric-label">Pemasukan</span>
                <span className="db-metric-value">
                  {formatRupiah(keuangan?.totalPemasukan ?? 0)}
                </span>
                <span className="db-metric-sub">
                  IPL {formatRupiah(keuangan?.pemasukanIpl?.total ?? 0)}
                </span>
              </div>
            </div>
            <div className="db-recent-item" style={{ cursor: "default" }}>
              <div className="db-metric-body">
                <span className="db-metric-label">Pengeluaran</span>
                <span className="db-metric-value">
                  {formatRupiah(keuangan?.totalPengeluaran ?? 0)}
                </span>
                <span className="db-metric-sub">{periodeLabel}</span>
              </div>
            </div>
          </div>
        )}
      </div>

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
            <span className="db-section-sub">{periodeLabel}</span>
            <Link href="/dashboard/iuran" className="db-section-link">
              Lihat semua <ArrowRight size={13} />
            </Link>
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
                    <span className="db-recent-name">{p.user?.namaUser ?? "—"}</span>
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
    </div>
  );
}

// ── Warga: dashboard pribadi (tagihan + kegiatan + pengumuman) ────────────────
function WargaDashboardView({ user }) {
  const [rumahList, setRumahList] = useState([]);
  const [tagihanBulanIniList, setTagihanBulanIniList] = useState([]);
  const [summaryBulanIni, setSummaryBulanIni] = useState(null);
  const [kegiatan, setKegiatan] = useState([]);
  const [pengumuman, setPengumuman] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedKegiatan, setSelectedKegiatan] = useState(null);
  const [selectedPengumuman, setSelectedPengumuman] = useState(null);

  useEffect(() => {
    const now = new Date();
    const bulanIni = String(now.getMonth() + 1).padStart(2, "0");
    const tahunIni = String(now.getFullYear());

    async function fetchData() {
      try {
        try {
          const res = await portalApi.getTagihanByUser(user.id, { bulan: bulanIni, tahun: tahunIni });
          setRumahList(res.rumah || []);
          setTagihanBulanIniList(res.tagihan || []);
          const key = `${bulanIni}/${tahunIni}`;
          setSummaryBulanIni(res.summaryByPeriode?.[key] || res.totalSummary || null);
        } catch (e) {
          console.warn("getTagihanByUser gagal, fallback ke per-rumah:", e);
          const rumah = await portalApi.getRumahByUser(user.id);
          setRumahList(rumah);
          const allTagihan = [];
          for (const r of rumah) {
            try {
              const { tagihan } = await portalApi.getTagihanByRumah(r.id);
              const filtered = (tagihan || []).filter(
                (t) => t.bulanPeriode === bulanIni && t.tahunPeriode === tahunIni
              );
              allTagihan.push(...filtered.map((t) => ({ ...t, rumah: r })));
            } catch (rumahErr) {
              console.warn(`Gagal memuat tagihan rumah ${r.id}:`, rumahErr);
            }
          }
          setTagihanBulanIniList(allTagihan);
          setSummaryBulanIni({
            totalNominal: allTagihan.reduce((s, t) => s + (t.nominal || 0), 0),
            totalTagihan: allTagihan.length,
            lunas: allTagihan.filter((t) => t.statusPembayaran === "LUNAS").length,
            belumLunas: allTagihan.filter((t) => t.statusPembayaran === "BELUM_LUNAS").length,
            menunggu: allTagihan.filter((t) => t.statusPembayaran === "MENUNGGU_KONFIRMASI").length,
          });
        }

        const [keg, peng] = await Promise.all([
          kegiatanApi.getActive().catch(() => []),
          pengumumanApi.getActive().catch(() => []),
        ]);
        setKegiatan(keg || []);
        setPengumuman(peng || []);
      } catch (err) {
        console.error("Gagal memuat data dashboard warga:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user.id]);

  if (loading) {
    return (
      <div className="portal-loading">
        <div className="portal-spinner" />
        <p>Memuat data...</p>
      </div>
    );
  }

  const adaBelumLunas = tagihanBulanIniList.some((t) => t.statusPembayaran === "BELUM_LUNAS");
  const semuaLunas =
    tagihanBulanIniList.length > 0 &&
    tagihanBulanIniList.every((t) => t.statusPembayaran === "LUNAS");
  const adaMenunggu = tagihanBulanIniList.some((t) => t.statusPembayaran === "MENUNGGU_KONFIRMASI");
  const totalBelumBayar = tagihanBulanIniList
    .filter((t) => t.statusPembayaran === "BELUM_LUNAS" || t.statusPembayaran === "MENUNGGU_KONFIRMASI")
    .reduce((s, t) => s + (t.nominal || 0), 0);
  const tagihanPerRumah = rumahList.map((r) => {
    const tag = tagihanBulanIniList.find((t) => (t.rumah?.id ?? t.idRumah) === r.id);
    return { rumah: r, tagihan: tag || null };
  });

  const firstName = (user?.nama || user?.name || "Warga").split(" ")[0];
  const nowDate = new Date();
  const periodeBulanIni = getMonthLabel(
    String(nowDate.getMonth() + 1).padStart(2, "0"),
    String(nowDate.getFullYear())
  );
  const countLunas = summaryBulanIni?.lunas ?? tagihanBulanIniList.filter((t) => t.statusPembayaran === "LUNAS").length;
  const countBelum = summaryBulanIni?.belumLunas ?? tagihanBulanIniList.filter((t) => t.statusPembayaran === "BELUM_LUNAS").length;
  const countMenunggu = summaryBulanIni?.menunggu ?? tagihanBulanIniList.filter((t) => t.statusPembayaran === "MENUNGGU_KONFIRMASI").length;

  return (
    <div className="page-stack warga-dashboard">
      {/* Hero: sapaan + sisa tagihan bulan ini + CTA */}
      <section className={`portal-hero ${semuaLunas ? "is-success" : ""}`}>
        <div className="portal-hero-accent" aria-hidden />
        <div className="portal-hero-main">
          <div className="portal-hero-left">
            <p className="portal-hero-eyebrow">Dashboard Warga · RW 21 · Cluster Topaz</p>
            <h2>Halo, {firstName} 👋</h2>
            <p className="portal-hero-sub">
              {rumahList.length > 1
                ? `Kelola ${rumahList.length} unit rumah Anda dalam satu tempat.`
                : "Selamat datang di Dashboard Warga Cluster Topaz."}
            </p>
            <div className="portal-hero-meta">
              <span className="portal-hero-periode">
                <Wallet size={13} /> IPL {periodeBulanIni}
                {rumahList.length > 1 ? ` · ${rumahList.length} unit` : ""}
              </span>
              {tagihanBulanIniList.length > 0 && (
                <span className="portal-hero-summary">
                  {countLunas} lunas · {countBelum} belum
                  {countMenunggu > 0 ? ` · ${countMenunggu} menunggu` : ""}
                </span>
              )}
            </div>
          </div>
          <div className="portal-hero-right">
            <span className="portal-hero-label">Sisa Tagihan Bulan Ini</span>
            {tagihanBulanIniList.length > 0 ? (
              <>
                <span className="portal-hero-value">
                  Rp {totalBelumBayar.toLocaleString("id-ID")}
                </span>
                {semuaLunas ? (
                  <StatusBadge status="LUNAS" />
                ) : adaMenunggu ? (
                  <StatusBadge status="MENUNGGU_KONFIRMASI" />
                ) : (
                  <StatusBadge status="BELUM_LUNAS" />
                )}
                {adaBelumLunas ? (
                  <Link href="/dashboard/iuran" className="portal-hero-btn">
                    Bayar Sekarang <ArrowRight size={15} />
                  </Link>
                ) : (
                  <Link href="/dashboard/iuran" className="portal-hero-btn ghost">
                    Lihat Riwayat <ArrowRight size={15} />
                  </Link>
                )}
              </>
            ) : (
              <>
                <span className="portal-hero-value muted">Belum ada tagihan</span>
                <span className="portal-hero-summary">Tagihan IPL bulan ini belum diterbitkan.</span>
              </>
            )}
          </div>
        </div>
        <div className="portal-hero-orb orb-a" aria-hidden />
        <div className="portal-hero-orb orb-b" aria-hidden />
      </section>

      {/* Stat Cards */}
      <section className="portal-stat-row">
        <div className={`portal-stat-card ${semuaLunas ? "card-success" : adaMenunggu ? "card-warning" : "card-danger"}`}>
          <div className="portal-stat-icon">
            <CreditCard size={22} />
          </div>
          <div className="portal-stat-body">
            <span className="portal-stat-label">
              Sisa Tagihan Bulan Ini{rumahList.length > 1 ? ` (${rumahList.length} Rumah)` : ""}
            </span>
            {tagihanBulanIniList.length > 0 ? (
              <>
                <span className="portal-stat-value">
                  Rp {totalBelumBayar.toLocaleString("id-ID")}
                </span>
                <span className="portal-stat-sub">
                  {summaryBulanIni ? (
                    <>
                      {summaryBulanIni.lunas || 0} lunas · {summaryBulanIni.belumLunas || 0} belum lunas
                      {(summaryBulanIni.menunggu || 0) > 0 ? ` · ${summaryBulanIni.menunggu} menunggu` : ""}
                    </>
                  ) : (
                    <>
                      {tagihanBulanIniList.filter((t) => t.statusPembayaran === "LUNAS").length} lunas ·{" "}
                      {tagihanBulanIniList.filter((t) => t.statusPembayaran !== "LUNAS").length} belum lunas
                    </>
                  )}
                </span>
                {semuaLunas ? (
                  <StatusBadge status="LUNAS" />
                ) : adaMenunggu ? (
                  <StatusBadge status="MENUNGGU_KONFIRMASI" />
                ) : (
                  <StatusBadge status="BELUM_LUNAS" />
                )}
              </>
            ) : (
              <span className="portal-stat-value portal-no-data">Belum ada tagihan</span>
            )}
          </div>
        </div>

        <div className="portal-stat-card card-info">
          <div className="portal-stat-icon">
            <Home size={22} />
          </div>
          <div className="portal-stat-body">
            <span className="portal-stat-label">Unit Rumah</span>
            <span className="portal-stat-value">{rumahList.length} Unit</span>
            <span className="portal-stat-sub">
              {rumahList.length > 1
                ? `Anda memiliki ${rumahList.length} unit rumah`
                : rumahList.length === 1
                  ? `${rumahList[0].blokRumah} (${String(rumahList[0].rt || "").replace("_", " ")})`
                  : "Belum terdaftar"}
            </span>
          </div>
        </div>
      </section>

      {/* Quick Action — tampil jika ada tagihan belum lunas di salah satu rumah */}
      {adaBelumLunas && (
        <section className="portal-action-banner">
          <div className="portal-action-text">
            <AlertTriangle size={18} />
            <span>
              Ada {tagihanBulanIniList.filter((t) => t.statusPembayaran === "BELUM_LUNAS").length} tagihan IPL bulan ini belum dibayar
              {rumahList.length > 1 ? ` (${rumahList.length} unit rumah)` : ""}
            </span>
          </div>
          <Link href="/dashboard/iuran" className="portal-action-btn">
            Bayar Sekarang
          </Link>
        </section>
      )}

      {/* Unit Rumah Saya */}
      <section className="content-card">
        <div className="db-section-header">
          <Home size={17} />
          <h3>Unit Rumah Saya</h3>
          {rumahList.length > 0 && (
            <Link href="/dashboard/iuran" className="db-section-link">
              Lihat tagihan <ArrowRight size={13} />
            </Link>
          )}
        </div>

        {rumahList.length === 0 ? (
          <div className="portal-empty-notice">
            <Home size={32} />
            <p><strong>Rumah belum terdaftar</strong></p>
            <p>Silakan hubungi pengurus cluster untuk menghubungkan akun Anda dengan data rumah.</p>
          </div>
        ) : (
          <ul className="portal-pengumuman-list">
            {tagihanPerRumah.map(({ rumah, tagihan }) => (
              <li key={rumah.id} className="portal-pengumuman-item">
                <div style={{ flex: 1 }}>
                  <p className="portal-peng-judul">
                    {rumah.blokRumah} — {String(rumah.rt || "").replace("_", " ")}
                  </p>
                  <p className="portal-peng-desc">
                    {tagihan
                      ? (
                        <>
                          <span className="unit-nominal">Rp {(tagihan.nominal || 0).toLocaleString("id-ID")}</span>
                          {` · ${getMonthLabel(tagihan.bulanPeriode, tagihan.tahunPeriode)}`}
                        </>
                      )
                      : "Belum ada tagihan bulan ini"}
                  </p>
                </div>
                <div>
                  {tagihan ? (
                    <StatusBadge status={tagihan.statusPembayaran} />
                  ) : (
                    <span className="text-muted text-sm">—</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Kegiatan Cluster */}
      <section className="content-card">
        <div className="db-section-header">
          <CalendarDays size={17} />
          <h3>Kegiatan Cluster</h3>
        </div>

        {kegiatan.length === 0 ? (
          <div className="portal-empty-notice">
            <CalendarDays size={32} />
            <p>Belum ada kegiatan aktif saat ini.</p>
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
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

  return user?.role === "WARGA" ? <WargaDashboardView user={user} /> : <AdminDashboardView user={user} />;
}
