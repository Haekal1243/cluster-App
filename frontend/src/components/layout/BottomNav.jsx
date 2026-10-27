"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import { NAV_ITEMS, navItemFor, resolveLabel } from "@/lib/nav";

/** Menu bawah ala aplikasi mobile; hanya dirender untuk tampilan warga dan hanya terlihat di layar sempit (CSS). */
export default function BottomNav({ user }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((i) => i.allow(user));
  const aktif = pathname === "/dashboard/pengaturan" ? "/dashboard/pengaturan" : navItemFor(pathname)?.href ?? items[0]?.href;

  return (
    <nav className="bottom-nav" aria-label="Menu utama">
      {items.map(({ label, href, icon: Icon }) => (
        <Link key={href} href={href} className={`bottom-nav-item ${aktif === href ? "is-active" : ""}`}>
          <Icon size={21} />
          <span>{resolveLabel(label, user)}</span>
        </Link>
      ))}
      <Link
        href="/dashboard/pengaturan"
        className={`bottom-nav-item ${aktif === "/dashboard/pengaturan" ? "is-active" : ""}`}
      >
        <Settings size={21} />
        <span>Pengaturan</span>
      </Link>
    </nav>
  );
}
