"use client";

import { useUser } from "@/lib/useUser";
import { can, isPengurusRt, areaLabel } from "@/lib/session";
import { KeuanganView } from "../_views/shared/KeuanganView";

// Keuangan RT: hanya kas RT sendiri. Batas tegas — RT tidak bisa intip RT lain / RW.
export default function KeuanganRtPage() {
  const { user, ready } = useUser();

  if (!ready || !user) return null;

  // Akun area-null (admin sistem) boleh lewat, area ikut bebas via view.
  const adminBebas = !user.area && can(user, "keuangan.read");
  if (!isPengurusRt(user) && !adminBebas) {
    if (typeof window !== "undefined") window.location.replace("/dashboard");
    return null;
  }

  const area = user.area ?? null;
  return (
    <KeuanganView
      user={user}
      areaTetap={area}
      judul={area ? `Keuangan ${areaLabel(area)}` : "Keuangan RT"}
    />
  );
}
