"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { pengumumanApi } from "@/lib/api";
import { showConfirm, showMessage } from "@/lib/message";
import Switch from "@/components/ui/switch";
import PengumumanFormModal from "@/components/pengumuman/PengumumanFormModal";

const CURRENT_USER = "Admin";

export default function PengumumanPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selected, setSelected] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await pengumumanApi.getAll();
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

  const handleSubmit = async ({ judul, keteranganPengumuman, status, file }) => {
    try {
      if (modalMode === "edit" && selected) {
        await pengumumanApi.update(selected.id, {
          judul,
          keteranganPengumuman,
          status,
          file,
          updateBy: CURRENT_USER,
        });
        showMessage("Berhasil", "Pengumuman berhasil diperbarui.", "success");
      } else {
        await pengumumanApi.create({
          judul,
          keteranganPengumuman,
          status,
          file,
          createBy: CURRENT_USER,
        });
        showMessage("Berhasil", "Pengumuman berhasil ditambahkan.", "success");
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
      await pengumumanApi.updateStatus(item.id, nextStatus, CURRENT_USER);
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
      "Hapus Pengumuman?",
      `Pengumuman "${item.judul}" akan dihapus.`,
      "warning",
      "Ya, hapus",
      "Batal",
    );
    if (!confirmed) return;

    try {
      await pengumumanApi.remove(item.id);
      showMessage("Berhasil", "Pengumuman berhasil dihapus.", "success");
      loadData();
    } catch (error) {
      showMessage("Gagal Menghapus", error.message, "error");
    }
  };

  return (
    <div className="page-stack">
      <div className="page-toolbar">
        <div>
          <h2>Pengumuman</h2>
          <p>Kelola data pengumuman untuk warga cluster.</p>
        </div>
        <button type="button" className="btn-primary" onClick={openCreateModal}>
          <Plus size={16} />
          Tambah Pengumuman
        </button>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Judul</th>
              <th>Keterangan</th>
              <th>File</th>
              <th>Status</th>
              <th>Dibuat Oleh</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {!isLoading &&
              items.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td className="col-judul">{item.judul}</td>
                  <td className="col-keterangan">
                    {item.keteranganPengumuman || "-"}
                  </td>
                  <td>
                    {item.filePengumuman ? (
                      <a
                        href={pengumumanApi.fileUrl(item.filePengumuman)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Lihat File
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
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
                  <td>{item.createBy || "-"}</td>
                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() =>
                          router.push(`/dashboard/pengumuman/${item.id}`)
                        }
                        aria-label="Lihat detail"
                        title="Lihat detail"
                      >
                        <Eye size={16} />
                      </button>
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

        {isLoading && <div className="table-loading">Memuat data...</div>}
        {!isLoading && items.length === 0 && (
          <div className="table-empty">Belum ada data pengumuman.</div>
        )}
      </div>

      <PengumumanFormModal
        open={modalOpen}
        mode={modalMode}
        initialData={selected}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
