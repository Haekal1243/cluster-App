"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { showMessage } from "@/lib/message";
import { isValidEmail, isValidPassword } from "@/lib/validators";

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
      showMessage(
        "Data Tidak Lengkap",
        "Data personal belum ditemukan. Silakan ulangi registrasi.",
        "error",
      );
      router.push("/register");
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

    try {
      const response = await fetch("http://localhost:4000/warga", {
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
      await showMessage(
        "Registrasi Selesai!",
        "Akun berhasil dibuat.",
        "success",
      );
      router.push("/");
    } catch (error) {
      console.error("ERROR API:", error);
      showMessage("Terjadi Kesalahan", error.message, "error");
    }
  };

  const showEmailError =
    accountData.email.trim() !== "" && !isValidEmail(accountData.email);

  const showPasswordError =
    accountData.password !== "" && !isValidPassword(accountData.password);

  const isFinishDisabled =
    !isValidEmail(accountData.email) ||
    !isValidPassword(accountData.password) ||
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
                    {showEmailError && (
                      <span className="field-error">
                        Format email tidak valid
                      </span>
                    )}
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
                    {showPasswordError && (
                      <span className="field-error">
                        Password minimal 6 karakter
                      </span>
                    )}
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
