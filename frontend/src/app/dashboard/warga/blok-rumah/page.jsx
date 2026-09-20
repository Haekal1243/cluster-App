"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Home, Users, Search } from "lucide-react";
import { wargaApi } from "@/lib/api";
import { areaLabel, can, scopeOf } from "@/lib/session";
import { useUser } from "@/lib/useUser";
import { showConfirm, showMessage } from "@/lib/message";
import FilterPopover, { FilterField } from "@/components/ui/FilterPopover";
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

  const bolehTambah = can(user, "warga.create");
  const bolehUbah = can(user, "warga.update");
  const bolehHapus = can(user, "warga.delete");
  const rtTulis = useMemo(() => rtYangBoleh(user, "warga.create"), [user]);

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
    const dihuni = rumah.filter((r) => r.userId !== null);
    return {
      total: rumah.length,
      tetap: dihuni.filter((r) => r.status === "DIHUNI_TETAP").length,
      kontrak: dihuni.filter((r) => r.status === "DIHUNI_KONTRAK").length,
      kosong: rumah.length - dihuni.length,
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
          <div className="keu-card-head">
            <div className="keu-icon-circle"><Users size={18} strokeWidth={2} /></div>
            <span className="ipl-summary-label">Penghuni Terdaftar</span>
          </div>
          <span className="ipl-summary-value">{stats.warga}</span>
          <span className="ipl-summary-sub">seluruh cluster</span>
        </div>
        <div className="ipl-summary-card keu-card keu-green">
          <div className="keu-card-head">
            <div className="keu-icon-circle"><Home size={18} strokeWidth={2} /></div>
            <span className="ipl-summary-label">Rumah Tetap</span>
          </div>
          <span className="ipl-summary-value">{stats.tetap}</span>
          <span className="ipl-summary-sub">dihuni tetap</span>
        </div>
        <div className="ipl-summary-card keu-card keu-purple">
          <div className="keu-card-head">
            <div className="keu-icon-circle"><Home size={18} strokeWidth={2} /></div>
            <span className="ipl-summary-label">Rumah Kontrak</span>
          </div>
          <span className="ipl-summary-value">{stats.kontrak}</span>
          <span className="ipl-summary-sub">dihuni kontrak</span>
        </div>
        <div className="ipl-summary-card keu-card keu-muted">
          <div className="keu-card-head">
            <div className="keu-icon-circle"><Home size={18} strokeWidth={2} /></div>
            <span className="ipl-summary-label">Rumah Kosong</span>
          </div>
          <span className="ipl-summary-value">{stats.kosong}</span>
          <span className="ipl-summary-sub">belum berpenghuni</span>
        </div>
      </div>

      <div className="page-toolbar-row">
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
              <select className="form-control warga-filter-select" value={draftRT} onChange={(e) => setDraftRT(e.target.value)}>
                <option value="SEMUA">Semua RT</option>
                {ALL_RT.map((rt) => (
                  <option key={rt} value={rt}>{areaLabel(rt)}</option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Status rumah">
              <select className="form-control warga-filter-select" value={draftStatus} onChange={(e) => setDraftStatus(e.target.value)}>
                <option value="SEMUA">Semua Status</option>
                <option value="DIHUNI_TETAP">Dihuni (tetap)</option>
                <option value="DIHUNI_KONTRAK">Dihuni (kontrak)</option>
                <option value="KOSONG">Kosong</option>
              </select>
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
                <th>RT</th>
                <th>Penghuni</th>
                <th>Status</th>
                {(bolehUbah || bolehHapus) && <th>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {!isLoading &&
                rumahFiltered.map((item, index) => {
                  const st = STATUS_RUMAH[item.status] ?? STATUS_RUMAH.KOSONG;
                  return (
                    <tr key={item.id}>
                      <td>{index + 1}</td>
                      <td className="col-judul">{item.blokRumah}</td>
                      <td><span className="rt-badge">{areaLabel(item.rt)}</span></td>
                      <td>
                        {item.penghuni ? (
                          <div className="penghuni-cell">
                            <span className="penghuni-avatar">{item.penghuni.namaUser?.charAt(0).toUpperCase()}</span>
                            <div>
                              <span className="penghuni-name">{item.penghuni.namaUser}</span>
                              {item.penghuni._count?.rumah > 1 && (
                                <span className="penghuni-multi-badge">{item.penghuni._count.rumah} rumah</span>
                              )}
                              <span className="penghuni-email">{item.penghuni.username}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="penghuni-empty">—</span>
                        )}
                      </td>
                      <td><span className={`status-badge ${st.cls}`}>{item.userId ? `Dihuni (${st.label.toLowerCase()})` : "Kosong"}</span></td>
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
            rumahFiltered.map((item) => {
              const st = STATUS_RUMAH[item.status] ?? STATUS_RUMAH.KOSONG;
              return (
                <div key={item.id} className="warga-grid-card">
                  <h3 className="warga-grid-title">
                    {item.blokRumah}
                    <span className="rt-badge">{areaLabel(item.rt)}</span>
                  </h3>
                  <span className="meta-item warga-grid-penghuni">
                    {item.penghuni ? item.penghuni.namaUser : "Belum ada penghuni"}
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
                    <span className={`status-badge ${st.cls}`}>{item.userId ? st.label : "Kosong"}</span>
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
