"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { can } from "@/lib/session";
import { useUser } from "@/lib/useUser";

export default function WargaLayout({ children }) {
  const pathname = usePathname();
  const { user } = useUser();
  const bolehApprove = can(user, "warga.approve_registrasi");

  const isRumah = pathname?.includes("/blok-rumah");
  const isPendaftaran = pathname?.includes("/pendaftaran");
  const isDataWarga = !isRumah && !isPendaftaran;

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
          aria-selected={isDataWarga}
          className={`db-toggle-btn ${isDataWarga ? "is-active" : ""}`}
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
        {bolehApprove && (
          <Link
            href="/dashboard/warga/pendaftaran"
            role="tab"
            aria-selected={isPendaftaran}
            className={`db-toggle-btn ${isPendaftaran ? "is-active" : ""}`}
          >
            Pendaftaran Masuk
          </Link>
        )}
      </div>

      {children}
    </div>
  );
}
