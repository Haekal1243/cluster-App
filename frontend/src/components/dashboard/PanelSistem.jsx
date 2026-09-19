"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, UserCog, Users } from "lucide-react";
import { pengurusApi, rbacApi, wargaApi } from "@/lib/api";
import { can } from "@/lib/session";
import { NAV_ITEMS } from "@/lib/nav";

/**
 * Dashboard untuk akun yang hanya mengelola sistem (mis. Admin): tidak punya akses
 * tagihan/keuangan, jadi yang ditampilkan ringkasan sistem dan pintasan ke menunya.
 */
export default function PanelSistem({ user }) {
  const [ringkasan, setRingkasan] = useState({});

  useEffect(() => {
    let batal = false;
    (async () => {
      const [matrix, slots, warga] = await Promise.all([
        can(user, "role.manage") ? rbacApi.getMatrix().catch(() => null) : null,
        can(user, "pengurus.manage") ? pengurusApi.getSlots().catch(() => null) : null,
        can(user, "warga.read") ? wargaApi.getAll().catch(() => null) : null,
      ]);
      if (batal) return;
      setRingkasan({
        role: matrix?.roles?.length,
        permission: matrix?.permissions?.length,
        jabatanTerisi: slots ? slots.filter((s) => s.pemegang).length : undefined,
        jabatanTotal: slots?.length,
        warga: warga?.length,
      });
    })();
    return () => {
      batal = true;
    };
  }, [user]);

  const pintasan = NAV_ITEMS.filter((i) => i.href !== "/dashboard" && i.allow(user));

  const kartu = [
    ringkasan.role !== undefined && {
      icon: ShieldCheck,
      tone: "tone-info",
      label: "Peran Terdaftar",
      nilai: ringkasan.role,
      sub: `${ringkasan.permission} jenis izin`,
    },
    ringkasan.jabatanTotal !== undefined && {
      icon: UserCog,
      tone: ringkasan.jabatanTerisi < ringkasan.jabatanTotal ? "tone-warning" : "tone-success",
      label: "Jabatan Pengurus Terisi",
      nilai: `${ringkasan.jabatanTerisi} / ${ringkasan.jabatanTotal}`,
      sub: "RW dan RT 1–4",
    },
    ringkasan.warga !== undefined && {
      icon: Users,
      tone: "tone-success",
      label: "Penghuni Terdaftar",
      nilai: ringkasan.warga,
      sub: "seluruh RW",
    },
  ].filter(Boolean);

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

      {kartu.length > 0 && (
        <div className="ipl-summary-grid">
          {kartu.map(({ icon: Icon, tone, label, nilai, sub }) => (
            <div key={label} className={`ipl-summary-card ${tone}`}>
              <div className="ipl-summary-icon">
                <Icon size={20} />
              </div>
              <div className="ipl-summary-body">
                <span className="ipl-summary-label">{label}</span>
                <span className="ipl-summary-value">{nilai}</span>
                <span className="ipl-summary-sub">{sub}</span>
              </div>
            </div>
          ))}
        </div>
      )}

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
    </div>
  );
}
