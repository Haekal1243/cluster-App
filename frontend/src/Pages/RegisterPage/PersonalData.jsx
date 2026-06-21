import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './PersonalData.css';
import topazLogo from '../../assets/LogoTopaz.svg';

const PersonalData = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    rt: '',        
    blokRumah: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleNext = (e) => {
    e.preventDefault();
    navigate('/account-info', { state: formData }); 
  };

  const handleBack = () => {
    navigate('/'); 
  };

  // Logika Pengecekan: Tombol mati jika salah satu field kosong
  const isNextDisabled = !formData.fullName.trim() || !formData.phoneNumber.trim() || !formData.rt || !formData.blokRumah.trim();

  return (
    <div className="register-container">
      <div className="register-card">
        
        <div className="register-left">
          <img src={topazLogo} alt="Topaz Cluster Logo" className="register-logo" />
        </div>

        <div className="register-right">
          <div className="register-header">
            <h2>Create Account</h2>
            <p>Join the Permata Cimanggis Topaz Cluster Community</p>
          </div>

          <div className="register-content-split">
            
            <div className="stepper-box">
              <div className="step active">
                <div className="step-dot"></div>
                <span className="step-label">Personal Data</span>
              </div>
              <div className="step-line"></div>
              <div className="step inactive">
                <div className="step-dot"></div>
                <span className="step-label">Account Info</span>
              </div>
            </div>

            <div className="form-box">
              <div className="form-box-header">Personal Data</div>
              
              <div className="form-box-body">
                <form>
                  <div className="form-group">
                    <label>Full Name <span className="required-star">*</span></label>
                    <input type="text" name="fullName" className="form-control" value={formData.fullName} onChange={handleChange} />
                  </div>

                  <div className="form-group">
                    <label>Phone Number <span className="required-star">*</span></label>
                    <input type="tel" name="phoneNumber" className="form-control" value={formData.phoneNumber} onChange={handleChange} />
                  </div>

                  {/* BARIS ALAMAT: RT & Blok Rumah Bersebelahan */}
                  <div className="address-row">
                    
                    {/* Bagian Kiri: Dropdown RT */}
                    <div className="form-group rt-section">
                      <label>RT <span className="required-star">*</span></label>
                      <select 
                        name="rt" 
                        className={`form-control custom-select ${formData.rt === '' ? 'is-placeholder' : ''}`} 
                        value={formData.rt} 
                        onChange={handleChange}
                      >
                        <option value="" disabled hidden>Pilih RT</option>
                        <option value="RT_01">RT 01</option>
                        <option value="RT_02">RT 02</option>
                        <option value="RT_03">RT 03</option>
                        <option value="RT_04">RT 04</option>
                      </select>
                    </div>

                    {/* Bagian Kanan: Input Blok Rumah */}
                    <div className="form-group blok-section">
                      <label>Blok Rumah <span className="required-star">*</span></label>
                      <input 
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
                    <button type="button" className="btn-back" onClick={handleBack}>Back</button>
                    <button type="button" className="btn-next" onClick={handleNext} disabled={isNextDisabled}>Next &rarr;</button>
                  </div>
                </form>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default PersonalData;