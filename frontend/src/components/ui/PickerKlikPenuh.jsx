"use client";

import { useEffect } from "react";

const TIPE_PICKER = new Set(["month", "date", "datetime-local", "time", "week"]);

export default function PickerKlikPenuh() {
  useEffect(() => {
    const onClick = (e) => {
      const el = e.target;
      if (!(el instanceof HTMLInputElement) || !TIPE_PICKER.has(el.type)) return;
      if (el.disabled || el.readOnly || typeof el.showPicker !== "function") return;
      const rect = el.getBoundingClientRect();
      if (e.clientX >= rect.right - 36) return;
      try {
        el.showPicker();
      } catch {
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
