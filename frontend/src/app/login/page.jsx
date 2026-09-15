// File: frontend/app/login/page.jsx (atau sesuaikan dengan struktur Next.js Anda)
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Lock } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import { API_BASE_URL } from "@/lib/api";
import { setToken } from "@/lib/session";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/warga/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Simpan data user ke localStorage, token disimpan sesuai "Ingat saya"
        localStorage.setItem("user", JSON.stringify(data.user));
        setToken(data.token, remember);

        // Semua role masuk ke /dashboard — tampilan dibedakan per-role di dalamnya
        router.push("/dashboard");
      } else {
        setErrorMsg(data.message || "Email atau password salah");
      }
    } catch (error) {
      setErrorMsg("Gagal terhubung ke server. Pastikan backend NestJS menyala.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      left={
        <>
          <Link
            href="/landingpage"
            className="btn-link-back auth-left-back"
          >
            <ArrowLeft size={16} />
            Kembali
          </Link>
          <img
            src="/LogoTopaz.svg"
            alt="Topaz Cluster Logo"
            className="auth-logo"
          />
        </>
      }
      title="Selamat Datang Kembali"
      subtitle="Silakan masuk ke akun Anda untuk melanjutkan"
    >
      <form onSubmit={handleSubmit}>
        {errorMsg && (
          <div style={{ padding: "10px", backgroundColor: "#fee2e2", color: "#dc2626", borderRadius: "6px", marginBottom: "15px", fontSize: "14px" }}>
            {errorMsg}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <div className="input-wrapper">
            <Mail className="input-icon" />
            <input
              type="email"
              id="email"
              className="form-control with-icon"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="password">Kata Sandi</label>
          <div className="input-wrapper">
            <Lock className="input-icon" />
            <input
              type="password"
              id="password"
              className="form-control with-icon"
              placeholder="*********"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
        </div>

        <div className="options-row">
          <div className="remember-me">
            <input
              type="checkbox"
              id="remember"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            <label htmlFor="remember">Ingat saya</label>
          </div>
          <a href="#" className="forgot-password">
            Lupa Password?
          </a>
        </div>

        <button type="submit" className="btn-sign-in" disabled={isLoading}>
          {isLoading ? "Memeriksa..." : "Masuk"}
        </button>
      </form>

      <div className="register-section">
        Belum punya akun?{" "}
        <Link href="/register" className="register-link">
          Daftar di sini
        </Link>
      </div>
    </AuthShell>
  );
}