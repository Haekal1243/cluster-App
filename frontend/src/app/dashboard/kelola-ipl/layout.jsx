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
  const isTagihan = pathname?.includes("/tagihan");
  const isSetoran = pathname?.includes("/setoran");

  return (
    <div className="page-stack">
      <div className="ipl-page-header">
        <div>
          <h2 className="ipl-page-title">{isPengurusIpl ? "Pengelolaan IPL" : "Tagihan IPL"}</h2>
          <p className="ipl-page-subtitle">
            {isPengurusIpl
              ? "Kelola tagihan dan setoran IPL — Tagihan untuk penagihan warga, Setoran untuk rekap RT ke RW."
              : "Bayar dan pantau tagihan IPL rumah Anda."}
          </p>
        </div>
      </div>

      <div className="db-section-toggle" role="tablist" aria-label="Kelola IPL">
        <Link
          href="/dashboard/kelola-ipl/tagihan"
          role="tab"
          aria-selected={isTagihan}
          className={`db-toggle-btn ${isTagihan ? "is-active" : ""}`}
        >
          Tagihan IPL
        </Link>
        {!isWarga && bolehSetoran && (
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

      <div>{children}</div>
    </div>
  );
}
