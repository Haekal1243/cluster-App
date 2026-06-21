import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Login from './Pages/Login'; 
import PersonalData from './Pages/RegisterPage/PersonalData'; 
import AccountInfo from './Pages/RegisterPage/AccountInfo'; // <-- Import halaman baru

import './App.css'; 

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<PersonalData />} />
        {/* Tambahkan rute Account Info di sini */}
        <Route path="/account-info" element={<AccountInfo />} /> 
      </Routes>
    </Router>
  );
}

export default App;