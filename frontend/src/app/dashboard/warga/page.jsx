"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Home,
  Users,
  Search,
  PhoneCall,
} from "lucide-react";
import { wargaApi } from "@/lib/warga.api";
import { showConfirm, showMessage } from "@/lib/message";
import FilterPopover, { FilterField } from "@/components/ui/FilterPopover";
import RumahFormModal from "@/components/warga/RumahFormModal";

const RT_OPTIONS = ["Semua RT", "RT_01", "RT_02", "RT_03", "RT_04"];
const STATUS_OPTIONS = ["Semua Status", "Dihuni", "Kosong"];

export default function WargaPage() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selected, setSelected] = useState(null);

  // Filter state
  const [search, setSearch] = useState("");
  const [filterRT, setFilterRT] = useState("Semua RT");
  const [filterStatus, setFilterStatus] = useState("Semua Status");
  const [draftFilterRT, setDraftFilterRT] = useState("Semua RT");
  const [draftFilterStatus, setDraftFilterStatus] = useState("Semua Status");

  const handleFilterOpen = () => {
    setDraftFilterRT(filterRT);
    setDraftFilterStatus(filterStatus);
  };
  const handleFilterApply = () => {
    setFilterRT(draftFilterRT);
    setFilterStatus(draftFilterStatus);
  };
  const handleFilterReset = () => {
    setFilterRT("Semua RT");
    setFilterStatus("Semua Status");
    setDraftFilterRT("Semua RT");
    setDraftFilterStatus("Semua Status");
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await wargaApi.getAllRumah();
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      showMessage("Gagal Memuat Data", error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ── Stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = items.length;
    const dihuni = items.filter((r) => r.userId !== null).length;
    const kosong = total - dihuni;
    return { total, dihuni, kosong };
  }, [items]);

  // ── Filtered list ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return items.filter((r) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        r.blokRumah.toLowerCase().includes(q) ||
        (r.penghuni?.namaUser ?? "").toLowerCase().includes(q) ||
        (r.penghuni?.email ?? "").toLowerCase().includes(q);

      const matchRT = filterRT === "Semua RT" || r.rt === filterRT;

      const matchStatus =
        filterStatus === "Semua Status" ||
        (filterStatus === "Dihuni" && r.userId !== null) ||
        (filterStatus === "Kosong" && r.userId === null);

      return matchSearch && matchRT && matchStatus;
    });
  }, [items, search, filterRT, filterStatus]);

  // ── Handlers ───────────────────────────────────────────────────────
  const openCreate = () => {
    setModalMode("create");
    setSelected(null);
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setModalMode("edit");
    setSelected(item);
    setModalOpen(true);
  };

  const handleSubmit = async (payload) => {
    try {
      if (modalMode === "edit" && selected) {
        await wargaApi.updateRumah(selected.id, payload);
        showMessage("Berhasil", "Data rumah berhasil diperbarui.", "success");
      } else {
        await wargaApi.createRumah(payload);
        showMessage("Berhasil", "Rumah baru berhasil ditambahkan.", "success");
      }
      setModalOpen(false);
      loadData();
    } catch (error) {
      showMessage("Gagal Menyimpan", error.message, "error");
    }
  };

  const handleDelete = async (item) => {
    const confirmed = await showConfirm(
      "Hapus Data Rumah?",
      `Rumah ${item.blokRumah} akan dihapus permanen.`,
      "warning",
      "Ya, hapus",
      "Batal",
    );
    if (!confirmed) return;

    try {
      await wargaApi.removeRumah(item.id);
      showMessage("Berhasil", "Data rumah berhasil dihapus.", "success");
      loadData();
    } catch (error) {
      showMessage("Gagal Menghapus", error.message, "error");
    }
  };

  // WhatsApp link
  const waLink = (noTelp) => {
    if (!noTelp) return null;
    const clean = noTelp.replace(/\D/g, "");
    const number = clean.startsWith("0") ? `62${clean.slice(1)}` : clean;
    return `https://wa.me/${number}`;
  };

  return (
    <div className="page-stack">
      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="page-toolbar">
        <div>
          <h2>Data Warga &amp; Rumah</h2>
          <p>Kelola unit rumah dan pemilik yang terdaftar di cluster Topaz.</p>
        </div>
      </div>

      {/* ── Stats cards ─────────────────────────────────────────────── */}
      <div className="warga-stat-row">
        <div className="warga-stat-card tone-info">
          <div className="warga-stat-top">
            <span className="warga-stat-icon">
              <Home size={20} />
            </span>
            <span className="warga-stat-value">{stats.total}</span>
          </div>
          <span className="warga-stat-label">Total Unit Rumah</span>
        </div>
        <div className="warga-stat-card tone-success">
          <div className="warga-stat-top">
            <span className="warga-stat-icon">
              <Users size={20} />
            </span>
            <span className="warga-stat-value">{stats.dihuni}</span>
          </div>
          <span className="warga-stat-label">Dihuni</span>
        </div>
        <div className="warga-stat-card tone-warning">
          <div className="warga-stat-top">
            <span className="warga-stat-icon">
              <Home size={20} />
            </span>
            <span className="warga-stat-value">{stats.kosong}</span>
          </div>
          <span className="warga-stat-label">Kosong</span>
        </div>
      </div>

      {/* ── Tambah Rumah + Filter bar ─────────────────────────────────── */}
      <div className="page-toolbar-row">
        <button type="button" className="btn-primary" onClick={openCreate}>
          <Plus size={16} />
          Tambah Rumah
        </button>

        <div className="warga-filter-bar">
          <div className="warga-search-wrap">
            <Search size={15} className="warga-search-icon" />
            <input
              type="text"
              className="warga-search-input"
              placeholder="Cari nama warga atau blok rumah…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <FilterPopover
            active={filterRT !== "Semua RT" || filterStatus !== "Semua Status"}
            onOpen={handleFilterOpen}
            onApply={handleFilterApply}
            onReset={handleFilterReset}
          >
            <FilterField label="RT">
              <select
                className="form-control warga-filter-select"
                value={draftFilterRT}
                onChange={(e) => setDraftFilterRT(e.target.value)}
              >
                {RT_OPTIONS.map((rt) => (
                  <option key={rt} value={rt}>
                    {rt.replace("_", " ")}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Status">
              <select
                className="form-control warga-filter-select"
                value={draftFilterStatus}
                onChange={(e) => setDraftFilterStatus(e.target.value)}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </FilterField>
          </FilterPopover>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────── */}
      <div className="table-card">
        <div className="ipl-table-header">
          <span className="ipl-table-title">Daftar Data Warga</span>
          <span className="ipl-table-count">{filtered.length} data</span>
        </div>

        <div className="table-wrapper warga-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Blok Rumah</th>
              <th>RT</th>
              <th>Pemilik / Penanggung Jawab</th>
              <th>Kontak</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {!isLoading &&
              filtered.map((item, index) => {
                const penghuni = item.penghuni;
                const isDihuni = item.userId !== null;
                const jumlahRumah = penghuni?._count?.rumah ?? 0;

                return (
                  <tr key={item.id}>
                    <td>{index + 1}</td>

                    {/* Blok Rumah */}
                    <td className="col-judul">{item.blokRumah}</td>

                    {/* RT */}
                    <td>
                      <span className="rt-badge">
                        {item.rt.replace("_", " ")}
                      </span>
                    </td>

                    {/* Pemilik */}
                    <td>
                      {penghuni ? (
                        <div className="penghuni-cell">
                          <span className="penghuni-avatar">
                            {penghuni.namaUser?.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <span className="penghuni-name">
                              {penghuni.namaUser}
                            </span>
                            {jumlahRumah > 1 && (
                              <span className="penghuni-multi-badge">
                                {jumlahRumah} rumah
                              </span>
                            )}
                            <span className="penghuni-email">
                              {penghuni.email}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="penghuni-empty">—</span>
                      )}
                    </td>

                    {/* Kontak */}
                    <td>
                      {penghuni?.noTelp ? (
                        <a
                          href={waLink(penghuni.noTelp)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="wa-link"
                          title={`Chat WhatsApp ${penghuni.namaUser}`}
                        >
                          <PhoneCall size={13} />
                          {penghuni.noTelp}
                        </a>
                      ) : (
                        <span style={{ color: "var(--db-slate-400)" }}>—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td>
                      <span
                        className={`status-badge ${isDihuni ? "active" : "unactived"}`}
                      >
                        {isDihuni ? "Dihuni" : "Kosong"}
                      </span>
                    </td>

                    {/* Aksi */}
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => openEdit(item)}
                          aria-label="Edit rumah"
                          title="Edit"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon danger"
                          onClick={() => handleDelete(item)}
                          aria-label="Hapus rumah"
                          title="Hapus"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
        </div>

        <div className="warga-grid">
          {!isLoading &&
            filtered.map((item) => {
              const penghuni = item.penghuni;
              const isDihuni = item.userId !== null;
              const jumlahRumah = penghuni?._count?.rumah ?? 0;

              return (
                <div key={item.id} className="warga-grid-card">
                  <h3 className="warga-grid-title">
                    {item.blokRumah}
                    <span className="rt-badge">{item.rt.replace("_", " ")}</span>
                  </h3>
                  {penghuni ? (
                    <span className="meta-item warga-grid-penghuni">
                      {penghuni.namaUser}
                      {jumlahRumah > 1 ? ` · ${jumlahRumah} rumah` : ""}
                    </span>
                  ) : (
                    <span className="meta-item warga-grid-penghuni">Belum ada penghuni</span>
                  )}
                  <div className="warga-grid-footer">
                    <div className="table-actions">
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() => openEdit(item)}
                        aria-label="Edit rumah"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon danger"
                        onClick={() => handleDelete(item)}
                        aria-label="Hapus rumah"
                        title="Hapus"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <span className={`status-badge ${isDihuni ? "active" : "unactived"}`}>
                      {isDihuni ? "Dihuni" : "Kosong"}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>

        {isLoading && (
          <div className="table-loading">Memuat data rumah…</div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="table-empty">
            {items.length === 0
              ? "Belum ada data rumah. Klik \"+ Tambah Rumah\" untuk memulai."
              : "Tidak ada rumah yang sesuai filter."}
          </div>
        )}
      </div>

      {/* ── Modal ───────────────────────────────────────────────────── */}
      <RumahFormModal
        open={modalOpen}
        mode={modalMode}
        initialData={selected}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
