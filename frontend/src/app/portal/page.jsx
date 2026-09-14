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
  const [tagihanBulanIniList, setTagihanBulanIniList] = useState([]);
  const [summaryBulanIni, setSummaryBulanIni] = useState(null);
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
        // Ambil tagihan gabungan semua rumah milik user untuk bulan berjalan
        try {
          const res = await portalApi.getTagihanByUser(u.id, { bulan: bulanIni, tahun: tahunIni });
          setRumahList(res.rumah || []);
          setTagihanBulanIniList(res.tagihan || []);
          const key = `${bulanIni}/${tahunIni}`;
          setSummaryBulanIni(res.summaryByPeriode?.[key] || res.totalSummary || null);
        } catch (e) {
          // Fallback ke endpoint lama jika endpoint gabungan belum tersedia
          console.warn("getTagihanByUser gagal, fallback ke per-rumah:", e);
          const rumah = await portalApi.getRumahByUser(u.id);
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

  const adaBelumLunas = tagihanBulanIniList.some((t) => t.statusPembayaran === "BELUM_LUNAS");
  const semuaLunas =
    tagihanBulanIniList.length > 0 &&
    tagihanBulanIniList.every((t) => t.statusPembayaran === "LUNAS");
  const adaMenunggu = tagihanBulanIniList.some((t) => t.statusPembayaran === "MENUNGGU_KONFIRMASI");
  // Total nominal yang BELUM dibayar (BELUM_LUNAS + MENUNGGU_KONFIRMASI),
  // agar warga multi-rumah yang sudah bayar salah satu unitnya melihat sisa tagihan
  const totalBelumBayar = tagihanBulanIniList
    .filter((t) => t.statusPembayaran === "BELUM_LUNAS" || t.statusPembayaran === "MENUNGGU_KONFIRMASI")
    .reduce((s, t) => s + (t.nominal || 0), 0);
  const tagihanPerRumah = rumahList.map((r) => {
    const tag = tagihanBulanIniList.find((t) => (t.rumah?.id ?? t.idRumah) === r.id);
    return { rumah: r, tagihan: tag || null };
  });

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
        {/* Status IPL gabungan semua rumah */}
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

        {/* Jumlah Rumah */}
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

      {/* Daftar Unit Rumah — ramah untuk multi-rumah */}
      {rumahList.length > 0 && (
        <section className="content-card">
          <div className="card-header-row">
            <h3><Home size={16} /> Unit Rumah Saya</h3>
            <Link href="/portal/tagihan" className="link-lihat-semua">Lihat tagihan →</Link>
          </div>
          <ul className="portal-pengumuman-list">
            {tagihanPerRumah.map(({ rumah, tagihan }) => (
              <li key={rumah.id} className="portal-pengumuman-item">
                <div className="portal-stat-icon" style={{ width: 36, height: 36 }}>
                  <Home size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <p className="portal-peng-judul">
                    {rumah.blokRumah} — {String(rumah.rt || "").replace("_", " ")}
                  </p>
                  <p className="portal-peng-desc">
                    {tagihan
                      ? `Rp ${(tagihan.nominal || 0).toLocaleString("id-ID")} · ${getMonthLabel(tagihan.bulanPeriode, tagihan.tahunPeriode)}`
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
        </section>
      )}

      {/* Rumah Tidak Terdaftar Warning */}
      {rumahList.length === 0 && (
        <div className="portal-empty-notice">
          <Home size={32} />
          <p><strong>Rumah belum terdaftar</strong></p>
          <p>Silakan hubungi pengurus cluster untuk menghubungkan akun Anda dengan data rumah.</p>
        </div>
      )}

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
