// src/Auth.jsx

import { useState } from 'react';
import { supabase } from './supabaseClient';
import './auth.css';

function Popup({ message, onClose }) {
  const isSuccess = !message.toLowerCase().includes("gagal");
  return (
    <div className="popup-overlay">
      <div className={`popup-box ${isSuccess ? "success" : "error"}`}>
        <div className="popup-header">
          <span className="popup-icon">{isSuccess ? "✔️" : "❌"}</span>
          <h2>{isSuccess ? "Sukses" : "Gagal"}</h2>
        </div>
        <p className="popup-message">{message}</p>
        <button className="popup-btn" onClick={onClose}>Oke</button>
      </div>
    </div>
  );
}

export default function Auth({ onLoginSuccess, mode = 'user' }) {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

   const login = async (e) => {
      e.preventDefault();
      setLoading(true);
      const email = e.target.email.value;
      const password = e.target.password.value;
  
      try {
        // Langkah 1: Coba login 
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw new Error("Email atau password salah.");
        
        if (authData.user) {
          // Langkah 2: Cek role
          if (mode === 'admin') {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', authData.user.id)
              .single();
            
            if (profileError) throw new Error("Gagal mengambil data profil.");
  
            if (profileData && profileData.role === 'admin') {
              onLoginSuccess(authData.session); // Lolos sebagai admin
            } else {
              throw new Error("Anda bukan admin."); // Tolak jika bukan admin
            }
          } else {
            onLoginSuccess(authData.session); // Lolos sebagai user biasa
          }
        }
      } catch (error) {
        setPopupMessage(`Login Gagal: ${error.message}`);
        
        // ✅ BARIS INI DIHAPUS. Tidak perlu logout paksa di sini
        // await supabase.auth.signOut(); 
        
      } finally {
        setLoading(false);
      }
    };
  const register = async (e) => {
    e.preventDefault();
    setLoading(true);
    const email = e.target.email.value;
    const password = e.target.password.value;
    
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setPopupMessage("Register Gagal: " + error.message);
    } else {
      setPopupMessage("Register berhasil! Silakan cek email Anda untuk konfirmasi.");
      setIsRegister(false);
    }
    setLoading(false);
  };
  
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      // Pastikan halaman ini ada di App.jsx Anda
      redirectTo: `${window.location.origin}/reset-password`
    });
    if (error) {
      setPopupMessage("Gagal kirim email: " + error.message);
    } else {
      setPopupMessage("Link reset password telah terkirim ke email Anda!");
      setShowReset(false);
    }
    setLoading(false);
  };

  if (showReset) {
    return (
      <div className="auth-page">
        <div className="auth-box">
          <h1>Reset Password</h1>
          <form onSubmit={handlePasswordReset}>
            <input type="email" name="email" placeholder="Masukkan email Anda" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required />
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Mengirim...' : 'Kirim Link Reset'}</button>
          </form>
          <p className="auth-switch"><a href="#" onClick={() => setShowReset(false)}>Kembali ke Login</a></p>
        </div>
        {popupMessage && <Popup message={popupMessage} onClose={() => setPopupMessage("")} />}
      </div>
    );
  }

  return (
    <>
      <div className="auth-page">
        <div className="auth-box">
          <h1>{mode === 'admin' ? 'Admin' : ''} {isRegister ? "Register" : "Login"}</h1>
          <form onSubmit={isRegister ? register : login}>
            <input type="email" name="email" placeholder="Email" required />
            <input type="password" name="password" placeholder="Password" required />
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Memproses...' : (isRegister ? "Daftar" : "Login")}
            </button>
          </form>

          {/* ✅ PERBAIKAN: Kondisi 'mode === user' dihapus agar link muncul di semua mode */}
          {!isRegister && (
            <p className="auth-forgot-password"><a href="#" onClick={() => setShowReset(true)}>Lupa Password?</a></p>
          )}

          <p className="auth-switch">
            {isRegister ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
            <a href="#" onClick={() => setIsRegister(!isRegister)}>
              {isRegister ? "Login di sini" : "Daftar di sini"}
            </a>
          </p>
        </div>
      </div>
      {popupMessage && <Popup message={popupMessage} onClose={() => setPopupMessage("")} />}
    </>
  );
}