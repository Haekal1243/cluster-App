"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Home, Users, Search } from "lucide-react";
import { wargaApi } from "@/lib/api";
import { areaLabel, can, scopeOf } from "@/lib/session";
import { useUser } from "@/lib/useUser";
import { showConfirm, showMessage } from "@/lib/message";
import FilterPopover, { FilterField } from "@/components/ui/FilterPopover";
import Pagination from "@/components/ui/Pagination";
import Select from "@/components/ui/Select";
import { usePagination } from "@/lib/usePagination";
import RumahFormModal from "@/components/warga/RumahFormModal";

const ALL_RT = ["RT_01", "RT_02", "RT_03", "RT_04"];
const STATUS_RUMAH = {
  KOSONG: { label: "Kosong", cls: "unactived" },
  DIHUNI_TETAP: { label: "Tetap", cls: "active" },
  DIHUNI_KONTRAK: { label: "Kontrak", cls: "kontrak" },
};

function rtYangBoleh(user, kode) {
  if (scopeOf(user, kode) === "AREA" && user?.area && user.area !== "RW") return [user.area];
  return ALL_RT;
}

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

  const [rumahModal, setRumahModal] = useState({ open: false, mode: "create", data: null });

  const bolehTambah = can(user, "rumah.create");
  const bolehUbah = can(user, "rumah.update");
  const bolehHapus = can(user, "rumah.delete");
  const rtTulis = useMemo(() => rtYangBoleh(user, "rumah.update"), [user]);
  // Kolom RT cuma relevan buat pengurus RW (lihat lintas-RT); pengurus RT sudah pasti
  // cuma lihat RT-nya sendiri jadi kolomnya cuma bikin sempit tanpa nambah info.
  const tampilkanRT = !(scopeOf(user, "rumah.read") === "AREA" && user?.area && user.area !== "RW");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [w, r] = await Promise.all([wargaApi.getAll(), wargaApi.getAllRumah()]);
      setWarga(Array.isArray(w) ? w : []);
      setRumah(Array.isArray(r) ? r : []);
    } catch (error) {
      showMessage("Gagal Memuat Data", error.message, "error");
    } finally {
      setIsLoading(false);
    }
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

  const handleSubmitRumah = async (payload) => {
    try {
      if (rumahModal.mode === "edit" && rumahModal.data) {
        await wargaApi.updateRumah(rumahModal.data.id, payload);
        showMessage("Berhasil", "Data rumah berhasil diperbarui.", "success");
      } else {
        await wargaApi.createRumah(payload);
        showMessage("Berhasil", "Rumah baru berhasil ditambahkan.", "success");
      }
      setRumahModal({ open: false, mode: "create", data: null });
      loadData();
    } catch (error) {
      showMessage("Gagal Menyimpan", error.message, "error");
    }
  };

  const handleDeleteRumah = async (item) => {
    const ok = await showConfirm(
      "Hapus data rumah?",
      `Rumah ${item.blokRumah} akan dihapus.`,
      "warning",
      "Ya, hapus",
      "Batal",
    );
    if (!ok) return;
    try {
      await wargaApi.deleteRumah(item.id);
      showMessage("Berhasil", "Data rumah berhasil dihapus.", "success");
      loadData();
    } catch (error) {
      showMessage("Gagal Menghapus", error.message, "error");
    }
  };

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

        {bolehTambah && (
          <button type="button" className="btn-primary" onClick={() => setRumahModal({ open: true, mode: "create", data: null })}>
            <Plus size={16} /> Tambah Rumah
          </button>
        )}
      </div>

      <div className="table-card">
        <div className="ipl-table-header">
          <span className="ipl-table-title">Daftar Blok Rumah</span>
          <span className="ipl-table-count">{rumahFiltered.length} data</span>
        </div>
        <div className="table-wrapper warga-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Blok Rumah</th>
                {tampilkanRT && <th>RT</th>}
                <th>Penghuni</th>
                <th>Status</th>
                {(bolehUbah || bolehHapus) && <th>Aksi</th>}
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
                        {item.penghuni ? (
                          <span className="penghuni-name">{item.penghuni.namaUser}</span>
                        ) : (
                          <span className="penghuni-empty">-</span>
                        )}
                      </td>
                      <td><span className={`status-badge ${st.cls}`}>{item.status === "KOSONG" ? (item.userId ? "Kosong · ada pemilik" : "Kosong · belum daftar") : st.label}</span></td>
                      {(bolehUbah || bolehHapus) && (
                        <td>
                          <div className="table-actions">
                            {bolehUbah && (
                              <button type="button" className="btn-icon" title="Ubah" aria-label="Ubah rumah" onClick={() => setRumahModal({ open: true, mode: "edit", data: item })}>
                                <Pencil size={15} />
                              </button>
                            )}
                            {bolehHapus && (
                              <button type="button" className="btn-icon danger" title="Hapus" aria-label="Hapus rumah" onClick={() => handleDeleteRumah(item)}>
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
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
                  </h3>
                  <span className="meta-item warga-grid-penghuni">
                    {item.penghuni ? item.penghuni.namaUser : "-"}
                  </span>
                  <div className="warga-grid-footer">
                    <div className="table-actions">
                      {bolehUbah && (
                        <button type="button" className="btn-icon" aria-label="Ubah rumah" onClick={() => setRumahModal({ open: true, mode: "edit", data: item })}>
                          <Pencil size={14} />
                        </button>
                      )}
                      {bolehHapus && (
                        <button type="button" className="btn-icon danger" aria-label="Hapus rumah" onClick={() => handleDeleteRumah(item)}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <span className={`status-badge ${st.cls}`}>{item.status === "KOSONG" ? (item.userId ? "Kosong · ada pemilik" : "Kosong · belum daftar") : st.label}</span>
                  </div>
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

      <RumahFormModal
        open={rumahModal.open}
        mode={rumahModal.mode}
        initialData={rumahModal.data}
        allowedRts={rtTulis}
        onClose={() => setRumahModal({ open: false, mode: "create", data: null })}
        onSubmit={handleSubmitRumah}
      />
    </div>
  );
}
