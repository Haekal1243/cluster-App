"use client";

import { useEffect, useState } from "react";
import { Check, X as XIcon } from "lucide-react";
import Swal from "sweetalert2";
import { wargaApi } from "@/lib/api";
import { areaLabel, can } from "@/lib/session";
import { useUser } from "@/lib/useUser";
import { showConfirm, showMessage } from "@/lib/message";
import Pagination from "@/components/ui/Pagination";
import { usePagination } from "@/lib/usePagination";

const STATUS = {
  MENUNGGU: { label: "Menunggu", cls: "kontrak" },
  DISETUJUI: { label: "Disetujui", cls: "active" },
  DITOLAK: { label: "Ditolak", cls: "unactived" },
};

const tgl = (d) => new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

/** RW (approve_hapus) memutuskan; sekre RT (ajukan_hapus) hanya memantau pengajuannya. */
export default function PengajuanHapusPage() {
  const { user } = useUser();
  const bolehApprove = can(user, "warga.approve_hapus");
  const bolehLihat = bolehApprove || can(user, "warga.ajukan_hapus");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await wargaApi.getPengajuanHapus("SEMUA");
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      showMessage("Gagal Memuat Data", error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bolehLihat) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bolehLihat]);

  const setujui = async (p) => {
    const ok = await showConfirm(
      `Setujui hapus akun ${p.namaUser}?`,
      "Akun akan dihapus permanen dan rumah atas namanya menjadi kosong.",
      "warning",
      "Ya, hapus akun",
      "Batal",
    );
    if (!ok) return;
    try {
      const res = await wargaApi.setujuiHapus(p.id);
      showMessage("Berhasil", res.message, "success");
      load();
    } catch (error) {
      showMessage("Gagal", error.message, "error");
    }
  };

  const tolak = async (p) => {
    const { value: alasan } = await Swal.fire({
      title: `Tolak pengajuan hapus ${p.namaUser}?`,
      input: "textarea",
      inputLabel: "Alasan penolakan",
      showCancelButton: true,
      confirmButtonText: "Tolak",
      cancelButtonText: "Batal",
      inputValidator: (v) => (!v?.trim() ? "Alasan wajib diisi" : undefined),
    });
    if (!alasan) return;
    try {
      const res = await wargaApi.tolakHapus(p.id, alasan.trim());
      showMessage("Berhasil", res.message, "success");
      load();
    } catch (error) {
      showMessage("Gagal", error.message, "error");
    }
  };

  const { page, totalPages, paginatedItems, prev, next } = usePagination(items, []);

  if (!bolehLihat) {
    return <div className="table-empty">Anda tidak memiliki akses ke pengajuan hapus akun.</div>;
  }

  const aksi = (p) =>
    bolehApprove && p.status === "MENUNGGU" ? (
      <div className="table-actions">
        <button type="button" className="btn-icon" title="Setujui" aria-label="Setujui hapus akun" onClick={() => setujui(p)}>
          <Check size={15} />
        </button>
        <button type="button" className="btn-icon danger" title="Tolak" aria-label="Tolak pengajuan" onClick={() => tolak(p)}>
          <XIcon size={15} />
        </button>
      </div>
    ) : null;

  return (
    <div className="table-card">
      <div className="ipl-table-header">
        <span className="ipl-table-title">Pengajuan Hapus Akun Warga</span>
        <span className="ipl-table-count">{items.length} data</span>
      </div>
      <div className="table-wrapper warga-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Warga</th>
              <th>Alasan</th>
              <th>Diajukan</th>
              <th>Status</th>
              {bolehApprove && <th>Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {!loading &&
              paginatedItems.map((p, i) => (
                <tr key={p.id}>
                  <td>{(page - 1) * 10 + i + 1}</td>
                  <td>
                    <span className="penghuni-name">{p.namaUser}</span>
                    <span className="penghuni-email">{areaLabel(p.rt)}</span>
                  </td>
                  <td>{p.alasan}</td>
                  <td>
                    {p.diajukanOleh}
                    <span className="penghuni-email">{tgl(p.createdAt)}</span>
                  </td>
                  <td>
                    <span className={`rumah-chip ${STATUS[p.status]?.cls}`}>{STATUS[p.status]?.label}</span>
                    {p.status === "DITOLAK" && p.alasanTolak && <span className="penghuni-email">{p.alasanTolak}</span>}
                  </td>
                  {bolehApprove && <td>{aksi(p)}</td>}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="warga-grid">
        {!loading &&
          paginatedItems.map((p) => (
            <div key={p.id} className="warga-grid-card">
              <h3 className="warga-grid-title">{p.namaUser}</h3>
              <span className="warga-grid-penghuni">{areaLabel(p.rt)} · {STATUS[p.status]?.label}</span>
              <p style={{ fontSize: "0.82rem", margin: "4px 0" }}>{p.alasan}</p>
              <span className="text-muted" style={{ fontSize: "0.72rem" }}>
                {p.diajukanOleh} · {tgl(p.createdAt)}
              </span>
              {bolehApprove && p.status === "MENUNGGU" && (
                <div className="warga-grid-footer">{aksi(p)}</div>
              )}
            </div>
          ))}
      </div>

      {loading && <div className="table-loading">Memuat pengajuan…</div>}
      {!loading && items.length === 0 && <div className="table-empty">Belum ada pengajuan hapus akun.</div>}
      {!loading && <Pagination page={page} totalPages={totalPages} total={items.length} onPrev={prev} onNext={next} />}
    </div>
  );
}
