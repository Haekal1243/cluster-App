"use client";

import PageHelp from "@/components/ui/PageHelp";
import Link from "next/link";
import { Landmark, ReceiptText, Wallet } from "lucide-react";
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
  const isTagihanPengurus =
    pathname === "/dashboard/kelola-ipl/tagihan-pengurus" ||
    pathname?.startsWith("/dashboard/kelola-ipl/tagihan-pengurus/");
  const isTagihanWarga =
    pathname === "/dashboard/kelola-ipl/tagihan-warga" ||
    pathname?.startsWith("/dashboard/kelola-ipl/tagihan-warga/");
  const isSetoran = pathname?.includes("/setoran");
  const tampilTagihanPengurus = bisaBayarSendiri && isPengurusIpl;
  const jumlahTab = 1 + (tampilTagihanPengurus ? 1 : 0) + (bolehSetoran ? 1 : 0);

  const banner = !isPengurusIpl
    ? { id: "ipl-warga", judul: "Tagihan IPL", ket: "Bayar dan pantau tagihan IPL rumah Anda." }
    : isSetoran
    ? { id: "setoran", judul: "Setoran IPL", ket: "Rekap IPL yang sudah lunas dan disetor RT ke RW." }
    : isTagihanPengurus
    ? { id: "tagihan-saya", judul: "Tagihan Saya", ket: "IPL rumah pribadi Anda sebagai warga; bayar dan pantau di sini." }
    : { id: "tagihan-warga", judul: "Tagihan Warga", ket: "Pantau dan tagih IPL warga di wilayah Anda." };

  return (
    <div className="page-stack">
      <div className="ipl-page-header">
        <div>
          <h2 className="ipl-page-title">{banner.judul}</h2>
          <p className="ipl-page-subtitle">{banner.ket}</p>
        </div>
        <PageHelp id={banner.id} />
      </div>

      {jumlahTab > 1 && (
      <div className="db-section-toggle" role="tablist" aria-label="Kelola IPL">
        <Link
          href="/dashboard/kelola-ipl/tagihan-warga"
          role="tab"
          aria-selected={isTagihanWarga}
          className={`db-toggle-btn ${isTagihanWarga ? "is-active" : ""}`}
        >
          <ReceiptText size={14} /> {isPengurusIpl ? "Tagihan Warga" : "Tagihan IPL"}
        </Link>
        {tampilTagihanPengurus && (
          <Link
            href="/dashboard/kelola-ipl/tagihan-pengurus"
            role="tab"
            aria-selected={isTagihanPengurus}
            className={`db-toggle-btn ${isTagihanPengurus ? "is-active" : ""}`}
          >
            <Wallet size={14} /> Tagihan Saya
          </Link>
        )}
        {bolehSetoran && (
          <Link
            href="/dashboard/kelola-ipl/setoran"
            role="tab"
            aria-selected={isSetoran}
            className={`db-toggle-btn ${isSetoran ? "is-active" : ""}`}
          >
            <Landmark size={14} /> Setoran IPL
          </Link>
        )}
      </div>
      )}

      <div>{children}</div>
    </div>
  );
}
