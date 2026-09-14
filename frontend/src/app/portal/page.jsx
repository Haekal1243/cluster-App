"use client";

import { useEffect, useState } from "react";
import { Home, CheckCircle, AlertTriangle, Clock, Megaphone, ArrowRight, Wallet, Calendar, ChevronDown, FileText, CalendarDays, ImageIcon } from "lucide-react";
import { portalApi, pengumumanApi, kegiatanApi } from "@/lib/api";
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

function formatTanggalSingkat(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function formatTanggalAcara(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

export default function PortalDashboardPage() {
  const [user, setUser] = useState(null);
  const [rumahList, setRumahList] = useState([]);
  const [tagihanBulanIniList, setTagihanBulanIniList] = useState([]);
  const [summaryBulanIni, setSummaryBulanIni] = useState(null);
  const [pengumuman, setPengumuman] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [kegiatan, setKegiatan] = useState([]);
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

        // Ambil 5 pengumuman aktif terbaru (diurutkan createDate desc)
        // dan 3 kegiatan aktif terbaru (diurutkan tanggalAcara desc)
        const [peng, keg] = await Promise.all([
          pengumumanApi.getActive().catch((pengErr) => {
            console.warn("Gagal memuat pengumuman:", pengErr);
            return [];
          }),
          kegiatanApi.getActive().catch((kegErr) => {
            console.warn("Gagal memuat kegiatan:", kegErr);
            return [];
          }),
        ]);
        const sorted = [...(peng || [])].sort(
          (a, b) => new Date(b.createDate || 0) - new Date(a.createDate || 0)
        );
        setPengumuman(sorted.slice(0, 5));
        const sortedKeg = [...(keg || [])].sort(
          (a, b) => new Date(b.tanggalAcara || 0) - new Date(a.tanggalAcara || 0)
        );
        setKegiatan(sortedKeg.slice(0, 3));
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

  const now = new Date();
  const periodeLabel = getMonthLabel(
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getFullYear())
  );
  const heroStatus = semuaLunas
    ? "LUNAS"
    : adaMenunggu
      ? "MENUNGGU_KONFIRMASI"
      : adaBelumLunas
        ? "BELUM_LUNAS"
        : null;
  const countLunas = summaryBulanIni?.lunas ?? tagihanBulanIniList.filter((t) => t.statusPembayaran === "LUNAS").length;
  const countBelum = summaryBulanIni?.belumLunas ?? tagihanBulanIniList.filter((t) => t.statusPembayaran === "BELUM_LUNAS").length;
  const countMenunggu = summaryBulanIni?.menunggu ?? tagihanBulanIniList.filter((t) => t.statusPembayaran === "MENUNGGU_KONFIRMASI").length;
  const firstName = (user?.nama || user?.name || "Warga").split(" ")[0];

  return (
    <div className="page-stack portal-dashboard">
      {/* Hero tunggal: sapaan + sisa tagihan bulan ini + CTA */}
      <section className={`portal-hero ${semuaLunas ? "is-success" : ""}`}>
        <div className="portal-hero-accent" aria-hidden />
        <div className="portal-hero-main">
          <div className="portal-hero-left">
            <p className="portal-hero-eyebrow">Portal Warga · RW 21 · Cluster Topaz</p>
            <h2>Halo, {firstName} 👋</h2>
            <p className="portal-hero-sub">
              {rumahList.length > 1
                ? `Kelola ${rumahList.length} unit rumah Anda dalam satu tempat.`
                : "Selamat datang di Portal Warga Cluster Topaz."}
            </p>
            <div className="portal-hero-meta">
              <span className="portal-hero-periode">
                <Wallet size={13} /> IPL {periodeLabel}
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
                {heroStatus && <StatusBadge status={heroStatus} />}
                {adaBelumLunas ? (
                  <Link href="/portal/tagihan" className="portal-hero-btn">
                    Bayar Sekarang <ArrowRight size={15} />
                  </Link>
                ) : (
                  <Link href="/portal/tagihan" className="portal-hero-btn ghost">
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

      {/* Daftar Unit Rumah — satu-satunya sumber info unit + status */}
      {rumahList.length > 0 && (
        <section className="content-card portal-unit-card">
          <div className="card-header-row">
            <h3><Home size={16} /> Unit Rumah Saya ({rumahList.length})</h3>
            <Link href="/portal/tagihan" className="link-lihat-semua">Lihat tagihan →</Link>
          </div>
          <ul className="portal-unit-list">
            {tagihanPerRumah.map(({ rumah, tagihan }) => (
              <li key={rumah.id} className="portal-unit-item">
                <div className="portal-unit-icon">
                  <Home size={18} />
                </div>
                <div className="portal-unit-body">
                  <p className="portal-peng-judul">
                    {rumah.blokRumah} — {String(rumah.rt || "").replace("_", " ")}
                  </p>
                  <p className="portal-peng-desc">
                    {tagihan
                      ? `Rp ${(tagihan.nominal || 0).toLocaleString("id-ID")} · ${getMonthLabel(tagihan.bulanPeriode, tagihan.tahunPeriode)}`
                      : "Belum ada tagihan bulan ini"}
                  </p>
                </div>
                <div className="portal-unit-status">
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

      {/* Pengumuman Terbaru — klik untuk baca selengkapnya langsung di dashboard */}
      <section className="content-card">
        <div className="card-header-row">
          <div>
            <h3><Megaphone size={16} /> Pengumuman Terbaru</h3>
            <p className="portal-section-hint">Klik pengumuman untuk membaca selengkapnya</p>
          </div>
          <Link href="/portal/pengumuman" className="link-lihat-semua">Lihat semua →</Link>
        </div>

        {pengumuman.length === 0 ? (
          <p className="portal-empty-text">Belum ada pengumuman.</p>
        ) : (
          <ul className="portal-pengumuman-list portal-peng-expandable">
            {pengumuman.map((p) => {
              const isOpen = expandedId === p.id;
              const desc = p.keteranganPengumuman || "";
              const isLong = desc.length > 100;
              return (
                <li key={p.id} className={`portal-peng-item ${isOpen ? "is-open" : ""}`}>
                  <button
                    type="button"
                    className="portal-peng-toggle"
                    onClick={() => setExpandedId(isOpen ? null : p.id)}
                    aria-expanded={isOpen}
                    aria-label={`${isOpen ? "Tutup" : "Baca"} pengumuman: ${p.judul}`}
                  >
                    <span className="portal-peng-dot" aria-hidden />
                    <span className="portal-peng-main">
                      <span className="portal-peng-top">
                        <span className="portal-peng-judul">{p.judul}</span>
                        <span className="portal-peng-date">
                          <Calendar size={12} /> {formatTanggalSingkat(p.createDate)}
                        </span>
                      </span>
                      {desc && (
                        <span className={`portal-peng-desc ${isOpen ? "full" : ""}`}>
                          {isOpen || !isLong ? desc : `${desc.slice(0, 100)}...`}
                        </span>
                      )}
                    </span>
                    <ChevronDown size={16} className={`portal-peng-chevron ${isOpen ? "rotated" : ""}`} aria-hidden />
                  </button>
                  {isOpen && p.filePengumuman && (
                    <a
                      href={pengumumanApi.fileUrl?.(p.filePengumuman) || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="portal-peng-lampiran"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FileText size={12} /> Lihat Lampiran
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Kegiatan Terbaru — strip foto geser, 3 teratas */}
      {kegiatan.length > 0 && (
        <section className="content-card portal-keg-section">
          <div className="card-header-row">
            <div>
              <h3><CalendarDays size={16} /> Kegiatan Terbaru</h3>
              <p className="portal-section-hint">Geser untuk melihat kegiatan lainnya</p>
            </div>
            <Link href="/portal/kegiatan" className="link-lihat-semua">Lihat semua →</Link>
          </div>
          <div className="portal-keg-strip">
            {kegiatan.map((k) => {
              const img = k.gambarUrl ? kegiatanApi.imageUrl(k.gambarUrl) : null;
              return (
                <Link key={k.id} href="/portal/kegiatan" className="portal-keg-card">
                  <div className="portal-keg-body">
                    <p className="portal-keg-eyebrow">{formatTanggalAcara(k.tanggalAcara)}</p>
                    <p className="portal-peng-judul portal-keg-title">{k.judul}</p>
                  </div>
                  <div className="portal-keg-img-wrap">
                    <span className="portal-keg-img-fallback" aria-hidden>
                      <ImageIcon size={28} />
                    </span>
                    {img && (
                      <img
                        src={img}
                        alt={k.judul}
                        className="portal-keg-img"
                        loading="lazy"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    )}
                    <span className="portal-keg-badge">KEGIATAN</span>
                  </div>
                  {k.deskripsi && (
                    <div className="portal-keg-body">
                      <p className="portal-peng-desc portal-keg-desc">{k.deskripsi}</p>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
