"use client";

import { useEffect, useRef, useState } from "react";
import { Filter, ChevronDown } from "lucide-react";

export default function FilterPopover({
  children,
  active = false,
  label = "Filter",
  onOpen,
  onApply,
  onReset,
  applyDisabled = false,
}) {
  const [open, setOpen] = useState(false);
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
  }, [open]);

  const handleToggle = () => {
    setOpen((o) => {
      const next = !o;
      if (next) onOpen?.();
      return next;
    });
  };

  const handleApply = () => {
    onApply?.();
    setOpen(false);
  };

  const handleReset = () => {
    onReset?.();
    setOpen(false);
  };

  return (
    <div className="filter-popover" ref={ref}>
      <button
        type="button"
        className={`filter-popover-btn ${active ? "is-active" : ""}`}
        onClick={handleToggle}
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
          <div className="filter-popover-footer">
            <button type="button" className="filter-popover-reset" onClick={handleReset}>
              Reset
            </button>
            <button
              type="button"
              className="filter-popover-apply"
              onClick={handleApply}
              disabled={applyDisabled}
            >
              Terapkan
            </button>
          </div>
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
