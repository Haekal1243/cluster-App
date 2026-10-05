"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { History, Search } from "lucide-react";
import { auditApi } from "@/lib/api";
import { showMessage } from "@/lib/message";
import FilterPopover, { FilterField } from "@/components/ui/FilterPopover";
import Pagination from "@/components/ui/Pagination";
import { usePagination } from "@/lib/usePagination";
import { getCurrentYm } from "@/lib/format";

const AKSI_LABEL = {
  "rumah.ubah_status": "Ubah status rumah",
  "ipl.generate": "Generate tagihan",
  "ipl.koreksi": "Koreksi nominal",
  "ipl.konfirmasi": "Konfirmasi pembayaran",
  "setoran.buat": "Buat setoran",
  "setoran.konfirmasi": "Konfirmasi setoran",
  "setoran.tolak": "Tolak setoran",
  "warga.hapus": "Hapus warga",
  "warga.reset_password": "Reset kata sandi",
};

const tanggalWaktu = (d) =>
  d
    ? new Date(d).toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export default function AktivitasPage() {
  const [data, setData] = useState({ riwayat: [], aksiTersedia: [] });
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterAksi, setFilterAksi] = useState("SEMUA");
  const [periodeDari, setPeriodeDari] = useState(getCurrentYm);
  const [periodeSampai, setPeriodeSampai] = useState(getCurrentYm);

  const [draftAksi, setDraftAksi] = useState("SEMUA");
  const [draftDari, setDraftDari] = useState(getCurrentYm);
  const [draftSampai, setDraftSampai] = useState(getCurrentYm);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await auditApi.getAll({
        aksi: filterAksi,
        search: search.trim() || undefined,
        dari: periodeDari,
        sampai: periodeSampai,
      });
      setData({ riwayat: res.riwayat ?? [], aksiTersedia: res.aksiTersedia ?? [] });
    } catch (err) {
      showMessage("Gagal Memuat Data", err.message, "error");
    } finally {
      setIsLoading(false);
    }
  }, [filterAksi, search, periodeDari, periodeSampai]);

  useEffect(() => {
    const t = setTimeout(load, search ? 400 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const list = useMemo(() => data.riwayat ?? [], [data]);
  const { page, totalPages, paginatedItems: listPage, prev, next } = usePagination(list, [list]);

  const filterAktif = filterAksi !== "SEMUA";
  const q = search.trim().toLowerCase();
  const aksiOptions = data.aksiTersedia?.length > 0 ? data.aksiTersedia : Object.keys(AKSI_LABEL);

  return (
    <div className="page-stack">
      <div className="page-toolbar-row">
        <div className="warga-filter-bar">
          <div className="warga-search-wrap">
            <Search size={15} className="warga-search-icon" />
            <input
              type="text"
              className="warga-search-input"
              placeholder="Cari blok, keterangan, pelaku…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <FilterPopover
            active={filterAktif}
            activeCount={
              (filterAksi !== "SEMUA" ? 1 : 0) +
              (periodeDari !== getCurrentYm() || periodeSampai !== getCurrentYm() ? 1 : 0)
            }
            onOpen={() => {
              setDraftAksi(filterAksi);
              setDraftDari(periodeDari);
              setDraftSampai(periodeSampai);
            }}
            onApply={() => {
              setFilterAksi(draftAksi);
              setPeriodeDari(draftDari);
              setPeriodeSampai(draftSampai);
            }}
            onReset={() => {
              const cur = getCurrentYm();
              setFilterAksi("SEMUA");
              setDraftAksi("SEMUA");
              setPeriodeDari(cur);
              setPeriodeSampai(cur);
              setDraftDari(cur);
              setDraftSampai(cur);
            }}
          >
            <FilterField label="Jenis aktivitas">
              <select
                className="form-control warga-filter-select"
                value={draftAksi}
                onChange={(e) => setDraftAksi(e.target.value)}
              >
                <option value="SEMUA">Semua aktivitas</option>
                {aksiOptions.map((a) => (
                  <option key={a} value={a}>{AKSI_LABEL[a] ?? a}</option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Periode Dari">
              <input
                type="month"
                value={draftDari}
                max={draftSampai || getCurrentYm()}
                onChange={(e) => e.target.value && setDraftDari(e.target.value)}
                className="ipl-input"
              />
            </FilterField>
            <FilterField label="Periode Sampai">
              <input
                type="month"
                value={draftSampai}
                min={draftDari || undefined}
                max={getCurrentYm()}
                onChange={(e) => e.target.value && setDraftSampai(e.target.value)}
                className="ipl-input"
              />
            </FilterField>
          </FilterPopover>
        </div>
      </div>

      <div className="table-card">
        <div className="ipl-table-header">
          <span className="ipl-table-title">Riwayat Aktivitas</span>
          <span className="ipl-table-count">{list.length} data</span>
        </div>
        <div className="table-wrapper warga-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Aktivitas</th>
                <th>Pelaku</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {!isLoading &&
                listPage.map((r) => (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{tanggalWaktu(r.createdAt)}</td>
                    <td>
                      <span className={`status-badge ${r.aksi === "rumah.ubah_status" || r.aksi === "ipl.koreksi" ? "kontrak" : "active"}`}>
                        {AKSI_LABEL[r.aksi] ?? r.aksi}
                      </span>
                    </td>
                    <td>{r.namaUser || "—"}</td>
                    <td>{r.keterangan || "—"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {isLoading && <div className="table-loading">Memuat riwayat…</div>}
        {!isLoading && list.length === 0 && (
          <div className="table-empty">
            {q ? "Tidak ada aktivitas yang sesuai pencarian." : "Belum ada aktivitas tercatat pada periode ini."}
          </div>
        )}
        {!isLoading && (
          <Pagination page={page} totalPages={totalPages} total={list.length} onPrev={prev} onNext={next} />
        )}
      </div>

      <p className="keu-rincian-note" style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <History size={14} /> Catatan ini hanya-baca dan tidak bisa diubah lewat aplikasi. Flip status ke
        kosong dan koreksi nominal selalu tercatat di sini sekaligus diteruskan ke RW.
      </p>
    </div>
  );
}
