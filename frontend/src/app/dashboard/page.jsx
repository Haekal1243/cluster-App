"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { can, isWargaView, isPengurusRt } from "@/lib/session";
import PanelSistem from "@/components/dashboard/PanelSistem";
import { useUser } from "@/lib/useUser";

// Dispatcher /dashboard: arahkan ke home per audiens.
// - Warga -> /dashboard/warga; pengurus RT -> /dashboard/rt; pengurus RW -> /dashboard/rw.
// - Akun tanpa ipl.read (mis. role Admin) tetap melihat PanelSistem di sini.
export default function DashboardDispatcher() {
  const { user, ready } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!ready || !user) return;
    if (isWargaView(user)) router.replace("/dashboard/warga");
    else if (!can(user, "ipl.read")) return;
    else if (isPengurusRt(user)) router.replace("/dashboard/rt");
    else router.replace("/dashboard/rw");
  }, [ready, user, router]);

  if (!ready || !user) return null;
  if (!can(user, "ipl.read")) return <PanelSistem user={user} />;

  return (
    <div className="portal-loading">
      <div className="portal-spinner" />
      <p>Mengalihkan...</p>
    </div>
  );
}
