"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { showConfirm } from "@/lib/message";
import AuthShell from "@/components/auth/AuthShell";
import RegisterStepper from "@/components/auth/RegisterStepper";

const BLOK_RUMAH_REGEX = /^E\d{1,2}\/\d{1,2}$/;

export default function PersonalDataPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    rt: "",
    blokRumah: "",
  });

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === "phoneNumber") {
      const numericValue = value.replace(/\D/g, "");
      if (numericValue.length > 13) return;
      setFormData({
        ...formData,
        [name]: numericValue,
      });
      return;
    }

    if (name === "blokRumah") {
      setFormData({
        ...formData,
        [name]: value.toUpperCase(),
      });
      return;
    }

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleNext = (event) => {
    event.preventDefault();
    sessionStorage.setItem("registerPersonalData", JSON.stringify(formData));
    router.push("/register/account-info");
  };

  const handleBack = async () => {
    const ok = await showConfirm(
      "Batalkan Registrasi?",
      "Data yang sudah diisi akan hilang.",
      "warning",
      "Ya, batalkan",
      "Lanjut isi",
    );
    if (ok) {
      router.push("/login");
    }
  };

  const showBlokError =
    formData.blokRumah.trim() !== "" && !BLOK_RUMAH_REGEX.test(formData.blokRumah);

  const isNextDisabled =
    !formData.fullName.trim() ||
    !formData.phoneNumber.trim() ||
    !formData.rt ||
    !BLOK_RUMAH_REGEX.test(formData.blokRumah);

  return (
    <AuthShell
      left={
        <img
          src="/LogoTopaz.svg"
          alt="Topaz Cluster Logo"
          className="auth-logo"
        />
      }
      title="Buat Akun"
      subtitle="Bergabung dengan Komunitas Permata Cimanggis Topaz Cluster"
    >
      <div className="register-content-split">
        <RegisterStepper activeStep={1} />

        <div className="form-box">
          <div className="form-box-header">Data Diri</div>

          <div className="form-box-body">
            <form>
              <div className="form-group">
                <label htmlFor="fullName">
                  Nama Lengkap <span className="required-star">*</span>
                </label>
                <input
                  id="fullName"
                  type="text"
                  name="fullName"
                  className="form-control"
                  value={formData.fullName}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="phoneNumber">
                  Nomor Telepon <span className="required-star">*</span>
                </label>
                <input
                  id="phoneNumber"
                  type="tel"
                  name="phoneNumber"
                  className="form-control"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  maxLength="13"
                />
              </div>

              <div className="address-row">
                <div className="form-group rt-section">
                  <label htmlFor="rt">
                    RT <span className="required-star">*</span>
                  </label>
                  <select
                    id="rt"
                    name="rt"
                    className={`form-control custom-select ${formData.rt === "" ? "is-placeholder" : ""}`}
                    value={formData.rt}
                    onChange={handleChange}
                  >
                    <option value="" disabled hidden>
                      Pilih RT
                    </option>
                    <option value="RT_01">RT 01</option>
                    <option value="RT_02">RT 02</option>
                    <option value="RT_03">RT 03</option>
                    <option value="RT_04">RT 04</option>
                  </select>
                </div>

                <div className="form-group blok-section">
                  <label htmlFor="blokRumah">
                    Blok Rumah <span className="required-star">*</span>
                  </label>
                  <input
                    id="blokRumah"
                    type="text"
                    name="blokRumah"
                    className="form-control"
                    placeholder="Cth: E13/19"
                    value={formData.blokRumah}
                    onChange={handleChange}
                  />
                  {showBlokError && (
                    <span className="field-error">
                      Format blok rumah harus seperti E7/15
                    </span>
                  )}
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-back" onClick={handleBack}>
                  Kembali
                </button>
                <button
                  type="button"
                  className="btn-next"
                  onClick={handleNext}
                  disabled={isNextDisabled}
                >
                  Lanjut &rarr;
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}
