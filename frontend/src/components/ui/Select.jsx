"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";

const MOBILE_QUERY = "(max-width: 767px)";
const MENU_MAX_HEIGHT = 280;
const MENU_GAP = 4;

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return mobile;
}

export default function Select({
  id,
  name,
  value,
  onChange,
  options = [],
  placeholder,
  disabled = false,
  className = "",
  expandOnMobile = false,
  searchable = false,
  searchPlaceholder = "Ketik untuk mencari…",
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const [focusIdx, setFocusIdx] = useState(-1);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const cariRef = useRef(null);
  const listId = useId();
  const isMobile = useIsMobile();
  const inlineList = expandOnMobile && isMobile;

  const selectedIndex = options.findIndex((o) => String(o.value) === String(value));
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;
  const kata = query.trim().toLowerCase();
  const tampil = searchable && kata ? options.filter((o) => String(o.label).toLowerCase().includes(kata)) : options;

  const atasRef = useRef(false);

  const computePos = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const atas = atasRef.current;
    const ruang = atas ? r.top - MENU_GAP - 8 : window.innerHeight - r.bottom - MENU_GAP - 8;
    const left = Math.min(Math.max(8, r.left), Math.max(8, window.innerWidth - r.width - 8));
    return {
      atas,
      top: r.bottom + MENU_GAP,
      bottom: window.innerHeight - r.top + MENU_GAP,
      left,
      width: r.width,
      maxH: Math.max(120, Math.min(MENU_MAX_HEIGHT, ruang)),
    };
  }, []);

  const buka = useCallback(() => {
    if (disabled) return;
    const el = triggerRef.current;
    if (el) {
      const rc = el.getBoundingClientRect();
      const perkiraan = Math.min(MENU_MAX_HEIGHT, options.length * 40 + 8 + (searchable ? 49 : 0));
      const bawah = window.innerHeight - rc.bottom - MENU_GAP - 8;
      const atas = rc.top - MENU_GAP - 8;
      atasRef.current = bawah < perkiraan && atas > bawah;
    }
    setPos(computePos());
    setQuery("");
    setFocusIdx(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  }, [computePos, disabled, selectedIndex, options.length, searchable]);

  const tutup = useCallback((refocus = false) => {
    setOpen(false);
    setPos(null);
    setFocusIdx(-1);
    if (refocus) triggerRef.current?.focus();
  }, []);

  const pilih = useCallback(
    (opt) => {
      onChange?.(opt.value);
      tutup(true);
    },
    [onChange, tutup],
  );

  useEffect(() => {
    if (!open || inlineList) return;
    const onPointerDown = (e) => {
      if (menuRef.current?.contains(e.target)) return;
      if (rootRef.current?.contains(e.target)) return;
      tutup(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        tutup(true);
      }
    };
    const onReposition = () => {
      const next = computePos();
      if (next) setPos(next);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, inlineList, computePos, tutup]);

  useEffect(() => {
    if (!open || inlineList) return;
    const t = setTimeout(() => {
      if (searchable) cariRef.current?.focus();
      else menuRef.current?.querySelector('[role="option"]')?.focus();
    }, 0);
    return () => clearTimeout(t);
  }, [open, inlineList, searchable]);

  const onTriggerKeyDown = (e) => {
    if (disabled) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) buka();
    }
  };

  const gerakFokus = (delta) => {
    if (!tampil.length) return;
    const next = (focusIdx + delta + tampil.length) % tampil.length;
    setFocusIdx(next);
    menuRef.current
      ?.querySelector(`[data-idx="${next}"]`)
      ?.focus();
  };

  const onMenuKeyDown = (e) => {
    if (e.target === cariRef.current) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusIdx(0);
        menuRef.current?.querySelector('[data-idx="0"]')?.focus();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (tampil.length === 1) pilih(tampil[0]);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      gerakFokus(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      gerakFokus(-1);
    } else if (e.key === "Home") {
      e.preventDefault();
      setFocusIdx(0);
      menuRef.current?.querySelector('[data-idx="0"]')?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      const last = tampil.length - 1;
      setFocusIdx(last);
      menuRef.current?.querySelector(`[data-idx="${last}"]`)?.focus();
    }
  };

  if (inlineList) {
    return (
      <div
        className={`combobox-radio-list ${className}`}
        role="radiogroup"
        aria-label={placeholder ?? "Pilihan"}
      >
        {options.map((opt) => {
          const aktif = String(opt.value) === String(value);
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={aktif}
              disabled={disabled}
              className={`combobox-radio ${aktif ? "is-selected" : ""}`}
              onClick={() => onChange?.(opt.value)}
            >
              <span className="combobox-radio-label">{opt.label}</span>
              <span className="combobox-check" aria-hidden="true">
                {aktif && <Check size={18} />}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="combobox" ref={rootRef}>
      <button
        type="button"
        id={id}
        ref={triggerRef}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className={`form-control custom-select ui-select-trigger ${open ? "combobox-input-open" : ""} ${className}`}
        onClick={() => (open ? tutup(false) : buka())}
        onKeyDown={onTriggerKeyDown}
      >
        <span className={selected ? "" : "is-placeholder"}>
          {selected ? selected.label : (placeholder ?? "")}
        </span>
        <ChevronDown size={16} className="ui-select-chevron" aria-hidden="true" />
      </button>
      {name ? <input type="hidden" name={name} value={value ?? ""} /> : null}
      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            data-select-menu
            className="combobox-list combobox-list-portal"
            style={{
              ...(pos.atas ? { top: "auto", bottom: pos.bottom } : { top: pos.top }),
              left: pos.left,
              minWidth: pos.width,
              maxHeight: pos.maxH,
              ...(searchable ? { width: pos.width } : null),
            }}
            onKeyDown={onMenuKeyDown}
          >
            {searchable && (
              <div className="combobox-cari">
                <Search size={15} aria-hidden="true" />
                <input
                  ref={cariRef}
                  type="text"
                  inputMode="search"
                  autoComplete="off"
                  value={query}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setFocusIdx(0);
                  }}
                />
              </div>
            )}
            <ul id={listId} role="listbox" aria-label={placeholder ?? "Pilihan"} className="combobox-isi">
              {tampil.map((opt, i) => {
                const aktif = String(opt.value) === String(value);
                return (
                  <li
                    key={`${opt.value}-${i}`}
                    data-idx={i}
                    role="option"
                    aria-selected={aktif}
                    tabIndex={-1}
                    className={`combobox-option ${aktif ? "is-selected" : ""}`}
                    onClick={() => pilih(opt)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        pilih(opt);
                      }
                    }}
                    onMouseEnter={() => setFocusIdx(i)}
                  >
                    <span className="combobox-option-label">{opt.label}</span>
                    <span className="combobox-check" aria-hidden="true">
                      {aktif && <Check size={16} />}
                    </span>
                  </li>
                );
              })}
              {tampil.length === 0 && <li className="combobox-kosong">Tidak ditemukan</li>}
            </ul>
          </div>,
          document.body,
        )}
    </div>
  );
}
