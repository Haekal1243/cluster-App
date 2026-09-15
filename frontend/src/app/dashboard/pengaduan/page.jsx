"use client";

import { useEffect, useState } from "react";
import {
  Plus, Eye, MessageSquareWarning, Megaphone, Calendar,
} from "lucide-react";
import { pengaduanApi } from "@/lib/api";
import { showMessage } from "@/lib/message";
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

function StatusBadge({ status }) {
  const s = STATUS_LABELS[status] || STATUS_LABELS.MENUNGGU;
  return <span className={`ipl-status-badge ${s.cls}`}>{s.label}</span>;
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

      <div className="content-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="ipl-table-header">
          <span className="ipl-table-title">Daftar Pengaduan</span>
          <span className="ipl-table-count">{items.length} data</span>
        </div>

        {isLoading ? (
          <div className="ipl-loading">
            <div className="ipl-spinner" />
            <span>Memuat data pengaduan...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="ipl-empty">
            <MessageSquareWarning size={40} strokeWidth={1.2} />
            <p>Belum ada pengaduan masuk.</p>
          </div>
        ) : (
          <div className="ipl-table-wrapper">
            <table className="ipl-table">
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
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.judul}</td>
                    <td>{item.pelapor?.namaUser || "—"}</td>
                    <td>{KATEGORI_LABELS[item.kategori] || item.kategori}</td>
                    <td>{formatDate(item.createdAt)}</td>
                    <td><StatusBadge status={item.status} /></td>
                    <td>
                      {item.status === "MENUNGGU" || item.status === "DIPROSES" ? (
                        <button
                          className="btn-ipl-review"
                          onClick={() => setRespondItem(item)}
                          title="Tanggapi pengaduan"
                        >
                          <MessageSquareWarning size={14} /> Tanggapi
                        </button>
                      ) : (
                        <button
                          className="btn-ipl-view"
                          onClick={() => setDetailItem(item)}
                          title="Lihat detail"
                        >
                          <Eye size={14} /> Lihat
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
          <button
            type="button"
            className="btn-primary btn-sm"
            style={{ marginLeft: "auto" }}
            onClick={() => setShowForm(true)}
          >
            <Plus size={14} /> Ajukan Pengaduan
          </button>
        </div>

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
        ) : (
          <div className="portal-card-list">
            {items.map((item) => (
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
