"use client";

import { useEffect } from "react";

const TIPE_PICKER = new Set(["month", "date", "datetime-local", "time", "week"]);

/**
 * Input tanggal/bulan bawaan browser desktop hanya membuka kalender kalau ikonnya diklik; klik
 * di badan kolom cuma memilih segmen (bulan/tahun) sehingga terasa "tidak bisa dibuka".
 * Komponen ini (tanpa tampilan) membuat klik di mana saja pada kolom membuka kalender.
 * Klik tepat di ikon dilewati karena browser sudah membukanya sendiri.
 */
export default function PickerKlikPenuh() {
  useEffect(() => {
    const onClick = (e) => {
      const el = e.target;
      if (!(el instanceof HTMLInputElement) || !TIPE_PICKER.has(el.type)) return;
      if (el.disabled || el.readOnly || typeof el.showPicker !== "function") return;
      const rect = el.getBoundingClientRect();
      if (e.clientX >= rect.right - 36) return; // area ikon kalender
      try {
        el.showPicker();
      } catch {
        // picker sudah terbuka / browser menolak: biarkan perilaku bawaan
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
