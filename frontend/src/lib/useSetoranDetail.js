"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { setoranApi } from "@/lib/api";
import { showMessage } from "@/lib/message";

export const SD_BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export function formatRupiah(n) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n || 0);
}

export function formatTanggal(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatJam(d) {
  if (!d) return "-";
  return new Date(d).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export function formatTanggalJam(d) {
  return `${formatTanggal(d)} · ${formatJam(d)}`;
}

export function periodeKey(tahun, bulan) {
  const y = Number(tahun);
  const m = Number(bulan);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return NaN;
  return y * 100 + m;
}

function labelPeriode(tahun, bulan) {
  return `${SD_BULAN[Number(bulan) - 1] || bulan} ${tahun}`;
}

/**
 * State + logic modal Detail Setoran. Sengaja dipisah dari view agar state
 * (mode tolak, isi textarea) tidak hilang saat rotate/resize menukar
 * tampilan desktop <-> mobile.
 */
export function useSetoranDetail(id, { onSuccess, onClose } = {}) {
  const [data, setData] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [modeTolak, setModeTolak] = useState(false);
  const [alasan, setAlasan] = useState("");
  const [submitting, setSubmitting] = useState(null); // "TERIMA" | "TOLAK" | null
  const [actionError, setActionError] = useState(null);

  const reload = useCallback(async () => {
    setLoadingDetail(true);
    setLoadError(null);
    try {
      const res = await setoranApi.getById(id);
      setData(res);
    } catch (e) {
      setLoadError(e?.message || "Gagal memuat detail setoran.");
    } finally {
      setLoadingDetail(false);
    }
  }, [id]);

  useEffect(() => {
    // Fetch awal; state berikutnya mengalir dari promise, bukan render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  const derived = useMemo(() => {
    const tagihan = data?.tagihan ?? [];
    const rows = [...tagihan];
    const totalRows = rows.reduce((s, t) => s + (t.nominalIpl || 0), 0);
    const unitCount = new Set(rows.map((t) => t.rumah?.blokRumah).filter(Boolean)).size;
    const keys = rows.map((t) => periodeKey(t.tahunPeriode, t.bulanPeriode)).filter(Number.isFinite).sort((a, b) => a - b);
    let rangeLabel = "-";
    if (keys.length > 0) {
      const first = rows.find((t) => periodeKey(t.tahunPeriode, t.bulanPeriode) === keys[0]);
      const last = rows.find((t) => periodeKey(t.tahunPeriode, t.bulanPeriode) === keys[keys.length - 1]);
      const a = labelPeriode(first.tahunPeriode, first.bulanPeriode);
      const b = labelPeriode(last.tahunPeriode, last.bulanPeriode);
      rangeLabel = a === b ? a : `${a} – ${b}`;
    }
    const totalSetoran = data?.totalIpl ?? 0;
    const selisih = totalSetoran - totalRows;
    return {
      rows,
      count: rows.length,
      totalRows,
      totalSetoran,
      unitCount,
      rangeLabel,
      selisih,
      cocok: selisih === 0,
    };
  }, [data]);

  const batalTolak = useCallback(() => {
    setModeTolak(false);
    setAlasan("");
    setActionError(null);
  }, []);

  const terima = useCallback(async () => {
    if (submitting) return;
    setSubmitting("TERIMA");
    setActionError(null);
    try {
      const res = await setoranApi.konfirmasi(id, { action: "TERIMA" });
      await showMessage("Dikonfirmasi", res?.message || "Setoran dikonfirmasi.", "success");
      onSuccess?.();
      onClose?.();
    } catch (e) {
      setActionError(e?.message || "Gagal mengkonfirmasi setoran.");
    } finally {
      setSubmitting(null);
    }
  }, [id, submitting, onSuccess, onClose]);

  const kirimTolak = useCallback(async () => {
    const catatan = alasan.trim();
    if (!catatan || submitting) return;
    setSubmitting("TOLAK");
    setActionError(null);
    try {
      const res = await setoranApi.konfirmasi(id, { action: "TOLAK", catatan });
      await showMessage("Ditolak", res?.message || "Setoran ditolak.", "info");
      onSuccess?.();
      onClose?.();
    } catch (e) {
      setActionError(e?.message || "Gagal menolak setoran.");
    } finally {
      setSubmitting(null);
    }
  }, [id, alasan, submitting, onSuccess, onClose]);

  return {
    data,
    loadingDetail,
    loadError,
    reload,
    modeTolak,
    setModeTolak,
    alasan,
    setAlasan,
    batalTolak,
    submitting,
    actionError,
    terima,
    kirimTolak,
    derived,
    menunggu: data?.status === "MENUNGGU_KONFIRMASI",
  };
}
