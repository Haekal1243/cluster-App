"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Dropdown custom pengganti <select> native. Native <select> di Android/Chrome mobile
 * membuka picker OS (popup gelap penuh layar) yang nggak bisa diubah tampilannya lewat
 * CSS — jadi kita render sendiri listbox-nya nempel di bawah field, kayak combobox.
 *
 * options: [{ value, label }]
 */
export default function Select({
  id,
  name,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  className = "",
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

  const selected = options.find((o) => String(o.value) === String(value));

  const pilih = (opt) => {
    onChange(opt.value);
    setOpen(false);
  };

  return (
    <div className="combobox" ref={ref}>
      <button
        type="button"
        id={id}
        name={name}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`form-control custom-select ui-select-trigger ${open ? "combobox-input-open" : ""} ${className}`}
        onClick={() => !disabled && setOpen((v) => !v)}
      >
        <span className={selected ? "" : "is-placeholder"}>
          {selected ? selected.label : placeholder ?? ""}
        </span>
      </button>
      {open && (
        <ul className="combobox-list" role="listbox">
          {options.map((opt, i) => (
            <li key={`${opt.value}-${i}`}>
              <button
                type="button"
                className={`combobox-option ${String(opt.value) === String(value) ? "is-selected" : ""}`}
                onClick={() => pilih(opt)}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
