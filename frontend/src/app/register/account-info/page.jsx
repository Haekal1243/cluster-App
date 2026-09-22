"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import RegisterStepper from "@/components/auth/RegisterStepper";
import { showMessage } from "@/lib/message";
import { wargaApi } from "@/lib/api";

export default function AkunPage() {
  const router = useRouter();
  const [dataDiri, setDataDiri] = useState(null);

  const [accountData, setAccountData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const storedValue = sessionStorage.getItem("registerDataDiri");
    if (!storedValue) {
      router.replace("/register");
      return;
    }
    setDataDiri(JSON.parse(storedValue));
  }, [router]);

  const handleChange = (event) => {
    setAccountData((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleBack = () => {
    router.push("/register");
  };

  const handleFinish = async (event) => {
    event.preventDefault();

    if (!dataDiri) {
      showMessage("Data Tidak Lengkap", "Data diri belum ditemukan. Silakan ulangi registrasi.", "error")
        .then(() => router.push("/register"));
      return;
    }

    if (accountData.password.length < 6) {
      showMessage("Kata Sandi Terlalu Pendek", "Kata sandi minimal 6 karakter.", "warning");
      return;
    }
    if (accountData.password !== accountData.confirmPassword) {
      showMessage("Kata Sandi Tidak Cocok", "Kata sandi dan konfirmasi tidak cocok.", "warning");
      return;
    }

    setIsLoading(true);
    try {
      const res = await wargaApi.daftarMandiri({
        namaUser: dataDiri.namaUser,
        noTelp: dataDiri.noTelp,
        rt: dataDiri.rt,
        rumahId: Number(dataDiri.rumahId),
        email: accountData.email || undefined,
        password: accountData.password,
      });

      sessionStorage.removeItem("registerDataDiri");
      await showMessage(
        "Pendaftaran Terkirim",
        res.message || "Pendaftaran kamu menunggu persetujuan pengurus RT. Kamu akan bisa masuk setelah disetujui.",
        "success",
      );
      router.push("/login");
    } catch (error) {
      showMessage("Pendaftaran Gagal", error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const isFinishDisabled = !accountData.password.trim() || !accountData.confirmPassword.trim();

  if (!dataDiri) {
    return (
      <div className="register-container">
        <div className="loading-card">Memuat data pendaftaran...</div>
      </div>
    );
  }

  return (
    <AuthShell
      left={<img src="/LogoTopaz.svg" alt="Topaz Cluster Logo" className="auth-logo" />}
      title="Daftar Akun"
      subtitle="Bergabung dengan portal warga Cluster Topaz"
    >
      <div className="register-content-split">
        <RegisterStepper activeStep={2} />

        <div className="form-box">
          <div className="form-box-header">Buat Akun</div>

          <div className="form-box-body">
            <form>
              <div className="form-group">
                <label htmlFor="email">Email <span className="field-hint">(opsional)</span></label>
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
                  Kata Sandi <span className="required-star">*</span>
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
                    minLength={6}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">
                  Konfirmasi Kata Sandi <span className="required-star">*</span>
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

              <p className="field-hint">
                Pendaftaran akan masuk status <strong>Menunggu Persetujuan</strong> pengurus RT
                sebelum kamu bisa masuk.
              </p>

              <div className="form-actions">
                <button type="button" className="btn-back" onClick={handleBack}>
                  Kembali
                </button>
                <button
                  type="button"
                  className="btn-next"
                  onClick={handleFinish}
                  disabled={isFinishDisabled || isLoading}
                >
                  {isLoading ? "Mengirim..." : "Kirim Pendaftaran"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}
