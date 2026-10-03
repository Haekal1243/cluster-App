"use client";

import { useEffect, useRef } from "react";
import { ArrowLeft, X } from "lucide-react";
import { areaLabel } from "@/lib/session";
import { showConfirm } from "@/lib/message";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { formatTanggalJam, useSetoranDetail } from "@/lib/useSetoranDetail";
import SetoranSummary from "./SetoranSummary";
import BuktiTransferPreview from "./BuktiTransferPreview";
import SetoranTagihanSection, { SetoranKonteks } from "./SetoranTagihanSection";
import SetoranActions from "./SetoranActions";

const STATUS_LABEL = {
  MENUNGGU_KONFIRMASI: "Menunggu Konfirmasi",
  DIKONFIRMASI: "Dikonfirmasi",
  DITOLAK: "Ditolak",
};

function StatusBadge({ status }) {
  const cls =
    status === "DIKONFIRMASI" ? "sd-status-ok" : status === "DITOLAK" ? "sd-status-no" : "sd-status-wait";
  return <span className={`sd-status ${cls}`}>{STATUS_LABEL[status] || status}</span>;
}

/**
 * Modal Detail Setoran RT: dialog dua kolom di desktop (>=768px),
 * full-screen sheet di mobile. State di-hook agar utuh saat rotate/resize.
 */
export default function SetoranDetailModal({ id, bolehKonfirmasi, onClose, onSuccess }) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const detail = useSetoranDetail(id, { onSuccess, onClose });
  const {
    data,
    loadingDetail,
    loadError,
    reload,
    modeTolak,
    alasan,
    setAlasan,
    batalTolak,
    submitting,
    actionError,
    terima,
    kirimTolak,
    derived,
    menunggu,
  } = detail;

  const dialogRef = useRef(null);
  const stateRef = useRef({ pushed: false, closing: false });
  const onCloseRef = useRef(onClose);
  // Mirror untuk handler history/focus yang hidup di luar render.
  // Di-sync di effect (bukan saat render) agar tidak melanggar react-hooks/refs.
  const apiRef = useRef({ modeTolak: false, kotor: false, batalTolak: () => {} });
  const requestCloseRef = useRef(() => {});

  const bisaAksi = bolehKonfirmasi && menunggu;

  const requestClose = async () => {
    if (apiRef.current.kotor) {
      const ok = await showConfirm(
        "Buang alasan penolakan?",
        "Alasan yang sudah diketik akan hilang.",
        "warning",
        "Ya, buang",
        "Tetap di sini",
      );
      if (!ok) return;
    }
    const st = stateRef.current;
    st.closing = true;
    if (st.pushed) {
      try {
        window.history.back();
      } catch {
        /* abaikan, lanjut tutup langsung */
      }
    }
    onCloseRef.current();
  };

  useEffect(() => {
    onCloseRef.current = onClose;
    apiRef.current = {
      modeTolak,
      kotor: modeTolak && alasan.trim().length > 0,
      batalTolak,
    };
    requestCloseRef.current = requestClose;
  });

  // Scroll lock + fokus awal + tombol back (sheet dulu, lalu modal).
  useEffect(() => {
    const st = stateRef.current;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    try {
      window.history.pushState({ sdModal: id }, "");
      st.pushed = true;
    } catch {
      st.pushed = false;
    }
    dialogRef.current?.focus();
    const onPop = () => {
      if (st.closing) return;
      const api = apiRef.current;
      if (api.kotor) {
        try {
          window.history.pushState({ sdModal: id }, "");
        } catch {
          /* abaikan */
        }
        showConfirm(
          "Buang alasan penolakan?",
          "Alasan yang sudah diketik akan hilang.",
          "warning",
          "Ya, buang",
          "Tetap di sini",
        ).then((ok) => {
          if (ok) api.batalTolak();
        });
        return;
      }
      if (api.modeTolak) {
        try {
          window.history.pushState({ sdModal: id }, "");
        } catch {
          /* abaikan */
        }
        api.batalTolak();
        return;
      }
      onCloseRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      document.body.style.overflow = prevOverflow;
      trigger?.focus?.();
    };
  }, [id]);

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      void requestCloseRef.current();
      return;
    }
    if (e.key !== "Tab" || !dialogRef.current) return;
    const list = [...dialogRef.current.querySelectorAll("button, textarea, input, select, a[href]")].filter(
      (el) => !el.disabled && el.offsetParent !== null,
    );
    if (list.length === 0) return;
    const first = list[0];
    const last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const rt = data ? areaLabel(data.area) : "";

  return (
    <div className="sd-overlay" onClick={() => void requestCloseRef.current()}>
      <div
        ref={dialogRef}
        className="sd-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Detail Setoran ${rt}`}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        {isMobile ? (
          <div className="sd-topbar">
            <button
              type="button"
              className="sd-back"
              aria-label="Kembali"
              onClick={() => void requestCloseRef.current()}
            >
              <ArrowLeft size={20} />
            </button>
            <div className="sd-topbar-title">
              <h3>Detail Setoran {rt}</h3>
              {data && <StatusBadge status={data.status} />}
            </div>
          </div>
        ) : (
          <div className="sd-header">
            <h3>Detail Setoran RT {rt.replace("RT ", "")}</h3>
            {data && <StatusBadge status={data.status} />}
            <span className="sd-header-meta">
              {data ? `Disetor ${data.createBy || "-"} · ${formatTanggalJam(data.createDate)}` : ""}
            </span>
            <button
              type="button"
              className="sd-close"
              aria-label="Tutup"
              onClick={() => void requestCloseRef.current()}
            >
              <X size={18} />
            </button>
          </div>
        )}

        <div className="sd-body">
          {loadingDetail ? (
            <div className="ipl-loading">
              <div className="ipl-spinner" />
              <span>Memuat detail setoran…</span>
            </div>
          ) : loadError || !data ? (
            <div className="sd-load-error" role="alert">
              <p>{loadError || "Data setoran tidak ditemukan."}</p>
              <button type="button" className="sd-btn sd-btn-ghost" onClick={reload}>
                Coba lagi
              </button>
            </div>
          ) : (
            <>
              {isMobile ? (
                <>
                  <SetoranSummary data={data} derived={derived} isMobile />
                  <BuktiTransferPreview setoranId={data.id} isMobile fullscreen />
                  <SetoranTagihanSection derived={derived} isMobile />
                </>
              ) : (
                <div className="sd-cols">
                  <div className="sd-main">
                    <SetoranTagihanSection derived={derived} isMobile={false} />
                  </div>
                  <aside className="sd-aside">
                    <SetoranSummary data={data} derived={derived} isMobile={false} />
                    <BuktiTransferPreview setoranId={data.id} />
                  </aside>
                </div>
              )}

              <SetoranKonteks konteks={data.konteks} />

              {!menunggu && (
                <div className="sd-statusinfo">
                  {data.status === "DITOLAK" ? (
                    <>
                      <b>Setoran ini ditolak oleh {data.konfirmasiBy || "-"}.</b>
                      {data.catatan && (
                        <span className="sd-statusinfo-alasan">Alasan: {data.catatan}</span>
                      )}
                    </>
                  ) : (
                    <b>
                      Setoran ini sudah dikonfirmasi oleh {data.konfirmasiBy || "-"}
                      {data.tanggalKonfirmasi ? ` · ${formatTanggalJam(data.tanggalKonfirmasi)}` : ""}.
                    </b>
                  )}
                </div>
              )}

              {actionError && (
                <p className="sd-error" role="alert">
                  {actionError}
                </p>
              )}
            </>
          )}
        </div>

        {bisaAksi && !loadingDetail && data && (
          <SetoranActions
            isMobile={isMobile}
            data={data}
            modeTolak={modeTolak}
            alasan={alasan}
            onAlasan={setAlasan}
            onMulaiTolak={() => detail.setModeTolak(true)}
            onBatalTolak={batalTolak}
            onKirimTolak={kirimTolak}
            onTerima={terima}
            submitting={submitting}
          />
        )}
      </div>
    </div>
  );
}
