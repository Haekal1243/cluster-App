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
  // Cek tagihan-pengurus dulu agar tidak dua tab aktif sekaligus
  // ("/tagihan-pengurus" dan "/tagihan-warga" sama-sama mengandung "/tagihan").
  const isTagihanPengurus =
    pathname === "/dashboard/kelola-ipl/tagihan-pengurus" ||
    pathname?.startsWith("/dashboard/kelola-ipl/tagihan-pengurus/");
  const isTagihanWarga =
    pathname === "/dashboard/kelola-ipl/tagihan-warga" ||
    pathname?.startsWith("/dashboard/kelola-ipl/tagihan-warga/");
  const isSetoran = pathname?.includes("/setoran");
  const tampilTagihanPengurus = bisaBayarSendiri && isPengurusIpl;
  // Tab hanya berguna kalau ada lebih dari satu pilihan; warga biasa cuma punya "Tagihan IPL".
  const jumlahTab = 1 + (tampilTagihanPengurus ? 1 : 0) + (bolehSetoran ? 1 : 0);

  return (
    <div className="page-stack">
      <div className="ipl-page-header">
        <div>
          <h2 className="ipl-page-title">{isPengurusIpl ? "Pengelolaan IPL" : "Tagihan IPL"}</h2>
          <p className="ipl-page-subtitle">
            {isPengurusIpl
              ? "Tagihan Warga untuk penagihan, Tagihan Pengurus untuk IPL pribadi Anda, Setoran untuk rekap RT ke RW."
              : "Bayar dan pantau tagihan IPL rumah Anda."}
          </p>
        </div>
      </div>

      {jumlahTab > 1 && (
      <div className="db-section-toggle" role="tablist" aria-label="Kelola IPL">
        <Link
          href="/dashboard/kelola-ipl/tagihan-warga"
          role="tab"
          aria-selected={isTagihanWarga}
          className={`db-toggle-btn ${isTagihanWarga ? "is-active" : ""}`}
        >
          {isPengurusIpl ? "Tagihan Warga" : "Tagihan IPL"}
        </Link>
        {tampilTagihanPengurus && (
          <Link
            href="/dashboard/kelola-ipl/tagihan-pengurus"
            role="tab"
            aria-selected={isTagihanPengurus}
            className={`db-toggle-btn ${isTagihanPengurus ? "is-active" : ""}`}
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
