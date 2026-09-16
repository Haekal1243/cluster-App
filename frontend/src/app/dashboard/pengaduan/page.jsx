"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus, Eye, MessageSquareWarning, Megaphone, Calendar, Search,
} from "lucide-react";
import { pengaduanApi } from "@/lib/api";
import { showMessage } from "@/lib/message";
import FilterPopover, { FilterField } from "@/components/ui/FilterPopover";
import PengaduanFormModal from "@/components/pengaduan/PengaduanFormModal";
import PengaduanDetailModal from "@/components/pengaduan/PengaduanDetailModal";
import PengaduanRespondModal from "@/components/pengaduan/PengaduanRespondModal";

const KATEGORI_LABELS = {
  KEBERSIHAN: "Kebersihan",
  KEAMANAN: "Keamanan",
  INFRASTRUKTUR: "Infrastruktur",
  LAINNYA: "Lainnya",
};

const STATUS_LABELS = {
  MENUNGGU: { label: "Menunggu", cls: "status-menunggu" },
  DIPROSES: { label: "Diproses", cls: "status-diproses" },
  SELESAI: { label: "Selesai", cls: "status-selesai" },
  DITOLAK: { label: "Ditolak", cls: "status-ditolak" },
};

// Urutan prioritas: yang masih perlu ditindaklanjuti (Menunggu/Diproses) duluan,
// baru Selesai, lalu Ditolak. Di dalam grup yang sama, diurutkan tanggal terbaru dulu.
const STATUS_PRIORITY = {
  MENUNGGU: 0,
  DIPROSES: 0,
  SELESAI: 1,
  DITOLAK: 2,
};

const BULAN_NAMES = {
  "01": "Januari", "02": "Februari", "03": "Maret", "04": "April",
  "05": "Mei", "06": "Juni", "07": "Juli", "08": "Agustus",
  "09": "September", "10": "Oktober", "11": "November", "12": "Desember",
};
const BULAN_OPTIONS = Object.entries(BULAN_NAMES).map(([val, label]) => ({ val, label }));

function StatusBadge({ status }) {
  const s = STATUS_LABELS[status] || STATUS_LABELS.MENUNGGU;
  return <span className={`ipl-status-badge ${s.cls}`}>{s.label}</span>;
}

function canRespond(item) {
  return item.status === "MENUNGGU" || item.status === "DIPROSES";
}

function PengaduanActionButton({ item, onAction }) {
  return canRespond(item) ? (
    <button
      type="button"
      className="btn-ipl-review"
      onClick={() => onAction(item)}
      title="Tanggapi pengaduan"
    >
      <MessageSquareWarning size={14} /> Tanggapi
    </button>
  ) : (
    <button
      type="button"
      className="btn-ipl-view"
      onClick={() => onAction(item)}
      title="Lihat detail"
    >
      <Eye size={14} /> Lihat
    </button>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ── Admin/Pengurus: lihat & tanggapi semua pengaduan ──────────────────────────
function AdminPengaduanView({ user }) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [respondItem, setRespondItem] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [filterKategori, setFilterKategori] = useState("SEMUA");
  const [filterStatus, setFilterStatus] = useState("SEMUA");
  const [filterBulan, setFilterBulan] = useState("SEMUA");
  const [filterTahun, setFilterTahun] = useState("SEMUA");
  const [draftFilterKategori, setDraftFilterKategori] = useState("SEMUA");
  const [draftFilterStatus, setDraftFilterStatus] = useState("SEMUA");
  const [draftFilterBulan, setDraftFilterBulan] = useState("SEMUA");
  const [draftFilterTahun, setDraftFilterTahun] = useState("SEMUA");
  const [search, setSearch] = useState("");

  const handleFilterOpen = () => {
    setDraftFilterKategori(filterKategori);
    setDraftFilterStatus(filterStatus);
    setDraftFilterBulan(filterBulan);
    setDraftFilterTahun(filterTahun);
  };
  const handleFilterApply = () => {
    setFilterKategori(draftFilterKategori);
    setFilterStatus(draftFilterStatus);
    setFilterBulan(draftFilterBulan);
    setFilterTahun(draftFilterTahun);
  };
  const handleFilterReset = () => {
    setFilterKategori("SEMUA");
    setFilterStatus("SEMUA");
    setFilterBulan("SEMUA");
    setFilterTahun("SEMUA");
    setDraftFilterKategori("SEMUA");
    setDraftFilterStatus("SEMUA");
    setDraftFilterBulan("SEMUA");
    setDraftFilterTahun("SEMUA");
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await pengaduanApi.getAll();
      setItems(data || []);
    } catch (err) {
      showMessage("Gagal Memuat Data", err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const currentUserName = user?.nama || user?.name || "Admin";

  const handlePengaduanAction = (item) => {
    if (canRespond(item)) {
      setRespondItem(item);
    } else {
      setDetailItem(item);
    }
  };

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = items.filter((item) => {
      const matchKategori = filterKategori === "SEMUA" || item.kategori === filterKategori;
      const matchStatus = filterStatus === "SEMUA" || item.status === filterStatus;
      const tanggal = item.createdAt ? new Date(item.createdAt) : null;
      const matchBulan =
        filterBulan === "SEMUA" ||
        (tanggal && String(tanggal.getMonth() + 1).padStart(2, "0") === filterBulan);
      const matchTahun =
        filterTahun === "SEMUA" || (tanggal && String(tanggal.getFullYear()) === filterTahun);
      const matchSearch =
        !query ||
        item.judul?.toLowerCase().includes(query) ||
        item.pelapor?.namaUser?.toLowerCase().includes(query) ||
        item.deskripsi?.toLowerCase().includes(query);
      return matchKategori && matchStatus && matchBulan && matchTahun && matchSearch;
    });

    return [...filtered].sort((a, b) => {
      const prioA = STATUS_PRIORITY[a.status] ?? 99;
      const prioB = STATUS_PRIORITY[b.status] ?? 99;
      if (prioA !== prioB) return prioA - prioB;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [items, filterKategori, filterStatus, filterBulan, filterTahun, search]);

  // Opsi Bulan & Tahun di filter cuma nampilin yang beneran ada datanya
  const availableTahun = useMemo(() => {
    const years = new Set(
      items.filter((i) => i.createdAt).map((i) => String(new Date(i.createdAt).getFullYear()))
    );
    return Array.from(years).sort((a, b) => b - a);
  }, [items]);

  const availableBulan = useMemo(() => {
    const months = new Set(
      items
        .filter((i) => i.createdAt)
        .map((i) => String(new Date(i.createdAt).getMonth() + 1).padStart(2, "0"))
    );
    return BULAN_OPTIONS.filter(({ val }) => months.has(val));
  }, [items]);

  return (
    <div className="page-stack">
      <div className="ipl-page-header">
        <div>
          <h2 className="ipl-page-title">Pengaduan Lingkungan</h2>
          <p className="ipl-page-subtitle">
            Tinjau dan tanggapi laporan kendala dari warga cluster
          </p>
        </div>
      </div>

      <div className="list-toolbar-row">
        <div className="list-search-wrap">
          <Search size={15} className="list-search-icon" />
          <input
            type="text"
            placeholder="Cari judul, pelapor, atau deskripsi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="list-search-input"
          />
        </div>

        <FilterPopover
          active={
            filterBulan !== "SEMUA" ||
            filterTahun !== "SEMUA" ||
            filterKategori !== "SEMUA" ||
            filterStatus !== "SEMUA"
          }
          onOpen={handleFilterOpen}
          onApply={handleFilterApply}
          onReset={handleFilterReset}
        >
          <FilterField label="Bulan">
            <select
              className="ipl-select ipl-select-sm"
              value={draftFilterBulan}
              onChange={(e) => setDraftFilterBulan(e.target.value)}
            >
              <option value="SEMUA">Semua Bulan</option>
              {availableBulan.map(({ val, label }) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Tahun">
            <select
              className="ipl-select ipl-select-sm"
              value={draftFilterTahun}
              onChange={(e) => setDraftFilterTahun(e.target.value)}
            >
              <option value="SEMUA">Semua Tahun</option>
              {availableTahun.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Kategori">
            <select
              className="ipl-select ipl-select-sm"
              value={draftFilterKategori}
              onChange={(e) => setDraftFilterKategori(e.target.value)}
            >
              <option value="SEMUA">Semua Kategori</option>
              {Object.entries(KATEGORI_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Status">
            <select
              className="ipl-select ipl-select-sm"
              value={draftFilterStatus}
              onChange={(e) => setDraftFilterStatus(e.target.value)}
            >
              <option value="SEMUA">Semua Status</option>
              {Object.entries(STATUS_LABELS).map(([value, { label }]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </FilterField>
        </FilterPopover>
      </div>

      <div className="content-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="ipl-table-header">
          <span className="ipl-table-title">Daftar Pengaduan</span>
          <span className="ipl-table-count">{filteredItems.length} data</span>
        </div>

        {isLoading ? (
          <div className="ipl-loading">
            <div className="ipl-spinner" />
            <span>Memuat data pengaduan...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="ipl-empty">
            <MessageSquareWarning size={40} strokeWidth={1.2} />
            <p>{items.length === 0 ? "Belum ada pengaduan masuk." : "Tidak ada pengaduan yang cocok dengan filter."}</p>
          </div>
        ) : (
          <>
          <div className="ipl-table-wrapper pengaduan-table-wrapper">
            <table className="ipl-table pengaduan-table">
              <thead>
                <tr>
                  <th>Judul</th>
                  <th>Pelapor</th>
                  <th>Kategori</th>
                  <th>Tanggal</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td data-label="Judul">{item.judul}</td>
                    <td data-label="Pelapor">{item.pelapor?.namaUser || "—"}</td>
                    <td data-label="Kategori">{KATEGORI_LABELS[item.kategori] || item.kategori}</td>
                    <td data-label="Tanggal">{formatDate(item.createdAt)}</td>
                    <td data-label="Status"><StatusBadge status={item.status} /></td>
                    <td data-label="Aksi">
                      <PengaduanActionButton item={item} onAction={handlePengaduanAction} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pengaduan-grid">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="pengaduan-grid-card"
                role="button"
                tabIndex={0}
                onClick={() => handlePengaduanAction(item)}
                onKeyDown={(e) => { if (e.key === "Enter") handlePengaduanAction(item); }}
              >
                <h3 className="pengaduan-grid-title">{item.judul}</h3>
                <div className="pengaduan-grid-meta">
                  <span>{KATEGORI_LABELS[item.kategori] || item.kategori}</span>
                  <span className="meta-item"><Calendar size={11} /> {formatDate(item.createdAt)}</span>
                </div>
                <div className="pengaduan-grid-footer">
                  <StatusBadge status={item.status} />
                  <PengaduanActionButton item={item} onAction={handlePengaduanAction} />
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </div>

      {respondItem && (
        <PengaduanRespondModal
          pengaduan={respondItem}
          currentUserName={currentUserName}
          onClose={() => setRespondItem(null)}
          onSuccess={loadData}
        />
      )}
      {detailItem && (
        <PengaduanDetailModal pengaduan={detailItem} onClose={() => setDetailItem(null)} />
      )}
    </div>
  );
}

// ── Warga: ajukan & pantau pengaduan sendiri ──────────────────────────────────
function WargaPengaduanView({ user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [search, setSearch] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await pengaduanApi.getByUser(user.id);
      setItems(data || []);
    } catch (err) {
      showMessage("Gagal Memuat Data", err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter(
      (item) =>
        item.judul?.toLowerCase().includes(query) ||
        item.deskripsi?.toLowerCase().includes(query)
    );
  }, [items, search]);

  return (
    <div className="page-stack">
      <section className="portal-welcome-banner">
        <div className="portal-welcome-text">
          <h2>Pengaduan Lingkungan</h2>
          <p>Laporkan kendala di lingkungan cluster dan pantau tindak lanjutnya</p>
        </div>
        <div className="portal-welcome-decoration" aria-hidden />
      </section>

      <section className="content-card">
        <div className="db-section-header">
          <MessageSquareWarning size={17} />
          <h3>Pengaduan Saya</h3>
        </div>

        <div className="page-add-row" style={{ marginBottom: 16 }}>
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={() => setShowForm(true)}
          >
            <Plus size={14} /> Ajukan Pengaduan
          </button>
        </div>

        {items.length > 0 && (
          <div className="list-search-wrap" style={{ marginBottom: 16 }}>
            <Search size={15} className="list-search-icon" />
            <input
              type="text"
              placeholder="Cari judul atau deskripsi pengaduan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="list-search-input"
            />
          </div>
        )}

        {loading ? (
          <div className="portal-loading-inline">
            <div className="portal-spinner-sm" />
            <span>Memuat data...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="portal-empty-notice">
            <Megaphone size={32} />
            <p><strong>Belum ada pengaduan</strong></p>
            <p>Klik "Ajukan Pengaduan" kalau ada kendala di lingkungan cluster.</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="portal-empty-notice">
            <Megaphone size={32} />
            <p><strong>Tidak ditemukan</strong></p>
            <p>Tidak ada pengaduan yang cocok dengan pencarian.</p>
          </div>
        ) : (
          <div className="portal-card-list">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="portal-info-card"
                role="button"
                tabIndex={0}
                onClick={() => setDetailItem(item)}
                onKeyDown={(e) => { if (e.key === "Enter") setDetailItem(item); }}
              >
                <div className="portal-info-card-icon">
                  <MessageSquareWarning size={18} />
                </div>
                <div className="portal-info-card-body">
                  <h3 className="portal-info-card-title">{item.judul}</h3>
                  <p className="portal-info-card-desc">{item.deskripsi}</p>
                  <div className="portal-info-card-meta">
                    <span className="meta-item"><Calendar size={12} /> {formatDate(item.createdAt)}</span>
                    <span>{KATEGORI_LABELS[item.kategori] || item.kategori}</span>
                    <StatusBadge status={item.status} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {showForm && (
        <PengaduanFormModal onClose={() => setShowForm(false)} onSuccess={loadData} />
      )}
      {detailItem && (
        <PengaduanDetailModal pengaduan={detailItem} onClose={() => setDetailItem(null)} />
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PengaduanPage() {
  const [user, setUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      setUser(raw ? JSON.parse(raw) : null);
    } catch {
      setUser(null);
    } finally {
      setIsCheckingAuth(false);
    }
  }, []);

  if (isCheckingAuth) return null;

  return user?.role === "WARGA"
    ? <WargaPengaduanView user={user} />
    : <AdminPengaduanView user={user} />;
}
