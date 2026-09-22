"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { showConfirm } from "@/lib/message";
import { wargaApi } from "@/lib/api";
import { areaLabel } from "@/lib/session";
import AuthShell from "@/components/auth/AuthShell";
import RegisterStepper from "@/components/auth/RegisterStepper";

const RT_OPTIONS = ["RT_01", "RT_02", "RT_03", "RT_04"];

export default function DataDiriPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    namaUser: "",
    noTelp: "",
    rt: "",
    rumahId: "",
  });
  const [rumahKosong, setRumahKosong] = useState([]);
  const [loadingRumah, setLoadingRumah] = useState(false);

  useEffect(() => {
    if (!formData.rt) {
      setRumahKosong([]);
      return;
    }
    let cancelled = false;
    setLoadingRumah(true);
    setFormData((prev) => ({ ...prev, rumahId: "" }));
    wargaApi
      .getRumahKosong(formData.rt)
      .then((data) => { if (!cancelled) setRumahKosong(data || []); })
      .catch(() => { if (!cancelled) setRumahKosong([]); })
      .finally(() => { if (!cancelled) setLoadingRumah(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.rt]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === "noTelp") {
      const numericValue = value.replace(/\D/g, "");
      if (numericValue.length > 13) return;
      setFormData((prev) => ({ ...prev, [name]: numericValue }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNext = (event) => {
    event.preventDefault();
    sessionStorage.setItem("registerDataDiri", JSON.stringify(formData));
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

  const isNextDisabled =
    !formData.namaUser.trim() ||
    !formData.noTelp.trim() ||
    !formData.rt ||
    !formData.rumahId;

  return (
    <AuthShell
      left={<img src="/LogoTopaz.svg" alt="Topaz Cluster Logo" className="auth-logo" />}
      title="Daftar Akun"
      subtitle="Bergabung dengan portal warga Cluster Topaz"
    >
      <div className="register-content-split">
        <RegisterStepper activeStep={1} />

        <div className="form-box">
          <div className="form-box-header">Data Diri</div>

          <div className="form-box-body">
            <form>
              <div className="form-group">
                <label htmlFor="namaUser">
                  Nama Lengkap <span className="required-star">*</span>
                </label>
                <input
                  id="namaUser"
                  type="text"
                  name="namaUser"
                  className="form-control"
                  value={formData.namaUser}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="noTelp">
                  Nomor HP <span className="required-star">*</span>
                </label>
                <input
                  id="noTelp"
                  type="tel"
                  name="noTelp"
                  className="form-control"
                  value={formData.noTelp}
                  onChange={handleChange}
                  maxLength="13"
                  placeholder="081234567890"
                />
                <span className="field-hint">Nomor HP ini jadi nama pengguna untuk masuk.</span>
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
                    <option value="" disabled hidden>Pilih RT</option>
                    {RT_OPTIONS.map((rt) => (
                      <option key={rt} value={rt}>{areaLabel(rt)}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group blok-section">
                  <label htmlFor="rumahId">
                    Blok Rumah <span className="required-star">*</span>
                  </label>
                  <select
                    id="rumahId"
                    name="rumahId"
                    className={`form-control custom-select ${formData.rumahId === "" ? "is-placeholder" : ""}`}
                    value={formData.rumahId}
                    onChange={handleChange}
                    disabled={!formData.rt || loadingRumah}
                  >
                    <option value="" disabled hidden>
                      {!formData.rt ? "Pilih RT dulu" : loadingRumah ? "Memuat…" : "Pilih Blok"}
                    </option>
                    {rumahKosong.map((r) => (
                      <option key={r.id} value={r.id}>{r.blokRumah}</option>
                    ))}
                  </select>
                  {formData.rt && !loadingRumah && rumahKosong.length === 0 && (
                    <span className="field-hint" style={{ color: "var(--danger, #dc2626)" }}>
                      Tidak ada blok kosong di RT ini. Hubungi pengurus RT.
                    </span>
                  )}
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-back" onClick={handleBack}>
                  Batal
                </button>
                <button type="button" className="btn-next" onClick={handleNext} disabled={isNextDisabled}>
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
