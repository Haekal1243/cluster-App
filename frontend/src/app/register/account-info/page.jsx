"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

    const payload = {
      nama: personalData.fullName,
      no_hp: personalData.phoneNumber,
      rt: personalData.rt,
      blokRumah: personalData.blokRumah,
      email: accountData.email,
      password: accountData.password,
    };

    try {
      const response = await fetch("http://localhost:3000/warga", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Gagal menyimpan data ke database",
        );
      }

      const result = await response.json();
      console.log("BERHASIL DISIMPAN:", result);

      sessionStorage.removeItem("registerPersonalData");
      alert("Registrasi Selesai! Akun berhasil dibuat.");
      router.push("/");
    } catch (error) {
      console.error("ERROR API:", error);
      alert(`Terjadi kesalahan: ${error.message}`);
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
    <div className="register-container">
      <div className="register-card">
        <div className="register-left">
          <img
            src="/LogoTopaz.svg"
            alt="Topaz Cluster Logo"
            className="register-logo"
          />
        </div>

        <div className="register-right">
          <div className="register-header">
            <h2>Create Account</h2>
            <p>Join the Permata Cimanggis Topaz Cluster Community</p>
          </div>

          <div className="register-content-split">
            <div className="stepper-box">
              <div className="step inactive">
                <div className="step-dot" />
                <span className="step-label">Personal Data</span>
              </div>
              <div className="step-line" />
              <div className="step active">
                <div className="step-dot" />
                <span className="step-label">Account Info</span>
              </div>
            </div>

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
                    <button
                      type="button"
                      className="btn-back"
                      onClick={handleBack}
                    >
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
        </div>
      </div>
    </div>
  );
}
