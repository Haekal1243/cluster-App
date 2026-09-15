"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Filter, ChevronDown } from "lucide-react";

export default function FilterPopover({
  children,
  active = false,
  label = "Filter",
  open: controlledOpen,
  onOpenChange,
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  // Mode controlled (bila prop open diberikan) atau uncontrolled seperti semula.
  // Pemakaian lama tanpa prop baru tetap berperilaku sama persis.
  const open = controlledOpen ?? internalOpen;

  // Simpan nilai terbaru di ref agar setOpen tidak perlu open sebagai dependency,
  // sehingga ukuran deps array useEffect selalu konstan.
  const openRef = useRef(open);
  openRef.current = open;

  const controlledOpenRef = useRef(controlledOpen);
  controlledOpenRef.current = controlledOpen;

  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  const setOpen = useCallback((value) => {
    const next = typeof value === "function" ? value(openRef.current) : value;
    if (controlledOpenRef.current === undefined) setInternalOpen(next);
    onOpenChangeRef.current?.(next);
  }, []);

  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, setOpen]);

  return (
    <div className="filter-popover" ref={ref}>
      <button
        type="button"
        className={`filter-popover-btn ${active ? "is-active" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Filter size={15} />
        {label}
        <ChevronDown size={14} className={`filter-popover-chevron ${open ? "is-open" : ""}`} />
      </button>

      {open && (
        <div className="filter-popover-panel" role="dialog" aria-label={label}>
          {children}
        </div>
      )}
    </div>
  );
}

export function FilterField({ label, children }) {
  return (
    <div className="filter-popover-field">
      <label>{label}</label>
      {children}
    </div>
  );
}
