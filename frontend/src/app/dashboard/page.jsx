"use client";

import { useEffect, useRef, useState } from "react";
import {
  Users, Wallet, AlertTriangle, CheckCircle,
  TrendingUp, Clock, ArrowRight, Home, CreditCard, Megaphone, CalendarDays,
  Calendar, FileText, ChevronDown, Check,
} from "lucide-react";
import { iplApi, portalApi, kegiatanApi, pengumumanApi } from "@/lib/api";
import { can, isWargaView } from "@/lib/session";
import PanelSistem from "@/components/dashboard/PanelSistem";
import { useUser } from "@/lib/useUser";
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

      {/* ── Metric Cards — Beranda (tint redesign, selaras Keuangan/Iuran) ── */}
      <section className="ipl-summary-grid keu-summary-grid">

        {/* Kas Masuk */}
        <Link href="/dashboard/iuran" className="ipl-summary-card keu-card keu-teal">
          <div className="keu-card-head">
            <div className="keu-icon-circle"><Wallet size={18} strokeWidth={2} /></div>
            <span className="ipl-summary-label">Total Pembayaran IPL</span>
          </div>
          <span className="ipl-summary-value">
            {loadingStats ? "—" : formatRupiah(stats?.totalKasMasukBulanIni ?? 0)}
          </span>
          <span className="ipl-summary-sub">{dari === sampai ? periodeLabel : `${formatYm(dari)} – ${formatYm(sampai)}`}</span>
        </Link>

        {/* Lunas */}
        <Link href="/dashboard/iuran" className="ipl-summary-card keu-card keu-green">
          <div className="keu-card-head">
            <div className="keu-icon-circle"><CheckCircle size={18} strokeWidth={2} /></div>
            <span className="ipl-summary-label">Rumah Lunas</span>
          </div>
          <span className="ipl-summary-value">
            {loadingStats ? "—" : `${stats?.lunasBulanIni ?? 0} / ${stats?.totalTagihanBulanIni ?? 0}`}
          </span>
          <span className="ipl-summary-sub">
            {stats?.totalTagihanBulanIni > 0
              ? `${Math.round(((stats?.lunasBulanIni ?? 0) / stats.totalTagihanBulanIni) * 100)}% sudah lunas`
              : "belum ada tagihan"}
          </span>
        </Link>

        {/* Menunggu Konfirmasi */}
        <Link href="/dashboard/iuran" className={`ipl-summary-card keu-card ${stats?.menungguKonfirmasi > 0 ? "keu-amber" : "keu-muted"}`}>
          <div className="keu-card-head">
            <div className="keu-icon-circle"><Clock size={18} strokeWidth={2} /></div>
            <span className="ipl-summary-label">Menunggu Konfirmasi</span>
          </div>
          <span className="ipl-summary-value">
            {loadingStats ? "—" : (stats?.menungguKonfirmasi ?? 0)}
          </span>
          <span className="ipl-summary-sub">bukti transfer perlu ditinjau</span>
        </Link>

        {/* Total Warga */}
        <Link href="/dashboard/warga" className="ipl-summary-card keu-card keu-teal">
          <div className="keu-card-head">
            <div className="keu-icon-circle"><Users size={18} strokeWidth={2} /></div>
            <span className="ipl-summary-label">Total Warga</span>
          </div>
          <span className="ipl-summary-value">
            {loadingStats ? "—" : (stats?.totalWarga ?? "—")}
          </span>
          <span className="ipl-summary-sub">akun terdaftar</span>
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
  const [tagihanAllList, setTagihanAllList] = useState([]);
  const [kegiatan, setKegiatan] = useState([]);
  const [pengumuman, setPengumuman] = useState([]);
  const [kegiatanScope, setKegiatanScope] = useState("aktif");
  const [pengumumanScope, setPengumumanScope] = useState("aktif");
  const [loading, setLoading] = useState(true);
  const [selectedKegiatan, setSelectedKegiatan] = useState(null);
  const [selectedPengumuman, setSelectedPengumuman] = useState(null);
  const [expandedKeys, setExpandedKeys] = useState(() => new Set());
  const [expandInitDone, setExpandInitDone] = useState(false);

  const now = new Date();
  const bulanIni = String(now.getMonth() + 1).padStart(2, "0");
  const tahunIni = String(now.getFullYear());

  // Fetch semua tagihan lintas periode (tanpa filter bulan) — Task 1
  useEffect(() => {
    async function fetchData() {
      try {
        try {
          const res = await portalApi.getTagihanByUser(user.id);
          setRumahList(res.rumah || []);
          setTagihanAllList(res.tagihan || []);
        } catch (e) {
          console.warn("getTagihanByUser gagal, fallback ke per-rumah:", e);
          const rumah = await portalApi.getRumahByUser(user.id);
          setRumahList(rumah);
          const allTagihan = [];
          for (const r of rumah) {
            try {
              const { tagihan } = await portalApi.getTagihanByRumah(r.id);
              allTagihan.push(...(tagihan || []).map((t) => ({ ...t, rumah: { id: r.id, blokRumah: r.blokRumah, rt: r.rt } })));
            } catch (rumahErr) {
              console.warn(`Gagal memuat tagihan rumah ${r.id}:`, rumahErr);
            }
          }
          setTagihanAllList(allTagihan);
        }
      } catch (err) {
        console.error("Gagal memuat data dashboard warga:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user.id]);

  // Kegiatan & Pengumuman dengan scope Aktif/Arsip independen — Task 3
  // Filter periode tagihan TIDAK diteruskan ke sini; scope berbasis tanggalAcara / status
  useEffect(() => {
    let cancelled = false;
    async function loadKegiatan() {
      try {
        // coba pakai scope query, fallback ke getActive tanpa scope jika backend lama
        let data = [];
        try {
          data = await (kegiatanScope === "aktif" ? kegiatanApi.getFeed() : kegiatanApi.getActive({ scope: kegiatanScope })).catch(() => null);
          if (!Array.isArray(data)) data = await kegiatanApi.getActive().catch(() => []);
        } catch {
          data = await kegiatanApi.getActive().catch(() => []);
        }
        if (cancelled) return;
        if (kegiatanScope === "aktif" && Array.isArray(data)) {
          data = [...data].sort((a, b) => new Date(a.tanggalAcara) - new Date(b.tanggalAcara));
        }
        // Client-side filter sebagai safety net jika backend belum support scope
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const filtered = (data || []).filter((k) => {
          const t = new Date(k.tanggalAcara);
          if (Number.isNaN(t.getTime())) return kegiatanScope === "aktif";
          return kegiatanScope === "aktif" ? t >= today : t < today;
        });
        // Jika backend sudah memfilter, filtered akan sama; jika belum, ini yang benar
        // Untuk aktif, sort ascending (terdekat dulu); arsip desc
        filtered.sort((a, b) => {
          const da = new Date(a.tanggalAcara).getTime();
          const db = new Date(b.tanggalAcara).getTime();
          return kegiatanScope === "aktif" ? da - db : db - da;
        });
        // Jika backend belum support scope dan data hanya 5 aktif, arsip akan kosong — itu expected sampai backend diupdate
        // Fallback: jika scope arsip dan filtered kosong tapi data ada, jangan tampilkan aktif sebagai arsip
        setKegiatan(kegiatanScope === "aktif" ? (data || []) : filtered);
        // Jika backend support, data sudah benar; override dengan filtered hanya jika backend ignore param (deteksi: semua tanggal >= today tapi scope arsip)
        if (kegiatanScope === "arsip" && data && data.length > 0) {
          const allFuture = data.every((k) => new Date(k.tanggalAcara) >= today);
          if (allFuture && filtered.length === 0) setKegiatan([]);
          else if (filtered.length !== data.length) setKegiatan(filtered);
        }
        if (kegiatanScope === "aktif" && data) {
          // ensure aktif tidak menampilkan yang sudah lewat
          const hasPast = data.some((k) => new Date(k.tanggalAcara) < today);
          if (hasPast) setKegiatan(filtered);
        }
      } catch {}
    }
    loadKegiatan();
    return () => { cancelled = true; };
  }, [kegiatanScope]);

  useEffect(() => {
    let cancelled = false;
    async function loadPengumuman() {
      try {
        let data = [];
        try {
          data = await (pengumumanScope === "aktif" ? pengumumanApi.getFeed() : pengumumanApi.getActive({ scope: pengumumanScope })).catch(() => null);
          if (!Array.isArray(data)) data = await pengumumanApi.getActive().catch(() => []);
        } catch {
          data = await pengumumanApi.getActive().catch(() => []);
        }
        if (cancelled) return;
        // Client safety: aktif = status active, arsip = unactived atau isDelete (tapi getActive hanya return active)
        // Jika backend belum support scope, arsip akan kosong
        if (pengumumanScope === "arsip" && data && data.length > 0) {
          const allActive = data.every((p) => (p.status || "active") === "active");
          if (allActive) setPengumuman([]);
          else setPengumuman(data);
        } else {
          setPengumuman(data || []);
        }
      } catch {}
    }
    loadPengumuman();
    return () => { cancelled = true; };
  }, [pengumumanScope]);

  // ── Derived untuk hero & breakdown — sebelum early return agar hooks tidak berubah urutan
  const isBulanIni = (t) => t.bulanPeriode === bulanIni && t.tahunPeriode === tahunIni;
  const tunggakanList = tagihanAllList.filter(
    (t) => t.statusPembayaran === "BELUM_LUNAS" || t.statusPembayaran === "MENUNGGU_KONFIRMASI"
  );
  const tagihanLunasList = tagihanAllList.filter((t) => t.statusPembayaran === "LUNAS");
  const adaTunggakan = tunggakanList.length > 0;
  const isLunasSemua = !adaTunggakan && tagihanAllList.length > 0;
  const totalTunggakanNominal = tunggakanList.reduce((s, t) => s + (t.nominal || 0), 0);

  // Breakdown per periode — grouped by BULAN, tiap grup simpan list tagihan (untuk nested unit rows)
  const breakdownMap = {};
  for (const t of tunggakanList) {
    const key = `${t.bulanPeriode}-${t.tahunPeriode}`;
    if (!breakdownMap[key]) {
      breakdownMap[key] = {
        bulanPeriode: t.bulanPeriode,
        tahunPeriode: t.tahunPeriode,
        label: getMonthLabel(t.bulanPeriode, t.tahunPeriode),
        nominal: 0,
        count: 0,
        isBulanIni: isBulanIni(t),
        tagihans: [],
      };
    }
    breakdownMap[key].nominal += t.nominal || 0;
    breakdownMap[key].count += 1;
    // simpan tagihan lengkap dengan rumah untuk nested row
    const rid = t.rumah?.id ?? t.idRumah;
    const rumah = rumahList.find((r) => r.id === rid) || t.rumah || { id: rid, blokRumah: `Rumah #${rid}`, rt: "" };
    breakdownMap[key].tagihans.push({ ...t, _rumah: rumah });
  }
  const breakdownList = Object.values(breakdownMap).sort((a, b) => {
    const va = parseInt(a.tahunPeriode, 10) * 12 + parseInt(a.bulanPeriode, 10);
    const vb = parseInt(b.tahunPeriode, 10) * 12 + parseInt(b.bulanPeriode, 10);
    return va - vb; // tertua dulu
  });

  // Expand/collapse per grup bulan — default expanded jika ≤3 periode (effect harus sebelum early return)
  useEffect(() => {
    if (expandInitDone || breakdownList.length === 0) return;
    if (breakdownList.length <= 3) {
      setExpandedKeys(new Set(breakdownList.map((b) => `${b.bulanPeriode}-${b.tahunPeriode}`)));
    }
    setExpandInitDone(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breakdownList.length, expandInitDone]);
  // reset init flag saat tunggakan berubah total (user ganti akun)
  useEffect(() => {
    setExpandInitDone(false);
    setExpandedKeys(new Set());
  }, [tunggakanList.length]);
  const toggleGroup = (key) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const firstName = (user?.nama || user?.name || "Warga").split(" ")[0];
  const periodeBulanIni = getMonthLabel(bulanIni, tahunIni);
  const countLunas = tagihanLunasList.length;
  const countBelum = tagihanAllList.filter((t) => t.statusPembayaran === "BELUM_LUNAS").length;
  const countMenunggu = tagihanAllList.filter((t) => t.statusPembayaran === "MENUNGGU_KONFIRMASI").length;
  // Forward-looking info untuk state lunas
  const pembayaranTerakhir = [...tagihanLunasList]
    .filter((t) => t.pembayaran?.[0]?.tanggalBayar)
    .sort((a, b) => new Date(b.pembayaran[0].tanggalBayar) - new Date(a.pembayaran[0].tanggalBayar))[0] || null;
  // fallback jika tidak ada pembayaran record tapi ada tagihan lunas
  const lastPaidFallback = !pembayaranTerakhir && tagihanLunasList.length > 0
    ? [...tagihanLunasList].sort((a, b) => {
        const va = parseInt(a.tahunPeriode, 10) * 12 + parseInt(a.bulanPeriode, 10);
        const vb = parseInt(b.tahunPeriode, 10) * 12 + parseInt(b.bulanPeriode, 10);
        return vb - va;
      })[0]
    : null;
  const nextInvoiceDate = (() => {
    const d = new Date(now.getFullYear(), now.getMonth() + 1, 10);
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  })();

  if (loading) {
    return (
      <div className="portal-loading">
        <div className="portal-spinner" />
        <p>Memuat data...</p>
      </div>
    );
  }

  return (
    <div className="page-stack warga-dashboard">
      {/* Hero — Task 1 & 2 */}
      <section className={`portal-hero ${isLunasSemua ? "is-success" : ""}`}>
        <div className="portal-hero-accent" aria-hidden />
        <div className="portal-hero-main">
          <div className="portal-hero-left">
            <p className="portal-hero-eyebrow">Beranda Warga · RW 21 · Cluster Topaz</p>
            <h2>Halo, {firstName} 👋</h2>
            <p className="portal-hero-sub">
              {rumahList.length > 1
                ? `Kelola ${rumahList.length} unit rumah Anda dalam satu tempat.`
                : "Selamat datang di Beranda Warga Cluster Topaz."}
            </p>
            <div className="portal-hero-meta">
              <span className="portal-hero-periode">
                <Wallet size={13} /> IPL {periodeBulanIni}
                {rumahList.length > 1 ? ` · ${rumahList.length} unit` : ""}
              </span>
              {tagihanAllList.length > 0 && (
                <span className="portal-hero-summary">
                  {countLunas} lunas · {countBelum} belum
                  {countMenunggu > 0 ? ` · ${countMenunggu} menunggu` : ""}
                </span>
              )}
            </div>
          </div>
          <div className="portal-hero-right">
            {isLunasSemua ? (
              <>
                <span className="portal-hero-label">Status Pembayaran IPL</span>
                <span className="portal-hero-value success">✓ Lunas Semua</span>
                <StatusBadge status="LUNAS" />
                <div className="portal-hero-forward">
                  {pembayaranTerakhir ? (
                    <span className="portal-hero-summary">
                      Pembayaran terakhir: {getMonthLabel(pembayaranTerakhir.bulanPeriode, pembayaranTerakhir.tahunPeriode)} · Rp{(pembayaranTerakhir.nominal || pembayaranTerakhir.pembayaran?.[0]?.nominal || 0).toLocaleString("id-ID")}
                    </span>
                  ) : lastPaidFallback ? (
                    <span className="portal-hero-summary">
                      Pembayaran terakhir: {getMonthLabel(lastPaidFallback.bulanPeriode, lastPaidFallback.tahunPeriode)} · Rp{(lastPaidFallback.nominal || 0).toLocaleString("id-ID")}
                    </span>
                  ) : null}
                  <span className="portal-hero-summary">Tagihan berikutnya diterbitkan {nextInvoiceDate}</span>
                </div>
              </>
            ) : adaTunggakan ? (
              <>
                <span className="portal-hero-label">Total Tagihan Belum Lunas</span>
                <span className="portal-hero-value">Rp {totalTunggakanNominal.toLocaleString("id-ID")}</span>
                {tunggakanList.some((t) => t.statusPembayaran === "MENUNGGU_KONFIRMASI") ? (
                  <StatusBadge status="MENUNGGU_KONFIRMASI" />
                ) : (
                  <StatusBadge status="BELUM_LUNAS" />
                )}
              </>
            ) : (
              <>
                <span className="portal-hero-label">Total Tagihan Belum Lunas</span>
                <span className="portal-hero-value muted">Belum ada tagihan</span>
                <span className="portal-hero-summary">Tagihan IPL belum diterbitkan.</span>
              </>
            )}
          </div>
        </div>
        <div className="portal-hero-orb orb-a" aria-hidden />
        <div className="portal-hero-orb orb-b" aria-hidden />
      </section>

      {/* Rincian Tunggakan — grouped by BULAN, nested unit rows, single CTA */}
      {adaTunggakan ? (
        <section className="content-card warga-detail-card">
          <div className="warga-tunggakan-header">
            <div className="warga-tunggakan-header-left">
              <h3>Rincian Tunggakan</h3>
              <span className="warga-detail-sub">{breakdownList.length} periode · {tunggakanList.length} tagihan · {rumahList.length} unit rumah</span>
            </div>
            <span className="warga-tunggakan-total">Rp {totalTunggakanNominal.toLocaleString("id-ID")}</span>
          </div>
          <ul className="warga-tunggakan-groups">
            {breakdownList.map((b) => {
              const key = `${b.bulanPeriode}-${b.tahunPeriode}`;
              const isExpanded = expandedKeys.has(key);
              return (
                <li key={key} className="warga-tunggakan-group">
                  <button
                    type="button"
                    className="warga-tunggakan-group-header"
                    onClick={() => toggleGroup(key)}
                    aria-expanded={isExpanded}
                    aria-label={`${isExpanded ? "Tutup" : "Buka"} rincian ${b.label}`}
                  >
                    <span className="warga-tunggakan-group-left">
                      <span className="warga-tunggakan-group-title">{b.label}</span>
                      <span className="warga-tunggakan-group-sub">{b.count} unit belum lunas</span>
                    </span>
                    <span className="warga-tunggakan-group-right">
                      <strong>Rp {b.nominal.toLocaleString("id-ID")}</strong>
                      <span className={`portal-badge-mini ${b.isBulanIni ? "badge-bulan-ini" : "badge-tertunggak"}`}>{b.isBulanIni ? "Bulan ini" : "Tertunggak"}</span>
                      <ChevronDown size={16} className={`warga-tunggakan-chevron ${isExpanded ? "is-open" : ""}`} aria-hidden />
                    </span>
                  </button>
                  {isExpanded && (
                    <ul className="warga-tunggakan-unit-list">
                      {b.tagihans.map((t) => (
                        <li key={t.id} className="warga-tunggakan-unit-row">
                          <span className="warga-tunggakan-unit-left">
                            {t._rumah.blokRumah} <small>· {String(t._rumah.rt || "").replace("_", " ")}</small>
                          </span>
                          <span className="warga-tunggakan-unit-right">Rp {(t.nominal || 0).toLocaleString("id-ID")}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="warga-detail-cta-wrap">
            <Link href="/dashboard/iuran" className="warga-detail-cta">
              Bayar Sekarang <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      ) : isLunasSemua ? (
        <section className="content-card warga-detail-card">
          <div className="warga-lunas-headline">
            <span className="warga-lunas-icon" aria-hidden><Check size={14} strokeWidth={3} /></span>
            <div className="warga-lunas-text">
              <span className="warga-lunas-title">Semua Tagihan Lunas</span>
              <span className="warga-detail-sub">{rumahList.length} unit rumah · tidak ada tunggakan</span>
            </div>
          </div>
          <div className="warga-lunas-divider" />
          {(() => {
            const riwayat = [...tagihanLunasList]
              .sort((a, b) => {
                const da = a.pembayaran?.[0]?.tanggalBayar ? new Date(a.pembayaran[0].tanggalBayar).getTime() : 0;
                const db = b.pembayaran?.[0]?.tanggalBayar ? new Date(b.pembayaran[0].tanggalBayar).getTime() : 0;
                if (da && db) return db - da;
                const va = parseInt(a.tahunPeriode, 10) * 12 + parseInt(a.bulanPeriode, 10);
                const vb = parseInt(b.tahunPeriode, 10) * 12 + parseInt(b.bulanPeriode, 10);
                return vb - va;
              })
              .slice(0, 2);
            if (riwayat.length === 0) {
              return (
                <>
                  <p className="warga-detail-sub" style={{ textAlign: "left", marginTop: 12 }}>Tidak ada tunggakan. Terima kasih!</p>
                  <div className="warga-lunas-footer">Tagihan berikutnya diterbitkan {nextInvoiceDate}</div>
                </>
              );
            }
            return (
              <>
                <ul className="warga-detail-list">
                  {riwayat.map((t) => (
                    <li key={t.id} className="warga-detail-row">
                      <span className="warga-detail-left">{getMonthLabel(t.bulanPeriode, t.tahunPeriode)}</span>
                      <span className="warga-detail-right">
                        <strong>Rp {(t.nominal || 0).toLocaleString("id-ID")}</strong>
                        <span className="warga-detail-date">
                          {t.pembayaran?.[0]?.tanggalBayar
                            ? new Date(t.pembayaran[0].tanggalBayar).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
                            : ""}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="warga-lunas-footer">Tagihan berikutnya diterbitkan {nextInvoiceDate}</div>
              </>
            );
          })()}
        </section>
      ) : rumahList.length === 0 ? (
        <section className="content-card warga-detail-card">
          <div className="warga-tunggakan-header">
            <div className="warga-tunggakan-header-left">
              <h3>Rincian Tunggakan</h3>
              <span className="warga-detail-sub">Belum ada data rumah</span>
            </div>
            <span className="warga-tunggakan-total muted">—</span>
          </div>
          <div className="portal-empty-notice">
            <Home size={32} />
            <p><strong>Rumah belum terdaftar</strong></p>
            <p>Silakan hubungi pengurus cluster untuk menghubungkan akun Anda dengan data rumah.</p>
          </div>
        </section>
      ) : (
        <section className="content-card warga-detail-card">
          <div className="warga-tunggakan-header">
            <div className="warga-tunggakan-header-left">
              <h3>Rincian Tunggakan</h3>
              <span className="warga-detail-sub">{rumahList.length} unit rumah · belum ada tagihan</span>
            </div>
            <span className="warga-tunggakan-total muted" style={{ fontSize: "1rem", color: "#64748b" }}>—</span>
          </div>
          <div className="warga-tunggakan-success">
            <p>Tagihan IPL belum diterbitkan.</p>
            <p className="warga-detail-sub">Tagihan berikutnya diterbitkan {nextInvoiceDate}</p>
          </div>
        </section>
      )}

      {/* Kegiatan Cluster — Task 3: toggle Aktif/Arsip independen dari filter tagihan */}
      <section className="content-card">
        <div className="db-section-header">
          <CalendarDays size={17} />
          <h3>Kegiatan Cluster</h3>
          <div className="db-section-toggle" role="tablist" aria-label="Filter kegiatan">
            <button
              type="button"
              role="tab"
              aria-selected={kegiatanScope === "aktif"}
              className={`db-toggle-btn ${kegiatanScope === "aktif" ? "is-active" : ""}`}
              onClick={() => setKegiatanScope("aktif")}
            >
              Aktif
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={kegiatanScope === "arsip"}
              className={`db-toggle-btn ${kegiatanScope === "arsip" ? "is-active" : ""}`}
              onClick={() => setKegiatanScope("arsip")}
            >
              Arsip
            </button>
          </div>
        </div>

        {kegiatan.length === 0 ? (
          <div className="portal-empty-notice">
            <CalendarDays size={32} />
            <p>{kegiatanScope === "aktif" ? "Belum ada kegiatan akan datang." : "Belum ada arsip kegiatan."}</p>
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

      {/* Pengumuman — Task 3: toggle Aktif/Arsip independen */}
      <section className="content-card">
        <div className="db-section-header">
          <Megaphone size={17} />
          <h3>Pengumuman</h3>
          <div className="db-section-toggle" role="tablist" aria-label="Filter pengumuman">
            <button
              type="button"
              role="tab"
              aria-selected={pengumumanScope === "aktif"}
              className={`db-toggle-btn ${pengumumanScope === "aktif" ? "is-active" : ""}`}
              onClick={() => setPengumumanScope("aktif")}
            >
              Aktif
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={pengumumanScope === "arsip"}
              className={`db-toggle-btn ${pengumumanScope === "arsip" ? "is-active" : ""}`}
              onClick={() => setPengumumanScope("arsip")}
            >
              Arsip
            </button>
          </div>
        </div>

        {pengumuman.length === 0 ? (
          <p className="portal-empty-text">{pengumumanScope === "aktif" ? "Belum ada pengumuman aktif saat ini." : "Belum ada arsip pengumuman."}</p>
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
  const { user, ready } = useUser();

  if (!ready || !user) return null;

  // Tampilan warga (tagihan sendiri), pengurus (ringkasan tagihan wilayah), atau pengelola sistem
  // (Admin: tanpa akses tagihan, hanya role/pengurus/data warga), mengikuti hak akses.
  if (isWargaView(user)) return <WargaDashboardView user={user} />;
  if (!can(user, "ipl.read")) return <PanelSistem user={user} />;
  return <AdminDashboardView user={user} />;
}
