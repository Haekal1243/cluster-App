"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  Home,
  ChevronDown,
  CheckCircle,
  AlertTriangle,
  Clock,
  Upload,
  Calendar,
  Building2,
} from "lucide-react";
import { portalApi } from "@/lib/api";
import BuktiUploadModal from "@/components/portal/BuktiUploadModal";

const MONTHS = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

function getMonthLabel(bulan, tahun) {
  const m = parseInt(bulan, 10);
  return `${MONTHS[m - 1] || bulan} ${tahun}`;
}

function formatRt(rt) {
  return String(rt || "").replace("_", " ");
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

function rupiah(n) {
  return `Rp ${(Number(n) || 0).toLocaleString("id-ID")}`;
}

export default function PortalTagihanPage() {
  const now = new Date();
  const bulanIniDefault = String(now.getMonth() + 1).padStart(2, "0");
  const tahunIniDefault = String(now.getFullYear());

  const [user, setUser] = useState(null);
  const [rumahList, setRumahList] = useState([]);
  const [tagihanGabungan, setTagihanGabungan] = useState([]);
  const [loadingRumah, setLoadingRumah] = useState(true);
  const [loadingTagihan, setLoadingTagihan] = useState(false);
  const [modalIpl, setModalIpl] = useState(null); // IPL yang akan dibayar

  // Filter periode + filter rumah
  const [filterBulan, setFilterBulan] = useState(bulanIniDefault);
  const [filterTahun, setFilterTahun] = useState(tahunIniDefault);
  const [selectedRumahId, setSelectedRumahId] = useState("semua");

  const tahunOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return [String(y - 2), String(y - 1), String(y), String(y + 1)];
  }, []);

  const loadGabungan = async (uid, bulan, tahun) => {
    setLoadingTagihan(true);
    try {
      const res = await portalApi.getTagihanByUser(uid, { bulan, tahun });
      setRumahList(res.rumah || []);
      setTagihanGabungan(res.tagihan || []);
    } catch (err) {
      console.warn("getTagihanByUser gagal, fallback per-rumah:", err);
      // Fallback: ambil rumah lalu tagihan per rumah satu-satu
      const rumah = await portalApi.getRumahByUser(uid);
      setRumahList(rumah || []);
      const all = [];
      for (const r of rumah || []) {
        try {
          const { tagihan } = await portalApi.getTagihanByRumah(r.id);
          let filtered = tagihan || [];
          if (bulan) filtered = filtered.filter((t) => t.bulanPeriode === bulan);
          if (tahun) filtered = filtered.filter((t) => t.tahunPeriode === tahun);
          all.push(...filtered.map((t) => ({ ...t, rumah: { id: r.id, blokRumah: r.blokRumah, rt: r.rt } })));
        } catch (rumahErr) {
          console.warn(`Gagal memuat tagihan rumah ${r.id}:`, rumahErr);
        }
      }
      setTagihanGabungan(all);
    } finally {
      setLoadingTagihan(false);
      setLoadingRumah(false);
    }
  };

  // Load user + data gabungan on mount & saat filter periode berubah
  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) {
      setLoadingRumah(false);
      return;
    }
    const u = JSON.parse(raw);
    setUser(u);
    loadGabungan(u.id, filterBulan, filterTahun);
  }, [filterBulan, filterTahun]);

  const handleUploadSuccess = () => {
    if (!user) return;
    loadGabungan(user.id, filterBulan, filterTahun);
  };

  // Data tabel: filter по rumah terpilih
  const displayData = useMemo(() => {
    if (selectedRumahId === "semua") return tagihanGabungan;
    const id = Number(selectedRumahId);
    return tagihanGabungan.filter((t) => (t.rumah?.id ?? t.idRumah) === id);
  }, [tagihanGabungan, selectedRumahId]);

  // Ringkasan tampilan (periode terpilih, sesuai filter rumah)
  const ringkasan = useMemo(() => {
    const total = displayData.reduce((s, t) => s + (t.nominal || 0), 0);
    return {
      totalNominal: total,
      totalTagihan: displayData.length,
      lunas: displayData.filter((t) => t.statusPembayaran === "LUNAS").length,
      belumLunas: displayData.filter((t) => t.statusPembayaran === "BELUM_LUNAS").length,
      menunggu: displayData.filter((t) => t.statusPembayaran === "MENUNGGU_KONFIRMASI").length,
    };
  }, [displayData]);

  // Label periode untuk hero & tabel (mengikuti filter yang dipilih)
  const heroLabel = filterBulan && filterTahun
    ? getMonthLabel(filterBulan, filterTahun)
    : "Semua Periode";

  const modalRumah = useMemo(() => {
    if (!modalIpl) return null;
    const rid = modalIpl.rumah?.id ?? modalIpl.idRumah;
    return rumahList.find((r) => r.id === rid) || modalIpl.rumah || null;
  }, [modalIpl, rumahList]);

  const resetFilter = () => {
    setFilterBulan(bulanIniDefault);
    setFilterTahun(tahunIniDefault);
    setSelectedRumahId("semua");
  };

  if (loadingRumah) {
    return (
      <div className="portal-loading">
        <div className="portal-spinner" />
        <p>Memuat data rumah...</p>
      </div>
    );
  }

  if (rumahList.length === 0 && !loadingTagihan) {
    return (
      <div className="page-stack">
        <div className="portal-empty-notice">
          <Home size={40} />
          <p><strong>Rumah belum terdaftar</strong></p>
          <p>Akun Anda belum dihubungkan ke unit rumah. Hubungi pengurus cluster.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-stack">
      {/* Ringkasan Total Gabungan */}
      <section className="portal-tagihan-hero">
        <div className="portal-tagihan-hero-left">
          <div className="portal-tagihan-hero-icon">
            <CreditCard size={28} />
          </div>
          <div>
            <p className="portal-tagihan-period">
              {selectedRumahId === "semua"
                ? `Semua Unit (${rumahList.length} Rumah)`
                : (() => {
                    const r = rumahList.find((x) => x.id === Number(selectedRumahId));
                    return r ? `${r.blokRumah} · ${formatRt(r.rt)}` : "";
                  })()}
            </p>
            <h3 className="portal-tagihan-month">
              Total Tagihan {heroLabel}
            </h3>
            <p className="portal-stat-sub">
              {ringkasan.lunas} lunas · {ringkasan.belumLunas} belum lunas
              {ringkasan.menunggu > 0 ? ` · ${ringkasan.menunggu} menunggu` : ""}
            </p>
          </div>
        </div>

        {loadingTagihan ? (
          <div className="portal-spinner-sm" />
        ) : (
          <div className="portal-tagihan-hero-right">
            <span className="portal-tagihan-amount">
              {rupiah(ringkasan.totalNominal)}
            </span>
            {ringkasan.totalTagihan > 0 && (
              <span className="portal-stat-sub">
                {ringkasan.totalTagihan} tagihan
                {rumahList.length > 1 && selectedRumahId === "semua" ? ` · ${rumahList.length} unit` : ""}
              </span>
            )}
          </div>
        )}
      </section>

      {/* Filter Periode + Filter Rumah */}
      <section className="content-card">
        <div className="card-header-row">
          <h3><Calendar size={16} /> Filter Periode & Unit</h3>
          {(filterBulan !== bulanIniDefault || filterTahun !== tahunIniDefault || selectedRumahId !== "semua") && (
            <button type="button" className="link-lihat-semua" onClick={resetFilter}>
              Reset ke bulan ini
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div className="portal-select-wrap" style={{ minWidth: 150, flex: 1 }}>
            <label className="portal-selector-label" htmlFor="filter-bulan">
              <Calendar size={13} /> Bulan
            </label>
            <select
              id="filter-bulan"
              className="portal-select"
              value={filterBulan}
              onChange={(e) => setFilterBulan(e.target.value)}
            >
              <option value="">Semua Bulan</option>
              {MONTHS.map((m, i) => {
                const v = String(i + 1).padStart(2, "0");
                return <option key={v} value={v}>{m}</option>;
              })}
            </select>
          </div>
          <div className="portal-select-wrap" style={{ minWidth: 130, flex: 1 }}>
            <label className="portal-selector-label" htmlFor="filter-tahun">
              <Calendar size={13} /> Tahun
            </label>
            <select
              id="filter-tahun"
              className="portal-select"
              value={filterTahun}
              onChange={(e) => setFilterTahun(e.target.value)}
            >
              <option value="">Semua Tahun</option>
              {tahunOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          {rumahList.length > 1 && (
            <div className="portal-select-wrap" style={{ minWidth: 200, flex: 2 }}>
              <label className="portal-selector-label" htmlFor="rumah-select">
                <Building2 size={13} /> Unit Rumah
              </label>
              <select
                id="rumah-select"
                className="portal-select"
                value={selectedRumahId}
                onChange={(e) => setSelectedRumahId(e.target.value)}
              >
                <option value="semua">Semua Unit ({rumahList.length})</option>
                {rumahList.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.blokRumah} — {formatRt(r.rt)}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="portal-select-icon" />
            </div>
          )}
        </div>
      </section>

      {/* Rincian per Rumah (tampil saat mode gabungan) */}
      {rumahList.length > 1 && selectedRumahId === "semua" && displayData.length > 0 && (
        <section className="content-card">
          <div className="card-header-row">
            <h3><Home size={16} /> Rincian per Unit</h3>
          </div>
          <ul className="portal-pengumuman-list">
            {rumahList.map((r) => {
              const items = tagihanGabungan.filter((t) => (t.rumah?.id ?? t.idRumah) === r.id);
              if (items.length === 0) return null;
              const subtotal = items.reduce((s, t) => s + (t.nominal || 0), 0);
              const belum = items.filter((t) => t.statusPembayaran === "BELUM_LUNAS").length;
              return (
                <li key={r.id} className="portal-pengumuman-item">
                  <div className="portal-stat-icon" style={{ width: 36, height: 36 }}>
                    <Home size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p className="portal-peng-judul">{r.blokRumah} — {formatRt(r.rt)}</p>
                    <p className="portal-peng-desc">
                      {items.length} tagihan · {rupiah(subtotal)}
                      {belum > 0 ? ` · ${belum} belum lunas` : " · semua lunas"}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-primary btn-sm"
                    onClick={() => setSelectedRumahId(String(r.id))}
                  >
                    Detail
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Tabel Riwayat Tagihan */}
      <section className="content-card">
        <div className="card-header-row">
          <h3>Riwayat Tagihan {heroLabel}</h3>
          {selectedRumahId !== "semua" && (
            <button type="button" className="link-lihat-semua" onClick={() => setSelectedRumahId("semua")}>
              ← Tampilkan semua unit
            </button>
          )}
        </div>

        {loadingTagihan ? (
          <div className="portal-loading-inline">
            <div className="portal-spinner-sm" />
            <span>Memuat tagihan...</span>
          </div>
        ) : displayData.length === 0 ? (
          <p className="portal-empty-text">
            Belum ada riwayat tagihan {filterBulan || filterTahun ? `untuk periode ${heroLabel}` : ""}
            {selectedRumahId !== "semua" ? " pada unit ini" : " pada semua unit Anda"}.
          </p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  {rumahList.length > 1 && selectedRumahId === "semua" && <th>Unit</th>}
                  <th>Periode</th>
                  <th>Nominal</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {displayData.map((ipl) => (
                  <tr key={ipl.id}>
                    {rumahList.length > 1 && selectedRumahId === "semua" && (
                      <td>{ipl.rumah ? `${ipl.rumah.blokRumah} · ${formatRt(ipl.rumah.rt)}` : `Rumah #${ipl.idRumah}`}</td>
                    )}
                    <td>{getMonthLabel(ipl.bulanPeriode, ipl.tahunPeriode)}</td>
                    <td>{rupiah(ipl.nominal)}</td>
                    <td><StatusBadge status={ipl.statusPembayaran} /></td>
                    <td>
                      {ipl.statusPembayaran === "BELUM_LUNAS" ? (
                        <button
                          type="button"
                          className="btn-primary btn-sm"
                          onClick={() => setModalIpl(ipl)}
                        >
                          <Upload size={13} /> Bayar
                        </button>
                      ) : ipl.statusPembayaran === "MENUNGGU_KONFIRMASI" ? (
                        <span className="text-muted text-sm">Menunggu konfirmasi...</span>
                      ) : (
                        <span className="text-success text-sm">✓ Lunas</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal Upload Bukti */}
      {modalIpl && (
        <BuktiUploadModal
          ipl={modalIpl}
          user={user}
          rumah={modalRumah}
          onClose={() => setModalIpl(null)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </div>
  );
}
