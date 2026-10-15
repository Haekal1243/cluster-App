"use client";

import { useUser } from "@/lib/useUser";
import { can, isPengurusRw, scopeOf } from "@/lib/session";
import DashboardRW from "../_bendahara/DashboardRW";
import { PengurusDashboardView } from "../_views/pengurus/PengurusDashboardView";

// Beranda RW: /dashboard/rw.
// Bendahara RW (konfirmasi setoran ALL) melihat ringkasan setoran;
// pengurus RW lainnya melihat ringkasan cluster.
export default function RwHomePage() {
  const { user, ready } = useUser();

  if (!ready || !user) return null;

  if (!isPengurusRw(user)) {
    if (typeof window !== "undefined") window.location.replace("/dashboard");
    return null;
  }

  if (can(user, "setoran.konfirmasi") && scopeOf(user, "setoran.konfirmasi") === "ALL") {
    return <DashboardRW user={user} />;
  }
  return <PengurusDashboardView user={user} />;
}
