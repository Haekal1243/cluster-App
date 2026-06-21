import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../RegisterPage/PersonalData.css'; 
import topazLogo from '../../assets/LogoTopaz.svg';

const AccountInfo = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const personalData = location.state || {}; 

  const [accountData, setAccountData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    setAccountData({
      ...accountData,
      [e.target.name]: e.target.value
    });
  };

  const handleBack = () => {
    navigate('/register');
  };

  const handleFinish = async (e) => {
    e.preventDefault();
    
    // 1. Validasi Ekstra: Pastikan password konfirmasi cocok
    if (accountData.password !== accountData.confirmPassword) {
      alert("Password dan Confirm Password tidak cocok!");
      return;
    }

    // 2. Format Data (Payload)
    // PERUBAHAN: Menghapus 'alamat' dan menggantinya dengan 'rt' dan 'blokRumah'
    const payload = {
      nama: personalData.fullName,
      no_hp: personalData.phoneNumber,
      rt: personalData.rt,              // <-- Sesuai dengan state baru di PersonalData
      blokRumah: personalData.blokRumah, // <-- Sesuai dengan state baru di PersonalData
      email: accountData.email,
      password: accountData.password,
    };

    try {
      // 3. Tembak API Backend NestJS
      const response = await fetch('http://localhost:3000/warga', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // 4. Cek apakah respon dari backend berhasil (Status 200/201)
      if (!response.ok) {
        // Mengambil pesan error dari backend jika ada
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal menyimpan data ke database');
      }

      const result = await response.json();
      console.log('BERHASIL DISIMPAN:', result);
      
      alert('Registrasi Selesai! Akun berhasil dibuat.');
      
      // 5. Lempar user kembali ke halaman Login
      navigate('/');

    } catch (error) {
      console.error('ERROR API:', error);
      alert(`Terjadi kesalahan: ${error.message}`);
    }
  };

  // Logika Pengecekan: Tombol mati jika salah satu field kosong
  const isFinishDisabled = !accountData.email.trim() || !accountData.password.trim() || !accountData.confirmPassword.trim();

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
              <div className="step inactive">
                <div className="step-dot"></div>
                <span className="step-label">Personal Data</span>
              </div>
              <div className="step-line"></div>
              <div className="step active">
                <div className="step-dot"></div>
                <span className="step-label">Account Info</span>
              </div>
            </div>

            <div className="form-box">
              <div className="form-box-header">Account Info</div>
              
              <div className="form-box-body">
                <form>
                  <div className="form-group">
                    <label>Email Address <span className="required-star">*</span></label>
                    <input type="email" name="email" className="form-control" value={accountData.email} onChange={handleChange} />
                  </div>

                  <div className="form-group">
                    <label>Password <span className="required-star">*</span></label>
                    <input type="password" name="password" className="form-control" value={accountData.password} onChange={handleChange} />
                  </div>

                  <div className="form-group">
                    <label>Confirm Password <span className="required-star">*</span></label>
                    <input type="password" name="confirmPassword" className="form-control" value={accountData.confirmPassword} onChange={handleChange} />
                  </div>

                  <div className="form-actions">
                    <button type="button" className="btn-back" onClick={handleBack}>Back</button>
                    <button type="button" className="btn-next" onClick={handleFinish} disabled={isFinishDisabled}>Finish</button>
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

export default AccountInfo;