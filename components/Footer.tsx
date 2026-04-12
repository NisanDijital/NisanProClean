import React from 'react';
import { CONTACT_INFO } from '../constants';

const Footer: React.FC = () => {
  return (
    <footer className="bg-surface-dark border-t border-white/5 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-3 mb-6">
              <div className="size-10 rounded-xl bg-background-dark border border-primary/30 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(45,212,191,0.2)]">
                <span className="material-symbols-outlined text-[24px]">chair</span>
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-primary font-black tracking-wider text-xl leading-none mb-0.5">NiSAN</span>
                <span className="text-white font-medium tracking-[0.2em] text-[9px] leading-none">PROCLEAN</span>
              </div>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed mb-4">
              Afyonkarahisar'ın en güvenilir temizlik ekibi. Adli sicil kaydı temiz, profesyonel eğitimli personelimizle evinizin mahremiyetine saygı duyarak hizmet veriyoruz.
            </p>
            <div className="flex items-center gap-2 text-primary font-bold">
              <span className="material-symbols-outlined text-sm">phone</span>
              {CONTACT_INFO.phone}
            </div>

            {/* Social Media Icons */}
            <div className="flex gap-3 mt-6">
              <a 
                href="https://instagram.com/nisanproclean" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="size-10 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-gray-400 hover:bg-gradient-to-br hover:from-purple-600 hover:to-pink-600 hover:text-white hover:border-transparent transition-all duration-300 group" 
                aria-label="Instagram"
              >
                <svg fill="currentColor" viewBox="0 0 24 24" className="size-5">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a 
                href="#" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="size-10 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-gray-400 hover:bg-[#1877F2] hover:text-white hover:border-transparent transition-all duration-300" 
                aria-label="Facebook"
              >
                <svg fill="currentColor" viewBox="0 0 24 24" className="size-5">
                   <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/>
                </svg>
              </a>
               <a 
                href="#" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="size-10 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-gray-400 hover:bg-black hover:text-white hover:border-white/20 transition-all duration-300" 
                aria-label="Twitter"
              >
                <svg fill="currentColor" viewBox="0 0 24 24" className="size-4">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="text-white font-bold mb-6">Kurumsal</h4>
            <ul className="flex flex-col gap-3 text-gray-400 text-sm">
              <li><a href="#" className="hover:text-primary transition-colors">Hakkımızda</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Ekibimiz</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Referanslar</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">İletişim</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-bold mb-6">Hizmetlerimiz</h4>
            <ul className="flex flex-col gap-3 text-gray-400 text-sm">
              <li><a href="#" className="hover:text-primary transition-colors">Koltuk Yıkama</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Yatak Yıkama</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Araç Koltuk Yıkama</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Sandalye Yıkama</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-bold mb-6">Bülten</h4>
            <p className="text-gray-500 text-sm mb-4">Kampanyalardan haberdar olun.</p>
            <div className="flex gap-2">
              <input 
                type="email" 
                placeholder="E-posta adresi" 
                className="bg-background-dark border border-white/10 rounded-lg px-4 py-2 text-sm text-white w-full focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <button className="bg-primary hover:bg-cyan-600 text-white rounded-lg px-3 py-2 transition-colors">
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
        
        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-600 text-xs">© 2026 NisanProClean. Tüm hakları saklıdır.</p>
          <div className="flex flex-wrap justify-center gap-4 md:gap-6">
            <a href="#" className="text-gray-600 hover:text-white transition-colors text-xs">KVKK Aydınlatma Metni</a>
            <a href="#" className="text-gray-600 hover:text-white transition-colors text-xs">Gizlilik Politikası</a>
            <a href="#" className="text-gray-600 hover:text-white transition-colors text-xs">Kullanım Şartları</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;