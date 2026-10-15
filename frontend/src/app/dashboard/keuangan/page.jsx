"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { can, isPengurusRt, isWargaView } from "@/lib/session";
import { useUser } from "@/lib/useUser";

// Dispatcher /dashboard/keuangan: arahkan ke kas per wilayah.
// - Pengurus RT -> /keuangan/rt; pengurus RW / admin -> /keuangan/rw.
// - Warga tidak punya akses (DashboardShell mengarahkan ke /dashboard).
export default function KeuanganDispatcher() {
  const { user, ready } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!ready || !user) return;
    if (!can(user, "keuangan.read") || isWargaView(user)) return;
    if (isPengurusRt(user)) router.replace("/dashboard/keuangan/rt");
    else router.replace("/dashboard/keuangan/rw");
  }, [ready, user, router]);

  return (
    <div className="portal-loading">
      <div className="portal-spinner" />
      <p>Mengalihkan...</p>
    </div>
  );
}
