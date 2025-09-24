// src/Footer.jsx

import React from 'react';
import KancahLogo from './assets/Kampiun-Logo.png'; // Pastikan path logo benar

export default // Letakkan ini di dalam src/App.jsx, di atas `export default function App()`

function Footer() {
  const scrollToTop = (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="site-footer">
      <div className="footer-content container">
        {/* Kolom 1: Info Perusahaan */}
        <div className="footer-column footer-info">
          <div className="footer-logo">
            <img src={KancahLogo} alt="Kancah Logo" />
          </div>
          <div className="footer-contact-info">
            <p>
              <strong>Kancah Headquarter</strong><br />
              69VX+JFH, Sanggrahan, Condong Catur,<br />
              Depok, Sleman Regency,<br />
              Special Region of Yogyakarta 55281
            </p>
            <p>+62 895 2468 7866</p>
          </div>
        </div>

        {/* Kolom 2: Kategori */}
        <div className="footer-column footer-links">
          <h4>Kategori</h4>
          <ul>
            <li><a href="#">Berita</a></li>
            <li><a href="#">Literasi</a></li>
            <li><a href="#">Review</a></li>
            <li><a href="#">Komunitas</a></li>
            <li><a href="#">Data & Analisis</a></li>
          </ul>
        </div>

        {/* Kolom 3: Perusahaan */}
        <div className="footer-column footer-links">
          <h4>Perusahaan</h4>
          <ul>
            <li><a href="#">Tentang Kami</a></li>
            <li><a href="#">Redaksi</a></li>
            <li><a href="#">Pedoman Media Siber</a></li>
            <li><a href="#">Disclaimer</a></li>
            <li><a href="#">Kontak Kami</a></li>
            <li><a href="#">Karier</a></li>
            <li><a href="#">Profil & Rate Card</a></li>
          </ul>
        </div>

        {/* Kolom 4: Awards & Recognition (PASTIKAN INI ADA) */}
        <div className="footer-column footer-awards">
          <h4>Awards & Recognition</h4>
          <div className="awards-grid">
            <img src="https://via.placeholder.com/120x80/EEEEEE/000000?text=Award" alt="Award 1" />
            <img src="https://via.placeholder.com/120x80/EEEEEE/000000?text=Award" alt="Award 2" />
            <img src="https://via.placeholder.com/120x80/EEEEEE/000000?text=Award" alt="Award 3" />
            <img src="https://via.placeholder.com/120x80/EEEEEE/000000?text=Award" alt="Award 4" />
            <img src="https://via.placeholder.com/120x80/EEEEEE/000000?text=Award" alt="Award 5" />
            <img src="https://via.placeholder.com/120x80/EEEEEE/000000?text=Award" alt="Award 6" />
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container footer-bottom-content">
          <p className="copyright-text">
            Copyright © 2025 PT Kancah Media Sejahtera. All rights reserved.
          </p>
          <div className="social-links">
            <a href="#" aria-label="Facebook">F</a>
            <a href="#" aria-label="Twitter">X</a>
            <a href="#" aria-label="Instagram">i</a>
            <a href="#" aria-label="Line">L</a>
          </div>
        </div>
      </div>

    </footer>
  );
}