import React from 'react';
import { CONTACT_INFO, IMAGES } from '../constants';

const Hero: React.FC = () => {
  return (
    <header className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-background-dark/30 via-background-dark/80 to-background-dark z-10"></div>
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-secondary/20 rounded-full blur-[100px] animate-float"></div>
        <div 
          className="w-full h-full bg-cover bg-center opacity-40" 
          style={{ backgroundImage: `url('${IMAGES.heroBg}')` }}
          aria-label="Purity and water abstract dark blue liquid waves"
        ></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 pt-32 md:pt-40 text-center flex flex-col items-center gap-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm mb-4">
          <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
          <span className="text-xs font-medium text-gray-300 uppercase tracking-widest">NisanProClean Profesyonelliği</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-white leading-[1.1] max-w-5xl mx-auto">
          Koltuklarınızda <br/>
          <span className="text-gradient-primary">Derinlemesine Hijyen</span>
        </h1>
        
        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto font-light leading-relaxed">
          Yapay zeka destekli analiz ve yüksek vakum teknolojisi ile koltuklarınızın dokusunu yeniliyoruz. NisanProClean ile gerçek temizliği keşfedin.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <a 
            href={CONTACT_INFO.phoneLink}
            className="group relative overflow-hidden flex items-center justify-center gap-3 bg-white text-background-dark px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-100 transition-all duration-300 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]"
          >
            <span className="relative z-10">{CONTACT_INFO.phone}</span>
            <span className="material-symbols-outlined transition-transform group-hover:rotate-12 relative z-10">call</span>
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-black/10 to-transparent animate-shine z-0"></div>
          </a>
          <a 
            href={CONTACT_INFO.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 px-8 py-4 rounded-full font-bold text-lg text-white border border-white/20 hover:bg-white/5 transition-all duration-300 backdrop-blur-sm"
          >
            <span className="material-symbols-outlined">photo_camera</span>
            <span>Instagram'da Bizi İzleyin</span>
          </a>
        </div>

        {/* Trust Badge (Customer Perspective) */}
        <div className="flex items-center gap-3 mt-6 text-sm text-gray-400">
          <div className="flex text-yellow-500">
            <span className="material-symbols-outlined text-[16px] font-solid">star</span>
            <span className="material-symbols-outlined text-[16px] font-solid">star</span>
            <span className="material-symbols-outlined text-[16px] font-solid">star</span>
            <span className="material-symbols-outlined text-[16px] font-solid">star</span>
            <span className="material-symbols-outlined text-[16px] font-solid">star</span>
          </div>
          <span>Afyon'da 250+ Mutlu Müşteri</span>
        </div>
      </div>

      {/* Floating Guarantee Card (Designer Perspective) */}
      <div className="absolute hidden lg:flex items-center gap-4 bottom-32 right-20 bg-gradient-to-r from-red-900/80 to-background-dark p-4 rounded-2xl animate-float border border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.3)] backdrop-blur-md">
        <div className="size-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
          <span className="material-symbols-outlined">gavel</span>
        </div>
        <div className="text-left">
          <p className="text-white font-bold text-sm">7 Gün Rest Garantisi!</p>
          <p className="text-gray-300 text-xs">Para İade veya Yeniden Yıkama</p>
        </div>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce text-white/30">
        <span className="material-symbols-outlined text-4xl">keyboard_arrow_down</span>
      </div>
    </header>
  );
};

export default Hero;