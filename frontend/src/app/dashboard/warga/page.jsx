"use client";

import { useUser } from "@/lib/useUser";
import { isWargaView } from "@/lib/session";
import { WargaDashboardView } from "../_views/warga/WargaDashboardView";

export default function WargaHomePage() {
  const { user, ready } = useUser();

  if (!ready || !user) return null;

  if (!isWargaView(user)) {
    if (typeof window !== "undefined") window.location.replace("/dashboard");
    return null;
  }

  return <WargaDashboardView user={user} />;
}
