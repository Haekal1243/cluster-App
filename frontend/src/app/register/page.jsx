"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { showConfirm } from "@/lib/message";
import { isValidFullName, isValidPhoneNumber } from "@/lib/validators";

export default function PersonalDataPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    rt: "",
    blokRumah: "",
  });

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
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
      router.push("/");
    }
  };

  const showFullNameError =
    formData.fullName.trim() !== "" && !isValidFullName(formData.fullName);

  const showPhoneNumberError =
    formData.phoneNumber.trim() !== "" &&
    !isValidPhoneNumber(formData.phoneNumber);

  const isNextDisabled =
    !isValidFullName(formData.fullName) ||
    !isValidPhoneNumber(formData.phoneNumber) ||
    !formData.rt ||
    !formData.blokRumah.trim();

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
              <div className="step active">
                <div className="step-dot" />
                <span className="step-label">Personal Data</span>
              </div>
              <div className="step-line" />
              <div className="step inactive">
                <div className="step-dot" />
                <span className="step-label">Account Info</span>
              </div>
            </div>

            <div className="form-box">
              <div className="form-box-header">Personal Data</div>

              <div className="form-box-body">
                <form>
                  <div className="form-group">
                    <label htmlFor="fullName">
                      Full Name <span className="required-star">*</span>
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      name="fullName"
                      className="form-control"
                      value={formData.fullName}
                      onChange={handleChange}
                    />
                    {showFullNameError && (
                      <span className="field-error">
                        Nama hanya boleh berisi huruf dan spasi (min. 3
                        karakter)
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="phoneNumber">
                      Phone Number <span className="required-star">*</span>
                    </label>
                    <input
                      id="phoneNumber"
                      type="tel"
                      name="phoneNumber"
                      className="form-control"
                      value={formData.phoneNumber}
                      onChange={handleChange}
                    />
                    {showPhoneNumberError && (
                      <span className="field-error">
                        Format nomor HP tidak valid (contoh: 08123456789)
                      </span>
                    )}
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
                        placeholder="Contoh: E13/19"
                        value={formData.blokRumah}
                        onChange={handleChange}
                      />
                    </div>
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
                      onClick={handleNext}
                      disabled={isNextDisabled}
                    >
                      Next &rarr;
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
