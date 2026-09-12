
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

  const handleSubmit = (event) => {
    event.preventDefault();
    router.push("/dashboard");
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
      subtitle="Please sign in to your Account continue"
    >
      <form onSubmit={handleSubmit} noValidate>
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

        <button type="submit" className="btn-sign-in">
          Sign In
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
