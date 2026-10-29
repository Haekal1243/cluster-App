"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import { NAV_ITEMS, navItemFor, resolveLabel } from "@/lib/nav";

/**
 * Menu bawah ala aplikasi mobile; hanya dirender untuk tampilan warga/akun sistem dan hanya terlihat di layar sempit (CSS).
 * Dock melayang; yang aktif ditandai pil teal di belakang ikon. `labelBawah` (opsional di NAV_ITEMS)
 * dipakai bila label menu terlalu panjang untuk satu tombol.
 */
export default function BottomNav({ user }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((i) => i.allow(user));
  const aktif = pathname === "/dashboard/pengaturan" ? "/dashboard/pengaturan" : navItemFor(pathname)?.href ?? items[0]?.href;

  return (
    <nav className="bottom-nav" aria-label="Menu utama">
      {items.map(({ label, labelBawah, href, icon: Icon }) => {
        const on = aktif === href;
        return (
          <Link key={href} href={href} className={`bottom-nav-item ${on ? "is-active" : ""}`} aria-current={on ? "page" : undefined}>
            <span className="bottom-nav-ikon"><Icon size={20} /></span>
            <span className="bottom-nav-label">{labelBawah ?? resolveLabel(label, user)}</span>
          </Link>
        );
      })}
      <Link
        href="/dashboard/pengaturan"
        className={`bottom-nav-item ${aktif === "/dashboard/pengaturan" ? "is-active" : ""}`}
        aria-current={aktif === "/dashboard/pengaturan" ? "page" : undefined}
      >
        <span className="bottom-nav-ikon"><Settings size={20} /></span>
        <span className="bottom-nav-label">Pengaturan</span>
      </Link>
    </nav>
  );
}
