"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, User, Lock } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import { authApi } from "@/lib/api";
import { saveUser, setToken } from "@/lib/session";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    try {
      // Login pakai username (default no HP) dan password; akun dibuatkan pengurus RT.
      const data = await authApi.login({ username: username.trim(), password });

      // Simpan data user (termasuk hak akses) dan token sesuai "Ingat saya"
      saveUser(data.user);
      setToken(data.token, remember);

      // Semua role masuk ke /dashboard — menu dan tampilan menyesuaikan hak akses
      router.push("/dashboard");
    } catch (error) {
      setErrorMsg(error.message || "Nama pengguna atau kata sandi salah");
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
          <label htmlFor="username">Nama Pengguna / No. HP</label>
          <div className="input-wrapper">
            <User className="input-icon" />
            <input
              type="text"
              id="username"
              className="form-control with-icon"
              placeholder="Nama pengguna atau nomor HP"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
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
              autoComplete="current-password"
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
        </div>

        <button type="submit" className="btn-sign-in" disabled={isLoading}>
          {isLoading ? "Memeriksa..." : "Masuk"}
        </button>
      </form>

      <div className="register-section">
        Belum punya akun? <Link href="/register">Daftar di sini</Link>.
        <br />
        Lupa kata sandi? Hubungi sekretaris / ketua RT Anda.
      </div>
    </AuthShell>
  );
}