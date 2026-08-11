"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import RegisterStepper from "@/components/auth/RegisterStepper";
import { showMessage } from "@/lib/message";

export default function AccountInfoPage() {
  const router = useRouter();
  const [personalData, setPersonalData] = useState(null);

  const [accountData, setAccountData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const storedValue = sessionStorage.getItem("registerPersonalData");

    if (!storedValue) {
      router.replace("/register");
      return;
    }

    setPersonalData(JSON.parse(storedValue));
  }, [router]);

  const handleChange = (event) => {
    setAccountData({
      ...accountData,
      [event.target.name]: event.target.value,
    });
  };

  const handleBack = () => {
    router.push("/register");
  };

  const handleFinish = async (event) => {
    event.preventDefault();

    if (!personalData) {
      showMessage(
        "Data Tidak Lengkap",
        "Data personal belum ditemukan. Silakan ulangi registrasi.",
        "error",
      ).then(() => {
        router.push("/register");
      });
      return;
    }

    if (accountData.password !== accountData.confirmPassword) {
      showMessage(
        "Password Tidak Cocok",
        "Password dan Confirm Password tidak cocok!",
        "warning",
      );
      return;
    }

    const payload = {
      nama: personalData.fullName,
      no_hp: personalData.phoneNumber,
      rt: personalData.rt,
      blokRumah: personalData.blokRumah,
      email: accountData.email,
      password: accountData.password,
    };

    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:3000/warga", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 409) {
          showMessage(
            "Email Sudah Terdaftar",
            errorData.message || "Email ini sudah digunakan. Silakan gunakan email lain.",
            "error",
          );
        } else {
          showMessage(
            "Registrasi Gagal",
            errorData.message || "Terjadi kesalahan saat registrasi. Silakan coba lagi.",
            "error",
          );
        }
        return;
      }

      sessionStorage.removeItem("registerPersonalData");
      showMessage(
        "Registrasi Berhasil",
        "Akun Anda berhasil dibuat. Silakan login.",
        "success",
      ).then(() => {
        router.push("/");
      });
    } catch (error) {
      showMessage(
        "Koneksi Gagal",
        "Tidak dapat terhubung ke server. Pastikan server backend berjalan.",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isFinishDisabled =
    !accountData.email.trim() ||
    !accountData.password.trim() ||
    !accountData.confirmPassword.trim();

  if (!personalData) {
    return (
      <div className="register-container">
        <div className="loading-card">Memuat data registrasi...</div>
      </div>
    );
  }

  return (
    <AuthShell
      left={
        <img
          src="/LogoTopaz.svg"
          alt="Topaz Cluster Logo"
          className="auth-logo"
        />
      }
      title="Create Account"
      subtitle="Join the Permata Cimanggis Topaz Cluster Community"
    >
      <div className="register-content-split">
        <RegisterStepper activeStep={2} />

        <div className="form-box">
          <div className="form-box-header">Account Info</div>

          <div className="form-box-body">
            <form>
              <div className="form-group">
                <label htmlFor="email">
                  Email Address <span className="required-star">*</span>
                </label>
                <div className="input-wrapper">
                  <Mail className="input-icon" />
                  <input
                    id="email"
                    type="email"
                    name="email"
                    className="form-control with-icon"
                    value={accountData.email}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password">
                  Password <span className="required-star">*</span>
                </label>
                <div className="input-wrapper">
                  <Lock className="input-icon" />
                  <input
                    id="password"
                    type="password"
                    name="password"
                    className="form-control with-icon"
                    value={accountData.password}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">
                  Confirm Password <span className="required-star">*</span>
                </label>
                <div className="input-wrapper">
                  <Lock className="input-icon" />
                  <input
                    id="confirmPassword"
                    type="password"
                    name="confirmPassword"
                    className="form-control with-icon"
                    value={accountData.confirmPassword}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-back" onClick={handleBack}>
                  Back
                </button>
                <button
                  type="button"
                  className="btn-next"
                  onClick={handleFinish}
                  disabled={isFinishDisabled || isLoading}
                >
                  {isLoading ? "Menyimpan..." : "Finish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}
