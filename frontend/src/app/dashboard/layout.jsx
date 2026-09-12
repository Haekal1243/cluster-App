"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/layout/DashboardShell";

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Cek sesi login untuk seluruh halaman /dashboard/*, bukan cuma index-nya
  useEffect(() => {
    const sessionUser = localStorage.getItem("user");
    if (!sessionUser) {
      router.replace("/");
    } else {
      setIsCheckingAuth(false);
    }
  }, [router]);

  // Tampilkan kosong sementara mengecek auth agar UI tidak berkedip / bocor sebelum redirect
  if (isCheckingAuth) return null;

  return <DashboardShell>{children}</DashboardShell>;
}
