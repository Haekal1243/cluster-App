"use client";

import { useEffect, useState } from "react";
import { Home, CreditCard, CheckCircle, AlertTriangle, Clock, Megaphone } from "lucide-react";
import { portalApi, pengumumanApi } from "@/lib/api";
import Link from "next/link";

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

export default function PortalDashboardPage() {
  const [user, setUser] = useState(null);
  const [rumahList, setRumahList] = useState([]);
  const [tagihanBulanIni, setTagihanBulanIni] = useState(null);
  const [pengumuman, setPengumuman] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) return;
    const u = JSON.parse(raw);
    setUser(u);

    const now = new Date();
    const bulanIni = String(now.getMonth() + 1).padStart(2, "0");
    const tahunIni = String(now.getFullYear());

    async function fetchData() {
      try {
        // Ambil rumah milik user
        const rumah = await portalApi.getRumahByUser(u.id);
        setRumahList(rumah);

        // Ambil tagihan bulan ini dari rumah pertama
        if (rumah.length > 0) {
          const { tagihan } = await portalApi.getTagihanByRumah(rumah[0].id);
          const tagBulanIni = tagihan.find(
            (t) => t.bulanPeriode === bulanIni && t.tahunPeriode === tahunIni
          );
          setTagihanBulanIni(tagBulanIni || null);
        }

        // Ambil 3 pengumuman aktif terbaru
        const peng = await pengumumanApi.getActive();
        setPengumuman(peng?.slice(0, 3) || []);
      } catch (err) {
        console.error("Gagal memuat data portal:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="portal-loading">
        <div className="portal-spinner" />
        <p>Memuat data...</p>
      </div>
    );
  }

  const statusIpl = tagihanBulanIni?.statusPembayaran || null;

  return (
    <div className="page-stack">
      {/* Welcome Banner */}
      <section className="portal-welcome-banner">
        <div className="portal-welcome-text">
          <h2>Halo, {user?.nama || user?.name} 👋</h2>
          <p>Selamat datang di Portal Warga Cluster Topaz</p>
        </div>
        <div className="portal-welcome-decoration" aria-hidden />
      </section>

      {/* Stat Cards */}
      <section className="portal-stat-row">
        {/* Status IPL */}
        <div className={`portal-stat-card ${statusIpl === "LUNAS" ? "card-success" : statusIpl === "MENUNGGU_KONFIRMASI" ? "card-warning" : "card-danger"}`}>
          <div className="portal-stat-icon">
            <CreditCard size={22} />
          </div>
          <div className="portal-stat-body">
            <span className="portal-stat-label">Tagihan Bulan Ini</span>
            {tagihanBulanIni ? (
              <>
                <span className="portal-stat-value">
                  Rp {tagihanBulanIni.nominal.toLocaleString("id-ID")}
                </span>
                <StatusBadge status={tagihanBulanIni.statusPembayaran} />
              </>
            ) : (
              <span className="portal-stat-value portal-no-data">Belum ada tagihan</span>
            )}
          </div>
        </div>

        {/* Jumlah Rumah */}
        <div className="portal-stat-card card-info">
          <div className="portal-stat-icon">
            <Home size={22} />
          </div>
          <div className="portal-stat-body">
            <span className="portal-stat-label">Unit Rumah</span>
            <span className="portal-stat-value">{rumahList.length}</span>
            <span className="portal-stat-sub">
              {rumahList.length > 0
                ? rumahList.map((r) => `${r.blokRumah} (${r.rt.replace("_", " ")})`).join(" · ")
                : "Belum terdaftar"}
            </span>
          </div>
        </div>
      </section>

      {/* Rumah Tidak Terdaftar Warning */}
      {rumahList.length === 0 && (
        <div className="portal-empty-notice">
          <Home size={32} />
          <p><strong>Rumah belum terdaftar</strong></p>
          <p>Silakan hubungi pengurus cluster untuk menghubungkan akun Anda dengan data rumah.</p>
        </div>
      )}

      {/* Quick Action */}
      {tagihanBulanIni && tagihanBulanIni.statusPembayaran === "BELUM_LUNAS" && (
        <section className="portal-action-banner">
          <div className="portal-action-text">
            <AlertTriangle size={18} />
            <span>Tagihan IPL {getMonthLabel(tagihanBulanIni.bulanPeriode, tagihanBulanIni.tahunPeriode)} belum dibayar</span>
          </div>
          <Link href="/portal/tagihan" className="portal-action-btn">
            Bayar Sekarang
          </Link>
        </section>
      )}

      {/* Pengumuman Terbaru */}
      <section className="content-card">
        <div className="card-header-row">
          <h3><Megaphone size={16} /> Pengumuman Terbaru</h3>
          <Link href="/portal/pengumuman" className="link-lihat-semua">Lihat semua →</Link>
        </div>

        {pengumuman.length === 0 ? (
          <p className="portal-empty-text">Belum ada pengumuman.</p>
        ) : (
          <ul className="portal-pengumuman-list">
            {pengumuman.map((p) => (
              <li key={p.id} className="portal-pengumuman-item">
                <div className="portal-peng-dot" />
                <div>
                  <p className="portal-peng-judul">{p.judul}</p>
                  {p.keteranganPengumuman && (
                    <p className="portal-peng-desc">{p.keteranganPengumuman.slice(0, 100)}{p.keteranganPengumuman.length > 100 ? "..." : ""}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
