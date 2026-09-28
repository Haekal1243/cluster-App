"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/lib/useUser";
import { can, canAny, isWargaView, scopeOf } from "@/lib/session";

export default function KelolaIplLayout({ children }) {
  const pathname = usePathname();
  const { user } = useUser();
  const isWarga = isWargaView(user);
  const isPengurusIpl = can(user, "ipl.read") && scopeOf(user, "ipl.read") !== "OWN";
  const bolehSetoran = !isWarga && canAny(user, ["setoran.read", "setoran.create"]);
  const bisaBayarSendiri = can(user, "ipl.bayar");
  // "/tagihan-saya" mengandung substring "/tagihan", jadi harus dicek lebih dulu
  // agar tidak dua tab aktif sekaligus.
  const isTagihanSaya =
    pathname === "/dashboard/kelola-ipl/tagihan-saya" ||
    pathname?.startsWith("/dashboard/kelola-ipl/tagihan-saya/");
  const isTagihan = !isTagihanSaya && pathname?.includes("/tagihan");
  const isSetoran = pathname?.includes("/setoran");
  const tampilTagihanSaya = bisaBayarSendiri && isPengurusIpl;
  // Tab hanya berguna kalau ada lebih dari satu pilihan; warga biasa cuma punya "Tagihan IPL".
  const jumlahTab = 1 + (tampilTagihanSaya ? 1 : 0) + (bolehSetoran ? 1 : 0);

  return (
    <div className="page-stack">
      <div className="ipl-page-header">
        <div>
          <h2 className="ipl-page-title">{isPengurusIpl ? "Pengelolaan IPL" : "Tagihan IPL"}</h2>
          <p className="ipl-page-subtitle">
            {isPengurusIpl
              ? "Tagihan Warga untuk penagihan, Tagihan Saya untuk IPL pribadi Anda, Setoran untuk rekap RT ke RW."
              : "Bayar dan pantau tagihan IPL rumah Anda."}
          </p>
        </div>
      </div>

      {jumlahTab > 1 && (
      <div className="db-section-toggle" role="tablist" aria-label="Kelola IPL">
        <Link
          href="/dashboard/kelola-ipl/tagihan"
          role="tab"
          aria-selected={isTagihan}
          className={`db-toggle-btn ${isTagihan ? "is-active" : ""}`}
        >
          {isPengurusIpl ? "Tagihan Warga" : "Tagihan IPL"}
        </Link>
        {tampilTagihanSaya && (
          <Link
            href="/dashboard/kelola-ipl/tagihan-saya"
            role="tab"
            aria-selected={isTagihanSaya}
            className={`db-toggle-btn ${isTagihanSaya ? "is-active" : ""}`}
          >
            Tagihan Saya
          </Link>
        )}
        {bolehSetoran && (
          <Link
            href="/dashboard/kelola-ipl/setoran"
            role="tab"
            aria-selected={isSetoran}
            className={`db-toggle-btn ${isSetoran ? "is-active" : ""}`}
          >
            Setoran IPL
          </Link>
        )}
      </div>
      )}

      <div>{children}</div>
    </div>
  );
}
