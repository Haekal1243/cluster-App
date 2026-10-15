"use client";

import { ReceiptText } from "lucide-react";
import { useUser } from "@/lib/useUser";
import { can } from "@/lib/session";
import { WargaIuranView } from "../_views/warga/WargaIuranView";

export default function TagihanPengurusPage() {
  const { user, ready } = useUser();

  if (!ready || !user) return null;

  if (!can(user, "ipl.bayar")) {
    return (
      <div className="page-stack">
        <div className="portal-empty-notice">
          <ReceiptText size={32} />
          <p><strong>Tidak ada tagihan pribadi</strong></p>
          <p>Akun Anda tidak terhubung ke unit rumah mana pun. Hubungi pengurus cluster.</p>
        </div>
      </div>
    );
  }

  return <WargaIuranView user={user} />;
}
