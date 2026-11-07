"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ListFilter } from "lucide-react";

const BASE = "/landingpage/riwayat-kegiatan";

/** Tombol Filter: dropdown pilihan tahun (hanya tahun yang punya data), tinggi dibatasi dan bisa digulir. */
export default function FilterTahun({ tahunTersedia, tahunDipilih }) {
  const [buka, setBuka] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!buka) return;
    const luar = (e) => ref.current && !ref.current.contains(e.target) && setBuka(false);
    const esc = (e) => e.key === "Escape" && setBuka(false);
    document.addEventListener("mousedown", luar);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", luar);
      document.removeEventListener("keydown", esc);
    };
  }, [buka]);

  const pilihan = [{ nilai: null, label: "Semua tahun" }, ...tahunTersedia.map((t) => ({ nilai: t, label: String(t) }))];

  return (
    <div className="rk-filter" ref={ref}>
      <button type="button" className="rk-filter-btn" aria-haspopup="listbox" aria-expanded={buka} onClick={() => setBuka((v) => !v)}>
        <ListFilter size={15} aria-hidden />
        <span>{tahunDipilih ? `Tahun ${tahunDipilih}` : "Filter tahun"}</span>
        <ChevronDown size={15} aria-hidden className={buka ? "rk-filter-panah rk-filter-panah-buka" : "rk-filter-panah"} />
      </button>

      {buka && (
        <ul className="rk-filter-menu" role="listbox" aria-label="Pilih tahun">
          {pilihan.map(({ nilai, label }) => {
            const aktif = (tahunDipilih ?? null) === nilai;
            return (
              <li key={label} role="option" aria-selected={aktif}>
                <Link
                  href={nilai ? `${BASE}?tahun=${nilai}` : BASE}
                  scroll={false}
                  className={aktif ? "rk-filter-opsi rk-filter-opsi-aktif" : "rk-filter-opsi"}
                  onClick={() => setBuka(false)}
                >
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
