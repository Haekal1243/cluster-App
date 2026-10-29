"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { can } from "@/lib/session";
import { NAV_ITEMS } from "@/lib/nav";
import RiwayatAktivitas from "./RiwayatAktivitas";

/**
 * Dashboard untuk akun yang hanya mengelola sistem (mis. Admin): tidak punya akses
 * tagihan/keuangan, jadi yang ditampilkan pintasan ke menu pengelolaan dan riwayat aktivitas.
 */
export default function PanelSistem({ user }) {
  const pintasan = NAV_ITEMS.filter((i) => i.href !== "/dashboard" && i.allow(user));

  return (
    <div className="page-stack">
      <div className="page-toolbar">
        <div>
          <h2>Halo, {user.nama || user.name}</h2>
          <p>
            Panel pengelola sistem. Di sini Anda mengatur hak akses, menetapkan pengurus RW/RT, dan mengelola data
            warga. Urusan tagihan, keuangan, dan kegiatan dikerjakan pengurus RW/RT sesuai jabatannya.
          </p>
        </div>
      </div>

      <div className="content-card">
        <div className="db-section-header">
          <h3>Menu Pengelolaan</h3>
        </div>
        <div className="panel-sistem-links">
          {pintasan.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="panel-sistem-link">
              <span className="panel-sistem-icon">
                <Icon size={18} />
              </span>
              <span>{label}</span>
              <ArrowRight size={16} className="panel-sistem-arrow" />
            </Link>
          ))}
        </div>
      </div>

      {can(user, "audit.read") && <RiwayatAktivitas />}
    </div>
  );
}
