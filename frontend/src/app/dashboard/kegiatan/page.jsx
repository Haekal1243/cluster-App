"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { kegiatanApi } from "@/lib/api";
import { showConfirm, showMessage } from "@/lib/message";
import Switch from "@/components/ui/switch";
import FilterPopover, { FilterField } from "@/components/ui/FilterPopover";
import KegiatanFormModal from "@/components/kegiatan/KegiatanFormModal";

const CURRENT_USER = "Admin";
const PAGE_SIZE = 10;

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function KegiatanPage() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("SEMUA");
  const [page, setPage] = useState(1);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await kegiatanApi.getAll();
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

  useEffect(() => {
    setPage(1);
  }, [search, filterStatus]);

  const openCreateModal = () => {
    setModalMode("create");
    setSelected(null);
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setModalMode("edit");
    setSelected(item);
    setModalOpen(true);
  };

  const handleSubmit = async ({ judul, deskripsi, tanggalAcara, file }) => {
    try {
      if (modalMode === "edit" && selected) {
        await kegiatanApi.update(selected.id, {
          judul,
          deskripsi,
          tanggalAcara,
          file,
          updateBy: CURRENT_USER,
        });
        showMessage("Berhasil", "Kegiatan berhasil diperbarui.", "success");
      } else {
        await kegiatanApi.create({
          judul,
          deskripsi,
          tanggalAcara,
          file,
          createBy: CURRENT_USER,
        });
        showMessage("Berhasil", "Kegiatan berhasil ditambahkan.", "success");
      }
      setModalOpen(false);
      loadData();
    } catch (error) {
      showMessage("Gagal Menyimpan", error.message, "error");
    }
  };

  const handleToggleStatus = async (item, checked) => {
    const nextStatus = checked ? "active" : "unactived";
    setItems((prev) =>
      prev.map((row) =>
        row.id === item.id ? { ...row, status: nextStatus } : row,
      ),
    );

    try {
      await kegiatanApi.updateStatus(item.id, nextStatus, CURRENT_USER);
    } catch (error) {
      setItems((prev) =>
        prev.map((row) =>
          row.id === item.id ? { ...row, status: item.status } : row,
        ),
      );
      showMessage("Gagal Mengubah Status", error.message, "error");
    }
  };

  const handleDelete = async (item) => {
    const confirmed = await showConfirm(
      "Hapus Kegiatan?",
      `Kegiatan "${item.judul}" akan dihapus.`,
      "warning",
      "Ya, hapus",
      "Batal",
    );
    if (!confirmed) return;

    try {
      await kegiatanApi.remove(item.id);
      showMessage("Berhasil", "Kegiatan berhasil dihapus.", "success");
      loadData();
    } catch (error) {
      showMessage("Gagal Menghapus", error.message, "error");
    }
  };

  const sortedItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = items.filter((item) => {
      const matchStatus = filterStatus === "SEMUA" || item.status === filterStatus;
      const matchSearch =
        !query ||
        item.judul?.toLowerCase().includes(query) ||
        item.deskripsi?.toLowerCase().includes(query);
      return matchStatus && matchSearch;
    });

    return [...filtered].sort((a, b) => {
      if (a.status !== b.status) return a.status === "active" ? -1 : 1;
      return new Date(b.tanggalAcara) - new Date(a.tanggalAcara);
    });
  }, [items, search, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = sortedItems.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div className="page-stack">
      <div className="page-toolbar">
        <div>
          <h2>Kegiatan</h2>
          <p>Kelola data kegiatan warga cluster.</p>
        </div>
      </div>

      <div className="page-add-row">
        <button type="button" className="btn-primary" onClick={openCreateModal}>
          <Plus size={16} />
          Tambah Kegiatan
        </button>
      </div>

      <div className="list-toolbar-row">
        <div className="list-search-wrap">
          <Search size={15} className="list-search-icon" />
          <input
            type="text"
            placeholder="Cari judul atau deskripsi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="list-search-input"
          />
        </div>
        <FilterPopover active={filterStatus !== "SEMUA"}>
          <FilterField label="Status">
            <select
              className="ipl-select ipl-select-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="SEMUA">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="unactived">Nonaktif</option>
            </select>
          </FilterField>
        </FilterPopover>
      </div>

      <div className="table-card kegiatan-table-card">
        <div className="ipl-table-header">
          <span className="ipl-table-title">Daftar Kegiatan</span>
          <span className="ipl-table-count">{sortedItems.length} data</span>
        </div>

        <div className="table-wrapper kegiatan-table-wrapper">
          <table className="data-table kegiatan-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Judul</th>
                <th>Acara</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {!isLoading &&
                paginatedItems.map((item, index) => (
                  <tr key={item.id}>
                    <td>{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                    <td className="col-judul">{item.judul}</td>
                    <td>{formatDate(item.tanggalAcara)}</td>
                    <td>
                      <div className="status-cell">
                        <Switch
                          checked={item.status === "active"}
                          onCheckedChange={(checked) =>
                            handleToggleStatus(item, checked)
                          }
                          label={`Status ${item.judul}`}
                        />
                        <span className="status-cell-label">
                          {item.status === "active" ? "Aktif" : "Nonaktif"}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => openEditModal(item)}
                          aria-label="Edit"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon danger"
                          onClick={() => handleDelete(item)}
                          aria-label="Hapus"
                          title="Hapus"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="kegiatan-grid">
          {!isLoading &&
            paginatedItems.map((item) => (
              <div key={item.id} className="kegiatan-grid-card">
                <h3 className="kegiatan-grid-title">{item.judul}</h3>
                <span className="meta-item kegiatan-grid-date">
                  <Calendar size={11} /> {formatDate(item.tanggalAcara)}
                </span>
                <div className="kegiatan-grid-footer">
                  <div className="table-actions">
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => openEditModal(item)}
                      aria-label="Edit"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon danger"
                      onClick={() => handleDelete(item)}
                      aria-label="Hapus"
                      title="Hapus"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="status-cell">
                    <Switch
                      checked={item.status === "active"}
                      onCheckedChange={(checked) => handleToggleStatus(item, checked)}
                      label={`Status ${item.judul}`}
                    />
                    <span className="status-cell-label">
                      {item.status === "active" ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
        </div>

        {isLoading && <div className="table-loading">Memuat data...</div>}
        {!isLoading && sortedItems.length === 0 && (
          <div className="table-empty">
            {items.length === 0
              ? "Belum ada data kegiatan."
              : "Tidak ada kegiatan yang cocok dengan pencarian/filter."}
          </div>
        )}

        {!isLoading && totalPages > 1 && (
          <div className="list-pagination">
            <span className="list-pagination-info">
              Halaman {currentPage} dari {totalPages} · {sortedItems.length} data
            </span>
            <div className="list-pagination-actions">
              <button
                type="button"
                className="btn-ipl-secondary list-pagination-btn"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Halaman sebelumnya"
                title="Halaman sebelumnya"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                className="btn-ipl-secondary list-pagination-btn"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Halaman berikutnya"
                title="Halaman berikutnya"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <KegiatanFormModal
        open={modalOpen}
        mode={modalMode}
        initialData={selected}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
