"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import RegisterStepper from "@/components/auth/RegisterStepper";

export default function AccountInfoPage() {
  const router = useRouter();
  const [personalData, setPersonalData] = useState(null);

  const [accountData, setAccountData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

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
      alert("Data personal belum ditemukan. Silakan ulangi registrasi.");
      router.push("/register");
      return;
    }

    if (accountData.password !== accountData.confirmPassword) {
      alert("Password dan Confirm Password tidak cocok!");
      return;
    }

    sessionStorage.removeItem("registerPersonalData");
    alert("Registrasi Selesai! Silakan login dengan akun yang sudah dibuat.");
    router.push("/");
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
                <input
                  id="email"
                  type="email"
                  name="email"
                  className="form-control"
                  value={accountData.email}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">
                  Password <span className="required-star">*</span>
                </label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  className="form-control"
                  value={accountData.password}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">
                  Confirm Password <span className="required-star">*</span>
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  name="confirmPassword"
                  className="form-control"
                  value={accountData.confirmPassword}
                  onChange={handleChange}
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn-back" onClick={handleBack}>
                  Back
                </button>
                <button
                  type="button"
                  className="btn-next"
                  onClick={handleFinish}
                  disabled={isFinishDisabled}
                >
                  Finish
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}
