// frontend/src/Pages/Login.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom'; // <-- 1. Tambahkan import Link ini
import './Login.css';
import topazLogo from '../assets/LogoTopaz.svg';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault(); 
    console.log('Mencoba login dengan:', { email, password });
    alert(`Mencoba login dengan email: ${email}.`);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        
        <div className="login-left">
          <img src={topazLogo} alt="Topaz Cluster Logo" className="login-logo" />
        </div>

        <div className="login-right">
          <div className="welcome-section">
            <h2>Welcome Back</h2>
            <p>Please sign in to your Account continue</p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* ... (Bagian input Email, Password, dan Remember me tidak ada yang berubah) ... */}
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input 
                type="email" id="email" className="form-control" placeholder="Email" 
                value={email} onChange={(e) => setEmail(e.target.value)} required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input 
                type="password" id="password" className="form-control" placeholder="*********" 
                value={password} onChange={(e) => setPassword(e.target.value)} required
              />
            </div>

            <div className="options-row">
              <div className="remember-me">
                <input type="checkbox" id="remember" />
                <label htmlFor="remember">Remember me</label>
              </div>
              <a href="#" className="forgot-password">Forgot Password?</a>
            </div>

            <button type="submit" className="btn-sign-in">Sign In</button>
          </form>

          {/* <-- 2. UBAH BAGIAN INI --> */}
          <div className="register-section">
            Don't have an account? <Link to="/register" className="register-link">Register here</Link>
          </div>
          {/* <-------------------------> */}
          
        </div>
      </div>
    </div>
  );
};

export default Login;