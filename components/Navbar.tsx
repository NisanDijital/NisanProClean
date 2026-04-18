import React from 'react';
import { CONTACT_INFO, NAV_LINKS } from '../constants';

const Navbar: React.FC = () => {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 flex justify-center py-6 px-4">
      <div className="glass rounded-[2rem] px-6 py-3 flex items-center gap-4 lg:gap-8 shadow-2xl max-w-5xl w-full justify-between animate-fade-in-down">
        
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-surface-dark border border-primary/30 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(45,212,191,0.3)]">
            <span className="material-symbols-outlined text-[24px]">chair</span>
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-primary font-black tracking-wider text-xl leading-none mb-0.5">NiSAN</span>
            <span className="text-white font-medium tracking-[0.2em] text-[9px] leading-none">PROCLEAN</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <a 
              key={link.name} 
              href={link.href} 
              className="text-sm font-medium text-gray-300 hover:text-primary transition-colors"
            >
              {link.name}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <a 
            href={CONTACT_INFO.phoneLink} 
            data-analytics-source="navbar_call"
            className="hidden lg:flex items-center gap-2 text-white font-bold hover:text-primary transition-colors text-sm"
          >
            <span className="material-symbols-outlined text-primary text-[20px]">call</span>
            {CONTACT_INFO.phone}
          </a>
          
          <div className="flex flex-col items-center">
            <a 
              href="#contact"
              className="relative overflow-hidden bg-primary hover:bg-cyan-600 text-white text-sm font-bold px-5 py-2.5 rounded-full transition-all duration-300 transform hover:scale-105 shadow-[0_0_20px_rgba(6,182,212,0.4)] block text-center group"
            >
              <span className="relative z-10">Fiyat Teklifi Al</span>
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shine z-0"></div>
            </a>
            <a 
              href={CONTACT_INFO.whatsappLink}
              data-analytics-source="navbar_whatsapp"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 mt-1 text-[10px] text-green-400 hover:text-green-300 transition-colors font-medium"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="size-3">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-2.846-.848-.919-.386-1.526-1.297-1.603-1.407-.076-.11-1.007-1.286-1.007-2.422 0-1.136.631-1.694.853-1.919.224-.225.465-.282.619-.282.155 0 .31.003.45.003.141.001.328-.052.513.385.188.441.643 1.558.697 1.673.054.115.088.249.014.4-.074.153-.112.247-.222.378-.11.13-.23.272-.328.368-.11.109-.224.226-.096.446.128.219.57.928 1.222 1.508.826.736 1.526.967 1.742 1.077.216.11.344.093.473-.046.129-.14.549-.636.696-.855.147-.219.294-.183.496-.108.201.076 1.272.6 1.489.709.217.109.361.163.415.257.054.095.054.547-.09 1.953z"/>
              </svg>
              {CONTACT_INFO.whatsapp}
            </a>
          </div>

        </div>

      </div>
    </nav>
  );
};

export default Navbar;
