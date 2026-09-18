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
  const [tagihanAllList, setTagihanAllList] = useState([]);
  const [pengumuman, setPengumuman] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [kegiatan, setKegiatan] = useState([]);
  const [kegiatanScope, setKegiatanScope] = useState("aktif");
  const [pengumumanScope, setPengumumanScope] = useState("aktif");
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const bulanIni = String(now.getMonth() + 1).padStart(2, "0");
  const tahunIni = String(now.getFullYear());

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) return;
    const u = JSON.parse(raw);
    setUser(u);

    async function fetchData() {
      try {
        try {
          const res = await portalApi.getTagihanByUser(u.id);
          setRumahList(res.rumah || []);
          setTagihanAllList(res.tagihan || []);
        } catch (e) {
          console.warn("getTagihanByUser gagal, fallback ke per-rumah:", e);
          const rumah = await portalApi.getRumahByUser(u.id);
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
        console.error("Gagal memuat data portal:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Kegiatan & Pengumuman dengan toggle Aktif/Arsip independen — Task 3
  useEffect(() => {
    let cancelled = false;
    async function loadKegiatan() {
      try {
        let data = [];
        try {
          data = await kegiatanApi.getActive({ scope: kegiatanScope }).catch(() => null);
          if (!Array.isArray(data)) data = await kegiatanApi.getActive().catch(() => []);
        } catch {
          data = await kegiatanApi.getActive().catch(() => []);
        }
        if (cancelled) return;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const filtered = (data || []).filter((k) => {
          const t = new Date(k.tanggalAcara);
          if (Number.isNaN(t.getTime())) return kegiatanScope === "aktif";
          return kegiatanScope === "aktif" ? t >= today : t < today;
        });
        filtered.sort((a, b) => {
          const da = new Date(a.tanggalAcara).getTime();
          const db = new Date(b.tanggalAcara).getTime();
          return kegiatanScope === "aktif" ? da - db : db - da;
        });
        if (kegiatanScope === "arsip" && data && data.length > 0) {
          const allFuture = data.every((k) => new Date(k.tanggalAcara) >= today);
          if (allFuture && filtered.length === 0) setKegiatan([]);
          else if (filtered.length !== data.length) setKegiatan(filtered);
          else setKegiatan(data);
        } else if (kegiatanScope === "aktif" && data) {
          const hasPast = data.some((k) => new Date(k.tanggalAcara) < today);
          if (hasPast) setKegiatan(filtered);
          else setKegiatan(data);
        } else {
          setKegiatan(kegiatanScope === "aktif" ? (data || []) : filtered);
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
          data = await pengumumanApi.getActive({ scope: pengumumanScope }).catch(() => null);
          if (!Array.isArray(data)) data = await pengumumanApi.getActive().catch(() => []);
        } catch {
          data = await pengumumanApi.getActive().catch(() => []);
        }
        if (cancelled) return;
        if (pengumumanScope === "arsip" && data && data.length > 0) {
          const allActive = data.every((p) => (p.status || "active") === "active");
          if (allActive) setPengumuman([]);
          else setPengumuman(data);
        } else {
          const sorted = [...(data || [])].sort((a, b) => new Date(b.createDate || 0) - new Date(a.createDate || 0));
          setPengumuman(pengumumanScope === "aktif" ? sorted.slice(0, 5) : sorted);
        }
      } catch {}
    }
    loadPengumuman();
    return () => { cancelled = true; };
  }, [pengumumanScope]);

  if (loading) {
    return (
      <div className="portal-loading">
        <div className="portal-spinner" />
        <p>Memuat data...</p>
      </div>
    );
  }

  const isBulanIni = (t) => t.bulanPeriode === bulanIni && t.tahunPeriode === tahunIni;
  const tunggakanList = tagihanAllList.filter((t) => t.statusPembayaran === "BELUM_LUNAS" || t.statusPembayaran === "MENUNGGU_KONFIRMASI");
  const tagihanLunasList = tagihanAllList.filter((t) => t.statusPembayaran === "LUNAS");
  const adaTunggakan = tunggakanList.length > 0;
  const isLunasSemua = !adaTunggakan && tagihanAllList.length > 0;
  const totalTunggakanNominal = tunggakanList.reduce((s, t) => s + (t.nominal || 0), 0);

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
      };
    }
    breakdownMap[key].nominal += t.nominal || 0;
    breakdownMap[key].count += 1;
  }
  const breakdownList = Object.values(breakdownMap).sort((a, b) => {
    const va = parseInt(a.tahunPeriode, 10) * 12 + parseInt(a.bulanPeriode, 10);
    const vb = parseInt(b.tahunPeriode, 10) * 12 + parseInt(b.bulanPeriode, 10);
    return va - vb;
  });
  const tertunggakNominal = breakdownList.filter((b) => !b.isBulanIni).reduce((s, b) => s + b.nominal, 0);
  const tertunggakCount = breakdownList.filter((b) => !b.isBulanIni).reduce((s, b) => s + b.count, 0);

  let unitRows = [];
  if (isLunasSemua) {
    const latestPerRumah = new Map();
    for (const r of rumahList) {
      const list = tagihanAllList
        .filter((t) => (t.rumah?.id ?? t.idRumah) === r.id)
        .sort((a, b) => {
          const va = parseInt(a.tahunPeriode, 10) * 12 + parseInt(a.bulanPeriode, 10);
          const vb = parseInt(b.tahunPeriode, 10) * 12 + parseInt(b.bulanPeriode, 10);
          return vb - va;
        });
      const latest = list[0] || null;
      latestPerRumah.set(r.id, { rumah: r, tagihan: latest });
    }
    unitRows = rumahList.map((r) => ({ ...latestPerRumah.get(r.id), key: `rumah-${r.id}` }));
  } else {
    unitRows = tunggakanList
      .slice()
      .sort((a, b) => {
        const va = parseInt(a.tahunPeriode, 10) * 12 + parseInt(a.bulanPeriode, 10);
        const vb = parseInt(b.tahunPeriode, 10) * 12 + parseInt(b.bulanPeriode, 10);
        return va - vb;
      })
      .map((t) => {
        const rid = t.rumah?.id ?? t.idRumah;
        const rumah = rumahList.find((r) => r.id === rid) || t.rumah || { id: rid, blokRumah: `Rumah #${rid}`, rt: "" };
        return { rumah, tagihan: t, key: `tagihan-${t.id}` };
      });
    if (unitRows.length === 0 && rumahList.length > 0) {
      unitRows = rumahList.map((r) => ({ rumah: r, tagihan: null, key: `rumah-${r.id}` }));
    }
  }

  const periodeLabel = getMonthLabel(bulanIni, tahunIni);
  const countLunas = tagihanLunasList.length;
  const countBelum = tagihanAllList.filter((t) => t.statusPembayaran === "BELUM_LUNAS").length;
  const countMenunggu = tagihanAllList.filter((t) => t.statusPembayaran === "MENUNGGU_KONFIRMASI").length;
  const pembayaranTerakhir = [...tagihanLunasList]
    .filter((t) => t.pembayaran?.[0]?.tanggalBayar)
    .sort((a, b) => new Date(b.pembayaran[0].tanggalBayar) - new Date(a.pembayaran[0].tanggalBayar))[0] || null;
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
  const firstName = (user?.nama || user?.name || "Warga").split(" ")[0];

  return (
    <div className="page-stack portal-dashboard">
      {/* Hero — Task 1 & 2 */}
      <section className={`portal-hero ${isLunasSemua ? "is-success" : ""}`}>
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

      {/* Blok 2: Card terpisah — Rincian Tunggakan / Riwayat Pembayaran */}
      {adaTunggakan ? (
        <section className="content-card warga-detail-card">
          <div className="warga-detail-header">
            <h3>Rincian Tunggakan</h3>
            <span className="warga-detail-sub">{periodeLabel} · {breakdownList.length} periode · {tunggakanList.length} tagihan</span>
          </div>
          <ul className="warga-detail-list">
            {breakdownList.map((b) => (
              <li key={`${b.bulanPeriode}-${b.tahunPeriode}`} className="warga-detail-row">
                <span className="warga-detail-left">
                  {b.label} <small>({b.count} tagihan)</small>
                </span>
                <span className="warga-detail-right">
                  <strong>Rp {b.nominal.toLocaleString("id-ID")}</strong>
                  <span className={`portal-badge-mini ${b.isBulanIni ? "badge-bulan-ini" : "badge-tertunggak"}`}>{b.isBulanIni ? "Bulan ini" : "Tertunggak"}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="warga-detail-cta-wrap">
            <Link href="/portal/tagihan" className="warga-detail-cta">
              Bayar Sekarang <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      ) : isLunasSemua ? (
        (() => {
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
          if (riwayat.length === 0) return null;
          return (
            <section className="content-card warga-detail-card">
              <div className="warga-detail-header">
                <h3>Riwayat Pembayaran</h3>
                <span className="warga-detail-sub">2 pembayaran terakhir</span>
              </div>
              <ul className="warga-detail-list">
                {riwayat.map((t) => (
                  <li key={t.id} className="warga-detail-row">
                    <span className="warga-detail-left">
                      {getMonthLabel(t.bulanPeriode, t.tahunPeriode)} · Rp {(t.nominal || 0).toLocaleString("id-ID")}
                    </span>
                    <span className="warga-detail-right">
                      <StatusBadge status="LUNAS" />
                      <span className="warga-detail-date">
                        {t.pembayaran?.[0]?.tanggalBayar
                          ? new Date(t.pembayaran[0].tanggalBayar).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
                          : ""}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })()
      ) : null}

      {/* Unit Rumah — Task 1 & 2 */}
      {rumahList.length > 0 ? (
        <section className="content-card portal-unit-card">
          <div className="card-header-row">
            <h3><Home size={16} /> Unit Rumah Saya ({isLunasSemua ? rumahList.length : unitRows.length})</h3>
            <Link href="/portal/tagihan" className="link-lihat-semua">Lihat tagihan →</Link>
          </div>
          <ul className="portal-unit-list">
            {unitRows.map(({ rumah, tagihan, key }) => (
              <li key={key || `${rumah.id}-${tagihan?.id || "empty"}`} className="portal-unit-item">
                <div className="portal-unit-icon">
                  <Home size={18} />
                </div>
                <div className="portal-unit-body">
                  <p className="portal-peng-judul">
                    {rumah.blokRumah} — {String(rumah.rt || "").replace("_", " ")}
                  </p>
                  <p className="portal-peng-desc">
                    {tagihan
                      ? (
                        <>
                          Rp {(tagihan.nominal || 0).toLocaleString("id-ID")} · {getMonthLabel(tagihan.bulanPeriode, tagihan.tahunPeriode)}
                          {!isLunasSemua && tagihan.statusPembayaran !== "LUNAS" && (
                            <span className={`portal-badge-mini inline ${isBulanIni(tagihan) ? "badge-bulan-ini" : "badge-tertunggak"}`} style={{ marginLeft: 8 }}>
                              {isBulanIni(tagihan) ? "Bulan ini" : "Tertunggak"}
                            </span>
                          )}
                        </>
                      )
                      : "Belum ada tagihan"}
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
      ) : (
        <div className="portal-empty-notice">
          <Home size={32} />
          <p><strong>Rumah belum terdaftar</strong></p>
          <p>Silakan hubungi pengurus cluster untuk menghubungkan akun Anda dengan data rumah.</p>
        </div>
      )}

      {/* Pengumuman — Task 3 toggle */}
      <section className="content-card">
        <div className="card-header-row">
          <div>
            <h3><Megaphone size={16} /> Pengumuman Terbaru</h3>
            <p className="portal-section-hint">Klik pengumuman untuk membaca selengkapnya</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div className="db-section-toggle" role="tablist" aria-label="Filter pengumuman">
              <button type="button" role="tab" aria-selected={pengumumanScope === "aktif"} className={`db-toggle-btn ${pengumumanScope === "aktif" ? "is-active" : ""}`} onClick={() => setPengumumanScope("aktif")}>Aktif</button>
              <button type="button" role="tab" aria-selected={pengumumanScope === "arsip"} className={`db-toggle-btn ${pengumumanScope === "arsip" ? "is-active" : ""}`} onClick={() => setPengumumanScope("arsip")}>Arsip</button>
            </div>
            <Link href="/portal/pengumuman" className="link-lihat-semua">Lihat semua →</Link>
          </div>
        </div>

        {pengumuman.length === 0 ? (
          <p className="portal-empty-text">{pengumumanScope === "aktif" ? "Belum ada pengumuman." : "Belum ada arsip pengumuman."}</p>
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

      {/* Kegiatan — Task 3 toggle, show empty for arsip too */}
      <section className="content-card portal-keg-section">
        <div className="card-header-row">
          <div>
            <h3><CalendarDays size={16} /> Kegiatan Terbaru</h3>
            <p className="portal-section-hint">Geser untuk melihat kegiatan lainnya</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div className="db-section-toggle" role="tablist" aria-label="Filter kegiatan">
              <button type="button" role="tab" aria-selected={kegiatanScope === "aktif"} className={`db-toggle-btn ${kegiatanScope === "aktif" ? "is-active" : ""}`} onClick={() => setKegiatanScope("aktif")}>Aktif</button>
              <button type="button" role="tab" aria-selected={kegiatanScope === "arsip"} className={`db-toggle-btn ${kegiatanScope === "arsip" ? "is-active" : ""}`} onClick={() => setKegiatanScope("arsip")}>Arsip</button>
            </div>
            <Link href="/portal/kegiatan" className="link-lihat-semua">Lihat semua →</Link>
          </div>
        </div>
        {kegiatan.length === 0 ? (
          <p className="portal-empty-text">{kegiatanScope === "aktif" ? "Belum ada kegiatan akan datang." : "Belum ada arsip kegiatan."}</p>
        ) : (
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
        )}
      </section>
    </div>
  );
}
