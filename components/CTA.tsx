import React from 'react';
import { CONTACT_INFO } from '../constants';

const CTA: React.FC = () => {
  return (
    <section id="contact" className="py-24 px-4 relative scroll-mt-24">
      <div className="max-w-4xl mx-auto text-center bg-gradient-to-br from-surface-dark to-background-dark border border-white/10 rounded-3xl p-12 md:p-20 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/20 blur-[80px] rounded-full"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-secondary/20 blur-[80px] rounded-full"></div>
        
        <div className="relative z-10 flex flex-col items-center gap-6">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-2">Kusursuz Temizliğe Hazır Mısınız?</h2>
          <p className="text-gray-400 text-lg max-w-lg mb-6">
            250+ mutlu müşteri arasına katılın. NisanProClean güvencesiyle koltuklarınız için en iyi bakımı bugün planlayın.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
            <a 
              href={CONTACT_INFO.whatsappLink}
              data-analytics-source="cta_whatsapp"
              target="_blank"
              rel="noopener noreferrer"
              className="relative overflow-hidden bg-primary hover:bg-cyan-600 text-white text-lg font-bold px-10 py-4 rounded-full transition-all duration-300 transform hover:scale-105 shadow-[0_0_30px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2 group"
            >
              <span className="relative z-10">Randevunuzu Oluşturun</span>
              <span className="material-symbols-outlined relative z-10">calendar_month</span>
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shine z-0"></div>
            </a>
            <a 
              href={CONTACT_INFO.phoneLink}
              data-analytics-source="cta_call"
              className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-lg font-bold px-10 py-4 rounded-full transition-all duration-300 transform hover:scale-105 border border-white/10 flex items-center justify-center gap-2"
            >
              <span>{CONTACT_INFO.phone}</span>
              <span className="material-symbols-outlined">call</span>
            </a>
          </div>
          
          <p className="text-xs text-gray-500 mt-4">Analiz ücretsizdir. Gizli ücret yok.</p>
        </div>
      </div>
    </section>
  );
};

export default CTA;
