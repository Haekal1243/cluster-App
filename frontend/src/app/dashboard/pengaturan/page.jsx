"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, KeyRound, LogOut } from "lucide-react";
import GantiPasswordModal from "@/components/auth/GantiPasswordModal";
import { areaLabel, clearSession, pakaiMenuBawah } from "@/lib/session";
import { showConfirm } from "@/lib/message";
import { useUser } from "@/lib/useUser";

export default function PengaturanPage() {
  const router = useRouter();
  const { user, ready } = useUser();
  const [gantiPassword, setGantiPassword] = useState(false);

  useEffect(() => {
    if (!ready || !user) return;
    if (!pakaiMenuBawah(user) || window.innerWidth >= 900) router.replace("/dashboard");
  }, [ready, user, router]);

  if (!ready || !user || !pakaiMenuBawah(user)) return null;

  const keluar = async () => {
    const ya = await showConfirm("Keluar dari akun?", "Kamu akan kembali ke halaman masuk.", "warning", "Ya, keluar", "Batal");
    if (!ya) return;
    clearSession();
    router.replace("/login");
  };

  return (
    <div className="page-stack">
      <div className="pengaturan-profil">
        <div>
          <strong>{user.nama}</strong>
          <span>{user.roleNama}{user.area ? ` · ${areaLabel(user.area)}` : ""}</span>
        </div>
      </div>

      <div className="pengaturan-daftar">
        <button type="button" className="pengaturan-baris" onClick={() => setGantiPassword(true)}>
          <KeyRound size={19} />
          <span>Ganti Password</span>
          <ChevronRight size={18} className="pengaturan-panah" />
        </button>
        <button type="button" className="pengaturan-baris pengaturan-keluar" onClick={keluar}>
          <LogOut size={19} />
          <span>Keluar</span>
        </button>
      </div>

      {gantiPassword && <GantiPasswordModal onClose={() => setGantiPassword(false)} />}
    </div>
  );
}
