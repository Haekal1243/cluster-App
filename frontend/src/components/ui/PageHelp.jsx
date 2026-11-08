"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CircleHelp, X } from "lucide-react";
import { BANTUAN } from "@/lib/bantuan";

/**
 * Tombol "?" di pojok kanan atas banner halaman. Menampilkan penjelasan singkat halaman + FAQ.
 * `id` = kunci di lib/bantuan.js; kalau tidak ada isinya, tombol tidak tampil.
 */
export default function PageHelp({ id }) {
  const [open, setOpen] = useState(false);
  const data = BANTUAN[id];

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!data) return null;

  return (
    <>
      <button
        type="button"
        className="page-help-btn"
        onClick={() => setOpen(true)}
        aria-label={`Bantuan: ${data.judul}`}
        title="Bantuan halaman ini"
      >
        <CircleHelp size={18} />
      </button>

      {open &&
        createPortal(
          <div className="ipl-modal-overlay" onClick={() => setOpen(false)}>
            <div className="ipl-modal ipl-modal-review detail-modal" onClick={(e) => e.stopPropagation()}>
              <div className="ipl-modal-header">
                <h3><CircleHelp size={16} /> Bantuan</h3>
                <button type="button" className="ipl-modal-close" onClick={() => setOpen(false)} aria-label="Tutup">
                  <X size={18} />
                </button>
              </div>
              <div className="ipl-modal-body">
                <div className="review-desc-card">
                  <span className="review-info-label">Tentang halaman ini · {data.judul}</span>
                  <p className="review-desc-text">{data.ringkas}</p>
                </div>

                {data.faq?.length > 0 && (
                  <div className="page-help-faq">
                    <span className="review-info-label">Pertanyaan umum</span>
                    {data.faq.map((f) => (
                      <details key={f.q} className="page-help-item">
                        <summary>{f.q}</summary>
                        <p>{f.a}</p>
                      </details>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
