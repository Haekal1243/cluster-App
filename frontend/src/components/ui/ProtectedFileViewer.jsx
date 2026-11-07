"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { PROTECTED_FILE_EVENT } from "@/lib/api";

/**
 * Pop up pratinjau file terlindungi (bukti transfer, dll). Dipicu `openProtectedFile()` lewat
 * event, jadi cukup dipasang sekali di layout dashboard — semua tombol "lihat bukti" ikut
 * membuka pop up ini, bukan tab baru. Gambar ditampilkan langsung, PDF lewat iframe.
 */
export default function ProtectedFileViewer() {
  const [file, setFile] = useState(null);

  useEffect(() => {
    const onOpen = (e) => setFile((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return e.detail;
    });
    window.addEventListener(PROTECTED_FILE_EVENT, onOpen);
    return () => window.removeEventListener(PROTECTED_FILE_EVENT, onOpen);
  }, []);

  const tutup = () => {
    if (file?.url) URL.revokeObjectURL(file.url);
    setFile(null);
  };

  useEffect(() => {
    if (!file) return;
    const onKey = (e) => { if (e.key === "Escape") tutup(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  if (!file) return null;
  const isPdf = file.type === "application/pdf";

  return (
    <div className="ipl-modal-overlay" style={{ zIndex: 1200 }} onClick={tutup}>
      <div className="ipl-modal pfv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ipl-modal-header">
          <h3>Bukti</h3>
          <button type="button" className="ipl-modal-close" onClick={tutup} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>
        <div className="pfv-body">
          {isPdf ? (
            <iframe src={file.url} title="Pratinjau file" className="pfv-frame" />
          ) : (
            <img src={file.url} alt="Bukti" className="pfv-img" />
          )}
        </div>
      </div>
    </div>
  );
}
