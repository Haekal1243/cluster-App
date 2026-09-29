"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  Upload,
  Image as ImageIcon,
  Send,
  Trash2,
  Loader2,
} from "lucide-react";
import { portalApi } from "@/lib/api";
import { showMessage } from "@/lib/message";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/jpg"];

const formatUkuran = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

export default function BuktiUploadModal({ ipl, user, rumah, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const panelRef = useRef(null);
  const triggerRef = useRef(null);

  // Preview gambar saat file dipilih
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // A11y: fokus masuk modal, Esc menutup, scroll body dikunci,
  // fokus dikembalikan ke pemicu saat modal ditutup.
  useEffect(() => {
    triggerRef.current = document.activeElement;
    panelRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", handleKey);
      if (triggerRef.current instanceof HTMLElement) triggerRef.current.focus();
    };
  }, [onClose]);

  // Validasi klien (gate tampilan saja; aturan backend tetap sumber kebenaran).
  const pilihFile = (f) => {
    if (!f) return;
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setError("Format file harus JPG atau PNG.");
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setError("Ukuran file maksimal 5 MB.");
      return;
    }
    setError(null);
    setFile(f);
  };

  const handleFileChange = (e) => {
    pilihFile(e.target.files?.[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    pilihFile(e.dataTransfer.files?.[0]);
  };

  const resetFile = () => {
    setFile(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      await showMessage("Pilih file bukti pembayaran terlebih dahulu!", "warning");
      return;
    }
    setIsSubmitting(true);
    try {
      await portalApi.uploadBuktiPembayaran({
        idUser: user.id,
        idIpl: ipl.id,
        nominal: ipl.nominal,
        file,
      });
      await showMessage(
        "Bukti pembayaran berhasil dikirim!\nAdmin akan mengkonfirmasi dalam 1x24 jam.",
        "success"
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      await showMessage(err.message || "Gagal mengirim bukti pembayaran.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const MONTHS = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  const bulanLabel = `${MONTHS[(parseInt(ipl.bulanPeriode, 10) - 1)] || ipl.bulanPeriode} ${ipl.tahunPeriode}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bukti-upload-title"
        tabIndex={-1}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 id="bukti-upload-title" className="text-base font-semibold text-slate-900">
              Unggah bukti pembayaran
            </h2>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              Tagihan IPL {bulanLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body + footer */}
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-4 p-5">
            {/* Ringkasan tagihan */}
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-500">Periode</span>
                <span className="text-sm font-medium text-slate-900">{bulanLabel}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-sm text-slate-500">Rumah</span>
                <span className="text-sm font-medium text-slate-900">
                  {rumah?.blokRumah} ({rumah?.rt?.replace("_", " ")})
                </span>
              </div>
              <div className="my-3 border-t border-slate-200" />
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-500">Nominal</span>
                <span className="text-xl font-semibold text-teal-700">
                  Rp {ipl.nominal.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            {/* Dropzone */}
            {file ? (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                {preview ? (
                  <img
                    src={preview}
                    alt="Preview bukti"
                    className="h-12 w-12 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                    <ImageIcon size={22} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{file.name}</p>
                  <p className="text-xs text-slate-500">{formatUkuran(file.size)} · siap dikirim</p>
                </div>
                <button
                  type="button"
                  onClick={resetFile}
                  aria-label="Hapus file"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-emerald-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              <div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                  className={`flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed px-4 py-7 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-teal-600 ${
                    error
                      ? "border-red-400 bg-red-50/50"
                      : isDragOver
                        ? "border-teal-600 bg-teal-50"
                        : "border-slate-300 bg-white hover:border-teal-600 hover:bg-teal-50/50"
                  }`}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                    <Upload size={20} />
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-700">
                    Klik atau seret foto bukti transfer
                  </p>
                  <p className="mt-1 text-xs text-slate-500">JPG / PNG, maks. 5 MB</p>
                </div>
                {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpg,image/jpeg,image/png"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3.5">
              <button
                type="button"
                onClick={onClose}
                className="h-[38px] rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !file}
                className={`flex h-[38px] items-center gap-2 rounded-lg px-4 text-sm font-medium text-white ${
                  isSubmitting || !file
                    ? "cursor-not-allowed bg-slate-300"
                    : "bg-teal-700 hover:bg-teal-800"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Kirim bukti
                  </>
                )}
              </button>
            </div>
          </form>
      </div>
    </div>
  );
}
