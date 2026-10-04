"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Eye } from "lucide-react";
import { dashboardRwApi } from "@/lib/api";
import { areaLabel, can } from "@/lib/session";
import FilterPopover, { FilterField } from "@/components/ui/FilterPopover";
import SetoranDetailModal from "@/components/setoran/SetoranDetailModal";
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
          <h2>Selamat datang kembali, {userName}</h2>
          <p>Ringkasan setoran IPL dari RT ke kas RW · {periodeLabel}.</p>
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
            <div className="ipl-summary-card keu-card keu-muted"><div className="keu-card-text"><span className="ipl-summary-label">Memuat…</span></div></div>
            <div className="ipl-summary-card keu-card keu-muted"><div className="keu-card-text"><span className="ipl-summary-label">Memuat…</span></div></div>
            <div className="ipl-summary-card keu-card keu-muted"><div className="keu-card-text"><span className="ipl-summary-label">Memuat…</span></div></div>
            <div className="ipl-summary-card keu-card keu-muted"><div className="keu-card-text"><span className="ipl-summary-label">Memuat…</span></div></div>
          </>
        ) : (
          <>
            <KpiDiterima data={data.kpi.diterima} />
            <KpiMenunggu data={data.kpi.menunggu} rtNames={rtMenunggu} />
            <KpiBelumDisetor data={data.kpi.belumDisetor} />
            <KpiKasRw data={data.kpi.kasRw} />
          </>
        )}
      </section>

      {/* ── Bawah: tren + kolom tindakan/aktivitas ── */}
      {!loading && data && (
        <div className="rw-bottom">
          <div className="rw-tren">
            <TrenSetoranChart tren={data.tren} />
          </div>
          <div className="rw-side">
            <PerluTindakanList data={data.perluTindakan} onTinjau={setDetailId} />
            <AktivitasSetoranList items={data.aktivitas} />
          </div>
        </div>
      )}

      {detailId && (
        <SetoranDetailModal
          id={detailId}
          bolehKonfirmasi={bolehKonfirmasi}
          onClose={() => setDetailId(null)}
          onSuccess={muat}
        />
      )}
    </div>
  );
}
