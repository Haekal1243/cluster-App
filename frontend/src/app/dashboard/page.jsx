"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users, Wallet, AlertTriangle, CheckCircle,
  TrendingUp, Clock, ArrowRight,
} from "lucide-react";
import { iplApi } from "@/lib/api";
import Link from "next/link";

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

function formatTanggal(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
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
  const W = 100 / data.length;

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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  // Auth guard sudah ditangani di dashboard/layout.jsx untuk semua halaman /dashboard/*
  const [user, setUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const sessionUser = localStorage.getItem("user");
    if (!sessionUser) {
      router.replace("/login");
    } else {
      try { setUser(JSON.parse(sessionUser)); }
      catch { router.replace("/login"); }
      setIsCheckingAuth(false);
    }
  }, [router]);

  useEffect(() => {
    if (isCheckingAuth) return;
    setLoadingStats(true);
    iplApi.getDashboardStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoadingStats(false));
  }, [isCheckingAuth]);

  if (isCheckingAuth) return null;

  const userName = user?.nama || user?.name || "Admin";
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  return (
    <div className="page-stack">

      {/* ── Welcome ── */}
      <section className="welcome-banner">
        <div>
          <h2>Selamat datang kembali, {userName} 👋</h2>
          <p>Ini ringkasan aktivitas cluster Topaz bulan ini.</p>
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
            <span className="db-metric-label">Total Kas Masuk Bulan Ini</span>
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

      {/* ── Chart + Tabel row ── */}
      <div className="db-bottom-row">

        {/* Mini Chart: Tren 6 bulan */}
        <div className="content-card db-chart-card">
          <div className="db-section-header">
            <TrendingUp size={17} />
            <h3>Tren Kas Masuk IPL</h3>
            <span className="db-section-sub">6 bulan terakhir</span>
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
            <Link href="/dashboard/iuran" className="db-section-link">
              Lihat semua <ArrowRight size={13} />
            </Link>
          </div>

          {loadingStats ? (
            <div className="db-chart-loading">Memuat data...</div>
          ) : !stats?.pembayaranTerbaru?.length ? (
            <div className="db-empty-recent">Belum ada pembayaran yang masuk.</div>
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