"use client";

import { useEffect, useRef, useState } from "react";
import { Filter, ChevronDown } from "lucide-react";

export default function FilterPopover({ children, active = false, label = "Filter" }) {
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
