"use client";

import { useUser } from "@/lib/useUser";
import { can, scopeOf } from "@/lib/session";
import { PengurusIuranView } from "../_views/pengurus/PengurusIuranView";
import { WargaIuranView } from "../_views/warga/WargaIuranView";

// Dispatcher /kelola-ipl/tagihan-warga: pengurus (ipl.read non-OWN) melihat
// Tagihan Warga, selain itu melihat tagihan sendiri.
// Tagihan pribadi pengurus ada di route /kelola-ipl/tagihan-pengurus.
export default function IuranPage() {
  const { user, ready } = useUser();

  if (!ready || !user) return null;

  const bisaLihatWarga = can(user, "ipl.read") && scopeOf(user, "ipl.read") !== "OWN";

  if (bisaLihatWarga) return <PengurusIuranView user={user} />;
  return <WargaIuranView user={user} />;
}
