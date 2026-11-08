"use client";

import { useEffect, useMemo, useState } from "react";
import { Home, Users, Search } from "lucide-react";
import { wargaApi } from "@/lib/api";
import { areaLabel, scopeOf } from "@/lib/session";
import { useUser } from "@/lib/useUser";
import { showMessage } from "@/lib/message";
import FilterPopover, { FilterField } from "@/components/ui/FilterPopover";
import Pagination from "@/components/ui/Pagination";
import Select from "@/components/ui/Select";
import { usePagination } from "@/lib/usePagination";

const ALL_RT = ["RT_01", "RT_02", "RT_03", "RT_04"];
const STATUS_RUMAH = {
  KOSONG: { label: "Kosong", cls: "unactived" },
  DIHUNI_TETAP: { label: "Tetap", cls: "active" },
  DIHUNI_KONTRAK: { label: "Kontrak", cls: "kontrak" },
};

export default function BlokRumahPage() {
  const { user } = useUser();
  const [warga, setWarga] = useState([]);
  const [rumah, setRumah] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterRT, setFilterRT] = useState("SEMUA");
  const [filterStatus, setFilterStatus] = useState("SEMUA");
  const [draftRT, setDraftRT] = useState("SEMUA");
  const [draftStatus, setDraftStatus] = useState("SEMUA");

  const [gagalWarga, setGagalWarga] = useState(null);
  const [gagalRumah, setGagalRumah] = useState(null);

  const tampilkanRT = !(scopeOf(user, "rumah.read") === "AREA" && user?.area && user.area !== "RW");

  const loadData = async () => {
    setIsLoading(true);
    setGagalWarga(null);
    setGagalRumah(null);
    const [wRes, rRes] = await Promise.allSettled([wargaApi.getAll(), wargaApi.getAllRumah()]);
    if (wRes.status === "fulfilled") {
      setWarga(Array.isArray(wRes.value) ? wRes.value : []);
    } else {
      setGagalWarga(wRes.reason?.message || "Gagal memuat data warga.");
    }
    if (rRes.status === "fulfilled") {
      setRumah(Array.isArray(rRes.value) ? rRes.value : []);
    } else {
      setGagalRumah(rRes.reason?.message || "Gagal memuat data rumah.");
    }
    if (wRes.status === "rejected" && rRes.status === "rejected") {
      showMessage("Gagal Memuat Data", wRes.reason?.message || rRes.reason?.message || "Terjadi kesalahan pada server.", "error");
    } else if (wRes.status === "rejected" || rRes.status === "rejected") {
      showMessage(
        "Sebagian Data Gagal Dimuat",
        wRes.status === "rejected"
          ? `Data warga: ${wRes.reason?.message}`
          : `Data rumah: ${rRes.reason?.message}`,
        "error",
      );
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => {
    const kosong = rumah.filter((r) => r.status === "KOSONG");
    return {
      total: rumah.length,
      tetap: rumah.filter((r) => r.status === "DIHUNI_TETAP").length,
      kontrak: rumah.filter((r) => r.status === "DIHUNI_KONTRAK").length,
      kosong: kosong.length,
      kosongAdaPemilik: kosong.filter((r) => r.userId !== null).length,
      kosongBelumDaftar: kosong.filter((r) => r.userId === null).length,
      warga: warga.length,
    };
  }, [rumah, warga]);

  const q = search.trim().toLowerCase();

  const rumahFiltered = useMemo(
    () =>
      rumah.filter((r) => {
        const matchSearch =
          !q ||
          r.blokRumah.toLowerCase().includes(q) ||
          (r.penghuni?.namaUser ?? "").toLowerCase().includes(q);
        const matchRT = filterRT === "SEMUA" || r.rt === filterRT;
        const matchStatus = filterStatus === "SEMUA" || r.status === filterStatus;
        return matchSearch && matchRT && matchStatus;
      }),
    [rumah, q, filterRT, filterStatus],
  );

  const filterAktif = filterRT !== "SEMUA" || filterStatus !== "SEMUA";

  const { page, totalPages, paginatedItems: rumahPage, prev, next } = usePagination(
    rumahFiltered,
    [q, filterRT, filterStatus],
  );

  return (
    <div className="page-stack">
      <div className="ipl-summary-grid keu-summary-grid">
        <div className="ipl-summary-card keu-card keu-teal">
          <div className="keu-icon-circle"><Users size={22} strokeWidth={2} /></div>
          <div className="keu-card-text">
            <span className="ipl-summary-label">Penghuni Terdaftar</span>
            <span className="ipl-summary-value">{stats.warga}</span>
          </div>
        </div>
        <div className="ipl-summary-card keu-card keu-green">
          <div className="keu-icon-circle"><Home size={22} strokeWidth={2} /></div>
          <div className="keu-card-text">
            <span className="ipl-summary-label">Rumah Tetap</span>
            <span className="ipl-summary-value">{stats.tetap}</span>
          </div>
        </div>
        <div className="ipl-summary-card keu-card keu-purple">
          <div className="keu-icon-circle"><Home size={22} strokeWidth={2} /></div>
          <div className="keu-card-text">
            <span className="ipl-summary-label">Rumah Kontrak</span>
            <span className="ipl-summary-value">{stats.kontrak}</span>
          </div>
        </div>
        <div className="ipl-summary-card keu-card keu-amber">
          <div className="keu-icon-circle"><Home size={22} strokeWidth={2} /></div>
          <div className="keu-card-text">
            <span className="ipl-summary-label">Rumah Kosong</span>
            <span className="ipl-summary-value">{stats.kosong}</span>
          </div>
        </div>
      </div>

      {(gagalWarga || gagalRumah) && !isLoading && (
        <div className="table-empty" role="alert">
          {gagalWarga && <div>Data warga gagal dimuat: {gagalWarga}</div>}
          {gagalRumah && <div>Data rumah gagal dimuat: {gagalRumah}</div>}
          <div style={{ marginTop: 8 }}>
            <button type="button" className="btn-primary" onClick={loadData}>
              Coba lagi
            </button>
          </div>
        </div>
      )}

      <div className="page-toolbar-row warga-toolbar-row">
        <div className="warga-filter-bar">
          <div className="warga-search-wrap">
            <Search size={15} className="warga-search-icon" />
            <input
              type="text"
              className="warga-search-input"
              placeholder="Cari blok rumah atau penghuni…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <FilterPopover
            active={filterAktif}
            activeCount={(filterRT !== "SEMUA" ? 1 : 0) + (filterStatus !== "SEMUA" ? 1 : 0)}
            onOpen={() => {
              setDraftRT(filterRT);
              setDraftStatus(filterStatus);
            }}
            onApply={() => {
              setFilterRT(draftRT);
              setFilterStatus(draftStatus);
            }}
            onReset={() => {
              setFilterRT("SEMUA");
              setFilterStatus("SEMUA");
              setDraftRT("SEMUA");
              setDraftStatus("SEMUA");
            }}
          >
            <FilterField label="RT">
              <Select
                className="warga-filter-select"
                value={draftRT}
                onChange={(v) => setDraftRT(v)}
                options={[
                  { value: "SEMUA", label: "Semua RT" },
                  ...ALL_RT.map((rt) => ({ value: rt, label: areaLabel(rt) })),
                ]}
              />
            </FilterField>
            <FilterField label="Status rumah">
              <Select
                className="warga-filter-select"
                value={draftStatus}
                onChange={(v) => setDraftStatus(v)}
                options={[
                  { value: "SEMUA", label: "Semua Status" },
                  { value: "DIHUNI_TETAP", label: "Dihuni (tetap)" },
                  { value: "DIHUNI_KONTRAK", label: "Dihuni (kontrak)" },
                  { value: "KOSONG", label: "Kosong" },
                ]}
              />
            </FilterField>
          </FilterPopover>
        </div>

      </div>

      <div className="table-card">
        <div className="ipl-table-header">
          <span className="ipl-table-title">Daftar Blok Rumah</span>
          <span className="ipl-table-count">{rumahFiltered.length} data</span>
        </div>
        <div className="table-wrapper warga-table-wrapper">
          <table className="data-table tabel-blok-rumah">
            <thead>
              <tr>
                <th>No</th>
                <th>Blok Rumah</th>
                {tampilkanRT && <th>RT</th>}
                <th>Penghuni</th>
                <th>Status</th>
                
              </tr>
            </thead>
            <tbody>
              {!isLoading &&
                rumahPage.map((item, index) => {
                  const st = STATUS_RUMAH[item.status] ?? STATUS_RUMAH.KOSONG;
                  return (
                    <tr key={item.id}>
                      <td>{(page - 1) * 10 + index + 1}</td>
                      <td className="col-judul">{item.blokRumah}</td>
                      {tampilkanRT && <td><span className="rt-badge">{areaLabel(item.rt)}</span></td>}
                      <td>
                        {(item.penyewa ?? item.penghuni) ? (
                          <span className="penghuni-name">{(item.penyewa ?? item.penghuni).namaUser}</span>
                        ) : (
                          <span className="penghuni-empty">-</span>
                        )}
                      </td>
                      <td><span className={`status-badge ${st.cls}`}>{item.status === "KOSONG" ? (item.userId ? "Kosong · ada pemilik" : "Kosong · belum daftar") : st.label}</span></td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <div className="warga-grid">
          {!isLoading &&
            rumahPage.map((item) => {
              const st = STATUS_RUMAH[item.status] ?? STATUS_RUMAH.KOSONG;
              return (
                <div key={item.id} className="warga-grid-card">
                  <h3 className="warga-grid-title">
                    {item.blokRumah}
                    {tampilkanRT && <span className="rt-badge">{areaLabel(item.rt)}</span>}
                    <span className={`status-badge ${st.cls}`}>{item.status === "KOSONG" ? (item.userId ? "Kosong · ada pemilik" : "Kosong · belum daftar") : st.label}</span>
                  </h3>
                  <span className="meta-item warga-grid-penghuni">
                    {(item.penyewa ?? item.penghuni)?.namaUser ?? "-"}
                  </span>
                </div>
              );
            })}
        </div>

        {isLoading && <div className="table-loading">Memuat data rumah…</div>}
        {!isLoading && rumahFiltered.length === 0 && (
          <div className="table-empty">
            {rumah.length === 0 ? "Belum ada data rumah." : "Tidak ada rumah yang sesuai filter."}
          </div>
        )}
        {!isLoading && (
          <Pagination page={page} totalPages={totalPages} total={rumahFiltered.length} onPrev={prev} onNext={next} />
        )}
      </div>
    </div>
  );
}
