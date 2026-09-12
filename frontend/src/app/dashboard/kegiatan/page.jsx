"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { kegiatanApi } from "@/lib/api";
import { showConfirm, showMessage } from "@/lib/message";
import Switch from "@/components/ui/switch";
import KegiatanFormModal from "@/components/kegiatan/KegiatanFormModal";

const CURRENT_USER = "Admin";

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

  const handleSubmit = async ({ judul, deskripsi, tanggalAcara, status, file }) => {
    try {
      if (modalMode === "edit" && selected) {
        await kegiatanApi.update(selected.id, {
          judul,
          deskripsi,
          tanggalAcara,
          status,
          file,
          updateBy: CURRENT_USER,
        });
        showMessage("Berhasil", "Kegiatan berhasil diperbarui.", "success");
      } else {
        await kegiatanApi.create({
          judul,
          deskripsi,
          tanggalAcara,
          status,
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

  return (
    <div className="page-stack">
      <div className="page-toolbar">
        <div>
          <h2>Kegiatan</h2>
          <p>Kelola data kegiatan warga cluster.</p>
        </div>
        <button type="button" className="btn-primary" onClick={openCreateModal}>
          <Plus size={16} />
          Tambah Kegiatan
        </button>
      </div>

      <div className="table-card">
        <table className="data-table">
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
              items.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
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
                        {item.status === "active" ? "Active" : "Unactived"}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() => openEditModal(item)}
                        aria-label="Update"
                        title="Update"
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

        {isLoading && <div className="table-loading">Memuat data...</div>}
        {!isLoading && items.length === 0 && (
          <div className="table-empty">Belum ada data kegiatan.</div>
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
