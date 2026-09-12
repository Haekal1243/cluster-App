"use client";

import { useEffect, useState } from "react";
import {
  CreditCard,
  Home,
  ChevronDown,
  CheckCircle,
  AlertTriangle,
  Clock,
  Upload,
} from "lucide-react";
import { portalApi } from "@/lib/api";
import BuktiUploadModal from "@/components/portal/BuktiUploadModal";

const MONTHS = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

function getMonthLabel(bulan, tahun) {
  const m = parseInt(bulan, 10);
  return `${MONTHS[m - 1] || bulan} ${tahun}`;
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

export default function PortalTagihanPage() {
  const [user, setUser] = useState(null);
  const [rumahList, setRumahList] = useState([]);
  const [selectedRumah, setSelectedRumah] = useState(null);
  const [tagihanData, setTagihanData] = useState([]);
  const [loadingRumah, setLoadingRumah] = useState(true);
  const [loadingTagihan, setLoadingTagihan] = useState(false);
  const [modalIpl, setModalIpl] = useState(null); // IPL yang akan dibayar

  // Load user + rumah on mount
  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) return;
    const u = JSON.parse(raw);
    setUser(u);

    portalApi.getRumahByUser(u.id)
      .then((rumah) => {
        setRumahList(rumah);
        if (rumah.length > 0) setSelectedRumah(rumah[0]);
      })
      .catch(console.error)
      .finally(() => setLoadingRumah(false));
  }, []);

  // Load tagihan saat rumah berubah
  useEffect(() => {
    if (!selectedRumah) return;
    setLoadingTagihan(true);
    setTagihanData([]);
    portalApi.getTagihanByRumah(selectedRumah.id)
      .then((res) => setTagihanData(res.tagihan || []))
      .catch(console.error)
      .finally(() => setLoadingTagihan(false));
  }, [selectedRumah]);

  const handleUploadSuccess = () => {
    // Reload tagihan setelah upload sukses
    if (!selectedRumah) return;
    setLoadingTagihan(true);
    portalApi.getTagihanByRumah(selectedRumah.id)
      .then((res) => setTagihanData(res.tagihan || []))
      .catch(console.error)
      .finally(() => setLoadingTagihan(false));
  };

  // Tagihan bulan berjalan (bulan + tahun sekarang)
  const now = new Date();
  const bulanIni = String(now.getMonth() + 1).padStart(2, "0");
  const tahunIni = String(now.getFullYear());
  const tagBulanIni = tagihanData.find(
    (t) => t.bulanPeriode === bulanIni && t.tahunPeriode === tahunIni
  );

  if (loadingRumah) {
    return (
      <div className="portal-loading">
        <div className="portal-spinner" />
        <p>Memuat data rumah...</p>
      </div>
    );
  }

  if (rumahList.length === 0) {
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
      {/* Selector Rumah */}
      {rumahList.length > 1 && (
        <section className="portal-rumah-selector">
          <label htmlFor="rumah-select" className="portal-selector-label">
            <Home size={15} /> Pilih Unit Rumah
          </label>
          <div className="portal-select-wrap">
            <select
              id="rumah-select"
              className="portal-select"
              value={selectedRumah?.id || ""}
              onChange={(e) => {
                const r = rumahList.find((x) => x.id === +e.target.value);
                setSelectedRumah(r || null);
              }}
            >
              {rumahList.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.blokRumah} — {r.rt.replace("_", " ")}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="portal-select-icon" />
          </div>
        </section>
      )}

      {/* Kartu Tagihan Bulan Ini */}
      <section className="portal-tagihan-hero">
        <div className="portal-tagihan-hero-left">
          <div className="portal-tagihan-hero-icon">
            <CreditCard size={28} />
          </div>
          <div>
            <p className="portal-tagihan-period">
              {selectedRumah ? `${selectedRumah.blokRumah} · ${selectedRumah.rt.replace("_", " ")}` : ""}
            </p>
            <h3 className="portal-tagihan-month">
              Tagihan {MONTHS[now.getMonth()]} {tahunIni}
            </h3>
          </div>
        </div>

        {loadingTagihan ? (
          <div className="portal-spinner-sm" />
        ) : tagBulanIni ? (
          <div className="portal-tagihan-hero-right">
            <span className="portal-tagihan-amount">
              Rp {tagBulanIni.nominal.toLocaleString("id-ID")}
            </span>
            <StatusBadge status={tagBulanIni.statusPembayaran} />
            {tagBulanIni.statusPembayaran === "BELUM_LUNAS" && (
              <button
                type="button"
                className="portal-bayar-btn"
                onClick={() => setModalIpl(tagBulanIni)}
              >
                <Upload size={15} /> Bayar Sekarang
              </button>
            )}
          </div>
        ) : (
          <span className="portal-no-tagihan">Belum ada tagihan bulan ini</span>
        )}
      </section>

      {/* Tabel Riwayat Tagihan */}
      <section className="content-card">
        <div className="card-header-row">
          <h3>Riwayat Tagihan</h3>
        </div>

        {loadingTagihan ? (
          <div className="portal-loading-inline">
            <div className="portal-spinner-sm" />
            <span>Memuat tagihan...</span>
          </div>
        ) : tagihanData.length === 0 ? (
          <p className="portal-empty-text">Belum ada riwayat tagihan untuk unit ini.</p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Periode</th>
                  <th>Nominal</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {tagihanData.map((ipl) => (
                  <tr key={ipl.id}>
                    <td>{getMonthLabel(ipl.bulanPeriode, ipl.tahunPeriode)}</td>
                    <td>Rp {ipl.nominal.toLocaleString("id-ID")}</td>
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
          rumah={selectedRumah}
          onClose={() => setModalIpl(null)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </div>
  );
}
