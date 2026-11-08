"use client";

import { useUser } from "@/lib/useUser";
import { isPengurusRt } from "@/lib/session";
import { PengurusDashboardView } from "../_views/pengurus/PengurusDashboardView";

export default function RtHomePage() {
  const { user, ready } = useUser();

  if (!ready || !user) return null;

  if (!isPengurusRt(user)) {
    if (typeof window !== "undefined") window.location.replace("/dashboard");
    return null;
  }

  return <PengurusDashboardView user={user} />;
}
