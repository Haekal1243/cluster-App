"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Wallet, CalendarCheck, AlertTriangle } from "lucide-react";

const STATS = [
  { label: "Total Warga", value: "128", icon: Users, tone: "info" },
  { label: "Iuran Lunas Bulan Ini", value: "94", icon: Wallet, tone: "success" },
  { label: "Menunggu Konfirmasi", value: "12", icon: AlertTriangle, tone: "warning" },
  { label: "Kegiatan Berjalan", value: "3", icon: CalendarCheck, tone: "purple" },
];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Cek sesi login saat halaman dimuat
  useEffect(() => {
    const sessionUser = localStorage.getItem("user");
    if (!sessionUser) {
      router.replace("/login"); 
    } else {
      try {
        setUser(JSON.parse(sessionUser));
      } catch {
        router.replace("/login");
      }
      setIsCheckingAuth(false);
    }
  }, [router]);

  // Tampilkan loading state kosong sementara mengecek auth agar UI tidak berkedip
  if (isCheckingAuth) return null; 

  const userName = user?.nama || user?.name || "Admin";

  return (
    <div className="page-stack">
      <section className="welcome-banner">
        <div>
          {/* Menampilkan nama user dinamis berdasarkan data login */}
          <h2>Selamat datang kembali, {userName} 👋</h2>
          <p>Ini ringkasan aktivitas cluster Topaz hari ini.</p>
        </div>
      </section>

      <section className="stat-grid">
        {STATS.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className={`stat-card tone-${tone}`}>
            <div className="stat-card-icon">
              <Icon size={20} />
            </div>
            <div className="stat-card-body">
              <span className="stat-card-value">{value}</span>
              <span className="stat-card-label">{label}</span>
            </div>
          </div>
        ))}
      </section>

      <section className="content-card">
        <h3>Informasi Sistem</h3>
        <p>
          Dashboard ini sekarang sudah dilindungi. Hanya user yang melakukan login melalui
          halaman sign in yang dapat melihat halaman ini. Jika user melakukan logout,
          sesi akan dihapus dan akses ke halaman ini akan diblokir kembali.
        </p>
      </section>
    </div>
  );
}