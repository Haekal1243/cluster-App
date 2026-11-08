"use client";

import PageHelp from "@/components/ui/PageHelp";
import Link from "next/link";
import { Home, Settings2, UserMinus, UserPlus, Users } from "lucide-react";
import { usePathname } from "next/navigation";
import { can } from "@/lib/session";
import { useUser } from "@/lib/useUser";

export default function WargaLayout({ children }) {
  const pathname = usePathname();
  const { user } = useUser();
  const bolehApprove = can(user, "warga.approve_registrasi");
  const bolehKelolaRumah = can(user, "rumah.create");
  const bolehLihatTabRumah = can(user, "rumah.read") && !bolehKelolaRumah;

  const isRumah = pathname?.includes("/blok-rumah");
  const isKelolaRumah = pathname?.includes("/kelola-rumah");
  const isPendaftaran = pathname?.includes("/pendaftaran");
  const isPengajuanHapus = pathname?.includes("/pengajuan-hapus");
  const isDataWarga = !isRumah && !isKelolaRumah && !isPendaftaran && !isPengajuanHapus;
  const bolehLihatPengajuanHapus = can(user, "warga.approve_hapus") || can(user, "warga.ajukan_hapus");

  const banner = isRumah
    ? { id: "blok-rumah", judul: "Blok Rumah", ket: "Daftar unit rumah beserta penghuni dan statusnya di cluster Topaz." }
    : isKelolaRumah
    ? { id: "kelola-rumah", judul: "Kelola Rumah", ket: "Tambah, ubah, atau hapus data rumah dan atur kontrak penyewa." }
    : isPendaftaran
    ? { id: "pendaftaran", judul: "Pendaftaran Masuk", ket: "Tinjau pendaftaran akun warga baru, lalu setujui atau tolak." }
    : isPengajuanHapus
    ? { id: "pengajuan-hapus", judul: "Pengajuan Hapus Akun", ket: "Pengajuan penghapusan akun warga yang menunggu keputusan RW." }
    : { id: "data-warga", judul: "Data Warga", ket: "Kelola akun dan data warga cluster Topaz." };

  return (
    <div className="page-stack">
      <div className="page-toolbar">
        <div>
          <h2>{banner.judul}</h2>
          <p>{banner.ket}</p>
        </div>
        <PageHelp id={banner.id} />
      </div>

      <div className="db-section-toggle" role="tablist" aria-label="Data warga atau blok rumah">
        <Link
          href="/dashboard/data-warga"
          role="tab"
          aria-selected={isDataWarga}
          className={`db-toggle-btn ${isDataWarga ? "is-active" : ""}`}
        >
          <Users size={14} /> Data Warga
        </Link>
        {bolehLihatTabRumah && (
          <Link
            href="/dashboard/data-warga/blok-rumah"
            role="tab"
            aria-selected={isRumah}
            className={`db-toggle-btn ${isRumah ? "is-active" : ""}`}
          >
            <Home size={14} /> Blok Rumah
          </Link>
        )}
        {bolehKelolaRumah && (
          <Link
            href="/dashboard/data-warga/kelola-rumah"
            role="tab"
            aria-selected={isKelolaRumah}
            className={`db-toggle-btn ${isKelolaRumah ? "is-active" : ""}`}
          >
            <Settings2 size={14} /> Kelola Rumah
          </Link>
        )}
        {bolehApprove && (
          <Link
            href="/dashboard/data-warga/pendaftaran"
            role="tab"
            aria-selected={isPendaftaran}
            className={`db-toggle-btn ${isPendaftaran ? "is-active" : ""}`}
          >
            <UserPlus size={14} /> Pendaftaran Masuk
          </Link>
        )}
        {bolehLihatPengajuanHapus && (
          <Link
            href="/dashboard/data-warga/pengajuan-hapus"
            role="tab"
            aria-selected={isPengajuanHapus}
            className={`db-toggle-btn ${isPengajuanHapus ? "is-active" : ""}`}
          >
            <UserMinus size={14} /> Pengajuan Hapus
          </Link>
        )}
      </div>

      {children}
    </div>
  );
}
