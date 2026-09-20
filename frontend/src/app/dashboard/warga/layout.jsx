"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function WargaLayout({ children }) {
  const pathname = usePathname();
  const isRumah = pathname?.includes("/blok-rumah");

  return (
    <div className="page-stack">
      <div className="page-toolbar">
        <div>
          <h2>Data Warga &amp; Rumah</h2>
          <p>Kelola warga dan unit rumah cluster Topaz.</p>
        </div>
      </div>

      <div className="db-section-toggle" role="tablist" aria-label="Data warga atau blok rumah">
        <Link
          href="/dashboard/warga"
          role="tab"
          aria-selected={!isRumah}
          className={`db-toggle-btn ${!isRumah ? "is-active" : ""}`}
        >
          Data Warga
        </Link>
        <Link
          href="/dashboard/warga/blok-rumah"
          role="tab"
          aria-selected={isRumah}
          className={`db-toggle-btn ${isRumah ? "is-active" : ""}`}
        >
          Blok Rumah
        </Link>
      </div>

      {children}
    </div>
  );
}
