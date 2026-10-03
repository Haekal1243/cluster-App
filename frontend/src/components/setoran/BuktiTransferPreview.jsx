"use client";

import { ChevronRight } from "lucide-react";
import { setoranApi } from "@/lib/api";
import ProtectedImage from "@/components/ui/ProtectedImage";

export default function BuktiTransferPreview({ setoranId, isMobile, fullscreen }) {
  const path = setoranApi.buktiPath(setoranId);

  if (isMobile) {
    return (
      <div className="sd-bukti-m">
        <ProtectedImage
          path={path}
          alt="Bukti transfer setoran"
          fullscreen={fullscreen}
          trigger={({ open, src }) => (
            <button type="button" className="sd-bukti-row" onClick={open} aria-label="Lihat bukti transfer layar penuh">
              <span className="sd-bukti-thumb-m">
                {src ? <img src={src} alt="" aria-hidden="true" /> : <span className="sd-bukti-loading">…</span>}
              </span>
              <span className="sd-bukti-text">
                <b>Bukti Transfer</b>
                <i>Ketuk untuk lihat layar penuh</i>
              </span>
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          )}
        />
      </div>
    );
  }

  return (
    <div className="sd-bukti">
      <p className="sd-bukti-label">Bukti Transfer</p>
      <ProtectedImage
        path={path}
        alt="Bukti transfer setoran"
        trigger={({ open, src }) => (
          <button type="button" className="sd-bukti-thumb" onClick={open} aria-label="Perbesar bukti transfer">
            {src ? (
              <img src={src} alt="Bukti transfer setoran" />
            ) : (
              <span className="sd-bukti-loading">Memuat…</span>
            )}
            <span className="sd-bukti-overlay">Klik untuk perbesar</span>
          </button>
        )}
      />
    </div>
  );
}
