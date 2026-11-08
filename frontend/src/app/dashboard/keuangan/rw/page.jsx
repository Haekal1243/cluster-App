"use client";

import { useUser } from "@/lib/useUser";
import { isPengurusRw } from "@/lib/session";
import { KeuanganView } from "../_views/shared/KeuanganView";

export default function KeuanganRwPage() {
  const { user, ready } = useUser();

  if (!ready || !user) return null;

  if (!isPengurusRw(user)) {
    if (typeof window !== "undefined") window.location.replace("/dashboard");
    return null;
  }

  return <KeuanganView user={user} areaTetap={user.area ?? null} judul="Keuangan RW" />;
}
