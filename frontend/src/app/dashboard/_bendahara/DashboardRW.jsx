"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, CalendarDays, Eye, FileText, Megaphone } from "lucide-react";
import { dashboardRwApi, kegiatanApi, pengumumanApi } from "@/lib/api";
import { areaLabel, can } from "@/lib/session";
import { formatTanggalLengkap as formatKegiatanDate, formatTanggalPanjang as formatPengumumanDate } from "@/lib/format";
import FilterPopover, { FilterField } from "@/components/ui/FilterPopover";
import SetoranDetailModal from "@/components/setoran/SetoranDetailModal";
import KegiatanDetailModal from "@/components/kegiatan/KegiatanDetailModal";
import PengumumanDetailModal from "@/components/pengumuman/PengumumanDetailModal";
import {
  KpiBelumDisetor,
  KpiDiterima,
  KpiKasRw,
  KpiMenunggu,
} from "@/components/dashboard/rw/KpiCards";
import TrenSetoranChart from "@/components/dashboard/rw/TrenSetoranChart";
import PerluTindakanList from "@/components/dashboard/rw/PerluTindakanList";
import AktivitasSetoranList from "@/components/dashboard/rw/AktivitasSetoranList";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function getCurrentYm() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}

function formatYm(ym) {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return ym || "-";
  const [y, m] = ym.split("-");
  return `${MONTHS[parseInt(m, 10) - 1] || m} ${y}`;
}

function monthDiffInclusive(dari, sampai) {
  const [y1, m1] = dari.split("-").map(Number);
  const [y2, m2] = sampai.split("-").map(Number);
  return (y2 - y1) * 12 + (m2 - m1) + 1;
}

/** Dashboard khusus Bendahara RW: ringkasan setoran IPL RT → kas RW. */
export default function DashboardRW({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gagal, setGagal] = useState(null);
  const [detailId, setDetailId] = useState(null);

  const [kegiatan, setKegiatan] = useState([]);
  const [pengumuman, setPengumuman] = useState([]);
  const [selectedKegiatan, setSelectedKegiatan] = useState(null);
  const [selectedPengumuman, setSelectedPengumuman] = useState(null);

  const [periodeDari, setPeriodeDari] = useState(getCurrentYm);
  const [periodeSampai, setPeriodeSampai] = useState(getCurrentYm);
  const [draftDari, setDraftDari] = useState(getCurrentYm);
  const [draftSampai, setDraftSampai] = useState(getCurrentYm);
  const [filterOpen, setFilterOpen] = useState(false);

  const [dari, sampai] =
    periodeDari > periodeSampai ? [periodeSampai, periodeDari] : [periodeDari, periodeSampai];
  const rangeError =
    monthDiffInclusive(dari, sampai) > 12 ? "Rentang periode maksimal 12 bulan." : "";

  const [draftDariN, draftSampaiN] =
    draftDari > draftSampai ? [draftSampai, draftDari] : [draftDari, draftSampai];
  const draftError =
    draftDari && draftSampai && monthDiffInclusive(draftDariN, draftSampaiN) > 12
      ? "Rentang periode maksimal 12 bulan."
      : "";

  const muat = useCallback(async () => {
    if (rangeError) return;
    setLoading(true);
    setGagal(null);
    try {
      setData(await dashboardRwApi.get({ dari, sampai }));
    } catch (e) {
      setGagal(e?.message || "Gagal memuat dashboard.");
    } finally {
      setLoading(false);
    }
  }, [dari, sampai, rangeError]);

  useEffect(() => {
    // Fetch awal; state berikutnya mengalir dari promise, bukan render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    muat();
  }, [muat]);

  // Kegiatan & pengumuman: sama seperti dashboard warga — hanya yang aktif/akan datang.
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
      if (!cancelled) setPengumuman(data || []);
    }
    loadPengumuman();
    return () => { cancelled = true; };
  }, []);

  const isDefault = periodeDari === getCurrentYm() && periodeSampai === getCurrentYm();
  const periodeLabel =
    periodeDari === periodeSampai ? formatYm(periodeDari) : `${formatYm(periodeDari)} – ${formatYm(periodeSampai)}`;
  const userName = user?.nama || user?.name || "Bendahara RW";
  const bolehKonfirmasi = can(user, "setoran.konfirmasi");
  const menungguCount = data?.kpi?.menunggu?.count ?? 0;
  const rtMenunggu = [...new Set((data?.perluTindakan?.menunggu ?? []).map((s) => areaLabel(s.rt)))];

  return (
    <div className="page-stack rw-dash">
      {/* ── Hero ── */}
      <section
        className="welcome-banner"
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}
      >
        <div>
          <h2 className="welcome-banner-title">Selamat datang kembali, {userName}</h2>
          <p className="welcome-banner-sub">Ringkasan setoran IPL dari RT ke kas RW · {periodeLabel}.</p>
        </div>
        <div className="rw-hero-actions">
          {menungguCount > 0 && (
            <Link href="/dashboard/kelola-ipl/setoran" className="btn-ipl-primary rw-cta">
              <Eye size={16} /> Tinjau {menungguCount} setoran
            </Link>
          )}
          <FilterPopover
            active={!isDefault}
            activeCount={!isDefault ? 1 : 0}
            label={isDefault ? "Filter periode" : periodeLabel}
            hint="Maksimal 12 bulan"
            open={filterOpen}
            onOpenChange={setFilterOpen}
            onOpen={() => {
              setDraftDari(periodeDari);
              setDraftSampai(periodeSampai);
              setFilterOpen(true);
            }}
            onApply={() => {
              if (!draftDari || !draftSampai || draftError) return;
              setPeriodeDari(draftDari);
              setPeriodeSampai(draftSampai);
              setFilterOpen(false);
            }}
            onReset={() => {
              const cur = getCurrentYm();
              setPeriodeDari(cur);
              setPeriodeSampai(cur);
              setDraftDari(cur);
              setDraftSampai(cur);
              setFilterOpen(false);
            }}
            applyDisabled={!!draftError}
          >
            <FilterField label="Dari">
              <input
                type="month"
                className="form-control"
                value={draftDari}
                onChange={(e) => e.target.value && setDraftDari(e.target.value)}
              />
            </FilterField>
            <FilterField label="Sampai">
              <input
                type="month"
                className="form-control"
                value={draftSampai}
                onChange={(e) => e.target.value && setDraftSampai(e.target.value)}
              />
            </FilterField>
            {draftError && <p style={{ color: "#dc2626", fontSize: 12, margin: 0 }}>{draftError}</p>}
          </FilterPopover>
        </div>
      </section>

      {rangeError && <p style={{ color: "#dc2626", fontSize: 13, margin: 0 }}>{rangeError}</p>}
      {gagal && (
        <div className="content-card" role="alert">
          <p>{gagal}</p>
          <button type="button" className="btn-ipl-secondary" onClick={muat}>
            Coba lagi
          </button>
        </div>
      )}

      {/* ── KPI ── */}
      <section className="ipl-summary-grid keu-summary-grid rw-kpi" aria-label="Indikator setoran">
        {loading || !data ? (
          <>
            <div className="stat-card tone-muted" aria-hidden="true"><span className="stat-text"><span className="stat-label">Memuat…</span></span></div>
            <div className="stat-card tone-muted" aria-hidden="true"><span className="stat-text"><span className="stat-label">Memuat…</span></span></div>
            <div className="stat-card tone-muted" aria-hidden="true"><span className="stat-text"><span className="stat-label">Memuat…</span></span></div>
            <div className="stat-card tone-muted" aria-hidden="true"><span className="stat-text"><span className="stat-label">Memuat…</span></span></div>
          </>
        ) : (
          <>
            <KpiDiterima data={data.kpi.diterima} />
            <KpiMenunggu data={data.kpi.menunggu} rtNames={rtMenunggu} />
            <KpiBelumDisetor data={data.kpi.belumDisetor} />
            <KpiKasRw data={data.kpi.kasRw} periodeLabel={periodeLabel} />
          </>
        )}
      </section>

      {/* ── Bawah: tren + kolom tindakan/aktivitas ── */}
      {!loading && data && (
        <div className="rw-bottom">
          <div className="rw-tren">
            <TrenSetoranChart tren={data.tren} periodeLabel={periodeLabel} />
          </div>
          <div className="rw-side">
            <PerluTindakanList data={data.perluTindakan} onTinjau={setDetailId} />
            <AktivitasSetoranList items={data.aktivitas} />
          </div>
        </div>
      )}

      {/* Kegiatan Cluster */}
      <section className="content-card">
        <div className="db-section-header">
          <CalendarDays size={17} />
          <h3>Kegiatan Cluster</h3>
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

      {detailId && (
        <SetoranDetailModal
          id={detailId}
          bolehKonfirmasi={bolehKonfirmasi}
          onClose={() => setDetailId(null)}
          onSuccess={muat}
        />
      )}
      {selectedKegiatan && (
        <KegiatanDetailModal kegiatan={selectedKegiatan} onClose={() => setSelectedKegiatan(null)} />
      )}
      {selectedPengumuman && (
        <PengumumanDetailModal pengumuman={selectedPengumuman} onClose={() => setSelectedPengumuman(null)} />
      )}
    </div>
  );
}
