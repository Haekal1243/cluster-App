"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import { areaLabel, can } from "@/lib/session";
import { useUser } from "@/lib/useUser";
import { showConfirm, showMessage } from "@/lib/message";
import {
  PENGAJUAN,
  bolehAjukan,
  bolehPutuskan,
  bolehTulis,
  formatTanggalPendek,
} from "@/lib/publikasi";
import Switch from "@/components/ui/switch";
import FilterPopover, { FilterField } from "@/components/ui/FilterPopover";
import KeputusanPengajuanModal from "./KeputusanPengajuanModal";

const PAGE_SIZE = 10;

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/**
 * Halaman kelola kegiatan / pengumuman. Keduanya berbagi alur yang sama:
 * milik RT pembuatnya, diajukan sekre RT ke RW, di-ACC ketua/sekre RW.
 * Tombol yang tampil mengikuti permission user (dari tabel role-permission).
 */
export default function PublikasiManager({
  menu, // "kegiatan" | "pengumuman"
  title,
  subtitle,
  noun,
  addLabel,
  searchPlaceholder,
  api,
  FormModal,
  dateField,
  dateLabel,
  searchFields,
}) {
  const { user, ready } = useUser();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: "create", item: null });
  const [keputusan, setKeputusan] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("SEMUA");
  const [filterPengajuan, setFilterPengajuan] = useState("SEMUA");
  const [filterArea, setFilterArea] = useState("SEMUA");
  const [draft, setDraft] = useState({ status: "SEMUA", pengajuan: "SEMUA", area: "SEMUA" });
  const [page, setPage] = useState(1);

  const bolehTambah = can(user, `${menu}.create`);
  const bolehApprove = can(user, `${menu}.approve`);
  const bolehUbahStatus = (item) => bolehTulis(user, `${menu}.update`, item);
  const lihatSemuaWilayah = user?.permissions?.[`${menu}.read`] === "ALL";

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAll();
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      showMessage("Gagal Memuat Data", error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (ready && user) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user?.id]);

  useEffect(() => {
    setPage(1);
  }, [search, filterStatus, filterPengajuan, filterArea]);

  const handleSubmit = async ({ file, ...fields }) => {
    try {
      // Kolom yang tidak boleh diubah pengurus tanpa hak ACC ikut terkirim kosong; backend mengabaikannya.
      const payload = { ...fields, file };
      if (modal.mode === "edit" && modal.item) {
        await api.update(modal.item.id, payload);
        showMessage("Berhasil", `${noun} berhasil diperbarui.`, "success");
      } else {
        await api.create(payload);
        showMessage("Berhasil", `${noun} berhasil ditambahkan.`, "success");
      }
      setModal({ open: false, mode: "create", item: null });
      loadData();
    } catch (error) {
      showMessage("Gagal Menyimpan", error.message, "error");
    }
  };

  const handleToggleStatus = async (item, checked) => {
    const nextStatus = checked ? "active" : "unactived";
    setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, status: nextStatus } : row)));
    try {
      await api.updateStatus(item.id, nextStatus);
    } catch (error) {
      setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, status: item.status } : row)));
      showMessage("Gagal Mengubah Status", error.message, "error");
    }
  };

  const handleDelete = async (item) => {
    const confirmed = await showConfirm(
      `Hapus ${noun}?`,
      `${noun} "${item.judul}" akan dihapus.`,
      "warning",
      "Ya, hapus",
      "Batal",
    );
    if (!confirmed) return;
    try {
      await api.remove(item.id);
      showMessage("Berhasil", `${noun} berhasil dihapus.`, "success");
      loadData();
    } catch (error) {
      showMessage("Gagal Menghapus", error.message, "error");
    }
  };

  const handleAjukan = async (item) => {
    const confirmed = await showConfirm(
      "Ajukan ke RW?",
      `${noun} "${item.judul}" akan diajukan agar tampil ke seluruh warga. Ketua/sekre RW yang memutuskan.`,
      "question",
      "Ya, ajukan",
      "Batal",
    );
    if (!confirmed) return;
    try {
      const res = await api.ajukan(item.id);
      showMessage("Berhasil", res.message, "success");
      loadData();
    } catch (error) {
      showMessage("Gagal Mengajukan", error.message, "error");
    }
  };

  const handleKeputusan = async (payload) => {
    try {
      const res = await api.putuskanPengajuan(keputusan.id, payload);
      showMessage("Berhasil", res.message, "success");
      setKeputusan(null);
      loadData();
    } catch (error) {
      showMessage("Gagal Menyimpan Keputusan", error.message, "error");
    }
  };

  const menungguCount = items.filter((i) => i.statusPengajuan === "DIAJUKAN").length;

  const sortedItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = items.filter((item) => {
      const matchStatus = filterStatus === "SEMUA" || item.status === filterStatus;
      const matchPengajuan = filterPengajuan === "SEMUA" || item.statusPengajuan === filterPengajuan;
      const matchArea = filterArea === "SEMUA" || item.area === filterArea;
      const matchSearch = !query || searchFields.some((f) => String(item[f] ?? "").toLowerCase().includes(query));
      return matchStatus && matchPengajuan && matchArea && matchSearch;
    });

    return [...filtered].sort((a, b) => {
      // Pengajuan yang perlu diputuskan RW paling atas
      if (bolehApprove && (a.statusPengajuan === "DIAJUKAN") !== (b.statusPengajuan === "DIAJUKAN")) {
        return a.statusPengajuan === "DIAJUKAN" ? -1 : 1;
      }
      if (a.status !== b.status) return a.status === "active" ? -1 : 1;
      return new Date(b[dateField]) - new Date(a[dateField]);
    });
  }, [items, search, filterStatus, filterPengajuan, filterArea, dateField, searchFields, bolehApprove]);

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = sortedItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const filterAktif = filterStatus !== "SEMUA" || filterPengajuan !== "SEMUA" || filterArea !== "SEMUA";

  if (!ready || !user) return null;

  const renderPengajuan = (item) => {
    const p = PENGAJUAN[item.statusPengajuan] ?? PENGAJUAN.TIDAK;
    return (
      <div className="pengajuan-cell">
        <span className={`ipl-badge badge-${p.cls}`} title={item.alasanTolak || undefined}>
          {item.area === "RW" ? "Level RW" : p.label}
        </span>
        {item.statusPengajuan === "DITOLAK" && item.alasanTolak && (
          <span className="pengajuan-alasan">{item.alasanTolak}</span>
        )}
        {item.tampilSampai && (
          <span className="pengajuan-alasan">Tampil s/d {formatTanggalPendek(item.tampilSampai)}</span>
        )}
        {item.tampilDiLanding && <span className="pengajuan-alasan">Portofolio landing</span>}
      </div>
    );
  };

  const renderActions = (item, size) => (
    <div className="table-actions">
      {bolehPutuskan(user, menu, item) && (
        <button type="button" className="btn-ipl-review" onClick={() => setKeputusan(item)} title="Putuskan pengajuan">
          <Check size={14} /> Putuskan
        </button>
      )}
      {bolehAjukan(user, menu, item) && (
        <button type="button" className="btn-icon" onClick={() => handleAjukan(item)} aria-label="Ajukan ke RW" title="Ajukan ke RW">
          <Send size={size} />
        </button>
      )}
      {bolehTulis(user, `${menu}.update`, item) && (
        <button type="button" className="btn-icon" onClick={() => setModal({ open: true, mode: "edit", item })} aria-label="Ubah" title="Ubah">
          <Pencil size={size} />
        </button>
      )}
      {bolehTulis(user, `${menu}.delete`, item) && (
        <button type="button" className="btn-icon danger" onClick={() => handleDelete(item)} aria-label="Hapus" title="Hapus">
          <Trash2 size={size} />
        </button>
      )}
    </div>
  );

  const renderStatus = (item) => (
    <div className="status-cell">
      <Switch
        checked={item.status === "active"}
        disabled={!bolehUbahStatus(item)}
        onCheckedChange={(checked) => handleToggleStatus(item, checked)}
        label={`Status ${item.judul}`}
      />
      <span className="status-cell-label">{item.status === "active" ? "Aktif" : "Nonaktif"}</span>
    </div>
  );

  return (
    <div className="page-stack">
      <div className="page-toolbar">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>

      {bolehApprove && menungguCount > 0 && (
        <div className="pengajuan-banner">
          <Send size={16} />
          <span>
            <strong>{menungguCount}</strong> pengajuan dari RT menunggu keputusan RW.
          </span>
          <button
            type="button"
            className="btn-outline-neutral"
            onClick={() => {
              setFilterPengajuan("DIAJUKAN");
              setDraft((d) => ({ ...d, pengajuan: "DIAJUKAN" }));
            }}
          >
            Tampilkan
          </button>
        </div>
      )}

      <div className="page-toolbar-row">
        {bolehTambah && (
          <button type="button" className="btn-primary" onClick={() => setModal({ open: true, mode: "create", item: null })}>
            <Plus size={16} />
            {addLabel}
          </button>
        )}

        <div className="list-toolbar-row">
          <div className="list-search-wrap">
            <Search size={15} className="list-search-icon" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="list-search-input"
            />
          </div>
          <FilterPopover
            active={filterAktif}
            onOpen={() => setDraft({ status: filterStatus, pengajuan: filterPengajuan, area: filterArea })}
            onApply={() => {
              setFilterStatus(draft.status);
              setFilterPengajuan(draft.pengajuan);
              setFilterArea(draft.area);
            }}
            onReset={() => {
              setFilterStatus("SEMUA");
              setFilterPengajuan("SEMUA");
              setFilterArea("SEMUA");
              setDraft({ status: "SEMUA", pengajuan: "SEMUA", area: "SEMUA" });
            }}
          >
            <FilterField label="Status">
              <select className="ipl-select ipl-select-sm" value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}>
                <option value="SEMUA">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="unactived">Nonaktif</option>
              </select>
            </FilterField>
            <FilterField label="Pengajuan ke RW">
              <select className="ipl-select ipl-select-sm" value={draft.pengajuan} onChange={(e) => setDraft((d) => ({ ...d, pengajuan: e.target.value }))}>
                <option value="SEMUA">Semua</option>
                {Object.entries(PENGAJUAN).map(([val, p]) => (
                  <option key={val} value={val}>{p.label}</option>
                ))}
              </select>
            </FilterField>
            {lihatSemuaWilayah && (
              <FilterField label="Wilayah">
                <select className="ipl-select ipl-select-sm" value={draft.area} onChange={(e) => setDraft((d) => ({ ...d, area: e.target.value }))}>
                  <option value="SEMUA">Semua Wilayah</option>
                  {["RW", "RT_01", "RT_02", "RT_03", "RT_04"].map((a) => (
                    <option key={a} value={a}>{areaLabel(a)}</option>
                  ))}
                </select>
              </FilterField>
            )}
          </FilterPopover>
        </div>
      </div>

      <div className="table-card pengumuman-table-card">
        <div className="ipl-table-header">
          <span className="ipl-table-title">Daftar {noun}</span>
          <span className="ipl-table-count">{sortedItems.length} data</span>
        </div>

        <div className="table-wrapper pengumuman-table-wrapper">
          <table className="data-table pengumuman-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Judul</th>
                <th>{dateLabel}</th>
                <th>Wilayah</th>
                <th>Tampil ke Semua Warga</th>
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
                    <td>{formatDate(item[dateField])}</td>
                    <td><span className="rt-badge">{areaLabel(item.area)}</span></td>
                    <td>{renderPengajuan(item)}</td>
                    <td>{renderStatus(item)}</td>
                    <td>{renderActions(item, 16)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="pengumuman-grid">
          {!isLoading &&
            paginatedItems.map((item) => (
              <div key={item.id} className="pengumuman-grid-card">
                <h3 className="pengumuman-grid-title">
                  {item.judul} <span className="rt-badge">{areaLabel(item.area)}</span>
                </h3>
                <span className="meta-item pengumuman-grid-date">
                  <Calendar size={11} /> {formatDate(item[dateField])}
                </span>
                {renderPengajuan(item)}
                <div className="pengumuman-grid-footer">
                  {renderActions(item, 14)}
                  {renderStatus(item)}
                </div>
              </div>
            ))}
        </div>

        {isLoading && <div className="table-loading">Memuat data...</div>}
        {!isLoading && sortedItems.length === 0 && (
          <div className="table-empty">
            {items.length === 0 ? `Belum ada data ${noun.toLowerCase()}.` : `Tidak ada ${noun.toLowerCase()} yang cocok dengan pencarian/filter.`}
          </div>
        )}

        {!isLoading && totalPages > 1 && (
          <div className="list-pagination">
            <span className="list-pagination-info">
              Halaman {currentPage} dari {totalPages} · {sortedItems.length} data
            </span>
            <div className="list-pagination-actions">
              <button type="button" className="btn-ipl-secondary list-pagination-btn" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label="Halaman sebelumnya" title="Halaman sebelumnya">
                <ChevronLeft size={16} />
              </button>
              <button type="button" className="btn-ipl-secondary list-pagination-btn" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} aria-label="Halaman berikutnya" title="Halaman berikutnya">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <FormModal
        open={modal.open}
        mode={modal.mode}
        initialData={modal.item}
        canApprove={bolehApprove}
        onClose={() => setModal({ open: false, mode: "create", item: null })}
        onSubmit={handleSubmit}
      />
      <KeputusanPengajuanModal
        open={!!keputusan}
        item={keputusan}
        noun={noun.toLowerCase()}
        onClose={() => setKeputusan(null)}
        onSubmit={handleKeputusan}
      />
    </div>
  );
}
