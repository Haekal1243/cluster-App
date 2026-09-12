// File: frontend/app/login/page.jsx (atau sesuaikan dengan struktur Next.js Anda)
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    try {
      // Panggil API NestJS yang berjalan di port 4000
      const response = await fetch("http://localhost:4000/warga/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Jika login sukses, simpan data user ke localStorage
        localStorage.setItem("user", JSON.stringify(data.user));
        
        // Arahkan ke dashboard
        router.push("/dashboard");
      } else {
        // Tampilkan error dari NestJS (UnauthorizedException)
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
        <img
          src="/LogoTopaz.svg"
          alt="Topaz Cluster Logo"
          className="auth-logo"
        />
      }
      title="Welcome Back"
      subtitle="Please sign in to your Account to continue"
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
          <label htmlFor="password">Password</label>
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
            <input type="checkbox" id="remember" />
            <label htmlFor="remember">Remember me</label>
          </div>
          <a href="#" className="forgot-password">
            Forgot Password?
          </a>
        </div>

        <button type="submit" className="btn-sign-in" disabled={isLoading}>
          {isLoading ? "Memeriksa..." : "Sign In"}
        </button>
      </form>

      <div className="register-section">
        Don't have an account?{" "}
        <Link href="/register" className="register-link">
          Register here
        </Link>
      </div>
    </AuthShell>
  );
}