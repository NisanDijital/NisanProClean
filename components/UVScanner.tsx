import React, { useState, useRef } from 'react';
import { CONTACT_INFO } from '../constants';

const UVScanner: React.FC = () => {
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [isHovering, setIsHovering] = useState(false);
  const [activeTab, setActiveTab] = useState<'koltuk' | 'yatak'>('koltuk');
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  };

  const images = {
    koltuk: "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80",
    yatak: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80"
  };

  return (
    <section className="py-24 px-4 bg-background-dark relative overflow-hidden border-b border-white/5">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 font-medium text-xs mb-4">
            <span className="material-symbols-outlined text-sm animate-pulse">lightbulb</span>
            Gerçeklerle Yüzleşin
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Gözle Göremedikleriniz: <span className="text-purple-400">UV Işık Testi</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Eşyalarınız dışarıdan temiz görünebilir. Peki ya derinlerde yaşayan maytlar, bakteriler ve deri döküntüleri? UV fenerini üzerinde gezdirerek gizli tehlikeyi keşfedin.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-4 mb-8">
          <button 
            onClick={() => setActiveTab('koltuk')}
            className={`px-6 py-2 rounded-full font-bold transition-all flex items-center gap-2 ${activeTab === 'koltuk' ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.5)]' : 'bg-surface-dark text-gray-400 hover:text-white border border-white/10'}`}
          >
            <span className="material-symbols-outlined text-sm">chair</span>
            Koltuk
          </button>
          <button 
            onClick={() => setActiveTab('yatak')}
            className={`px-6 py-2 rounded-full font-bold transition-all flex items-center gap-2 ${activeTab === 'yatak' ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.5)]' : 'bg-surface-dark text-gray-400 hover:text-white border border-white/10'}`}
          >
            <span className="material-symbols-outlined text-sm">bed</span>
            Yatak
          </button>
        </div>

        <div 
          ref={containerRef}
          className="relative w-full aspect-[4/3] md:aspect-[21/9] rounded-3xl overflow-hidden cursor-crosshair border border-white/10 shadow-2xl bg-black"
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          onTouchMove={handleTouchMove}
          onTouchStart={() => setIsHovering(true)}
          onTouchEnd={() => setIsHovering(false)}
        >
          {/* Base Image */}
          <img 
            src={images[activeTab]} 
            alt="Temiz görünen eşya" 
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
            style={{ opacity: isHovering ? 0.8 : 1 }}
          />

          {/* UV Layer */}
          <div 
            className="absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-300"
            style={{
              opacity: isHovering ? 1 : 0,
              WebkitMaskImage: `radial-gradient(circle 150px at ${mousePos.x}% ${mousePos.y}%, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)`,
              maskImage: `radial-gradient(circle 150px at ${mousePos.x}% ${mousePos.y}%, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)`,
            }}
          >
            {/* Dark UV Filtered Image */}
            <img 
              src={images[activeTab]} 
              alt="UV Görünüm" 
              className="absolute inset-0 w-full h-full object-cover filter contrast-[1.5] brightness-[0.2] hue-rotate-[260deg] saturate-[2.5]"
            />
            
            {/* Glowing Germs/Stains Overlay */}
            <div className="absolute inset-0 opacity-90 mix-blend-color-dodge"
                 style={{
                   backgroundImage: `
                     radial-gradient(circle at 25% 35%, rgba(167, 243, 208, 0.9) 0%, transparent 10%),
                     radial-gradient(circle at 70% 45%, rgba(216, 180, 254, 0.9) 0%, transparent 15%),
                     radial-gradient(circle at 45% 65%, rgba(167, 243, 208, 0.8) 0%, transparent 12%),
                     radial-gradient(circle at 85% 75%, rgba(253, 164, 175, 0.9) 0%, transparent 18%),
                     radial-gradient(circle at 15% 70%, rgba(216, 180, 254, 0.7) 0%, transparent 12%),
                     radial-gradient(circle at 55% 50%, rgba(167, 243, 208, 0.95) 0%, transparent 25%),
                     radial-gradient(circle at 35% 20%, rgba(253, 164, 175, 0.8) 0%, transparent 10%)
                   `
                 }}
            ></div>
            
            {/* UV Light Ring Effect */}
            <div 
              className="absolute inset-0 border-[2px] border-purple-400/40 rounded-full pointer-events-none"
              style={{
                width: '300px',
                height: '300px',
                left: `calc(${mousePos.x}% - 150px)`,
                top: `calc(${mousePos.y}% - 150px)`,
                boxShadow: 'inset 0 0 60px rgba(168, 85, 247, 0.6), 0 0 60px rgba(168, 85, 247, 0.4)'
              }}
            ></div>
          </div>

          {/* Instruction Overlay */}
          <div className={`absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px] transition-opacity duration-500 pointer-events-none ${isHovering ? 'opacity-0' : 'opacity-100'}`}>
            <div className="bg-background-dark/90 border border-purple-500/50 px-6 py-4 rounded-2xl flex flex-col items-center gap-3 animate-bounce shadow-[0_0_30px_rgba(168,85,247,0.3)]">
              <span className="material-symbols-outlined text-purple-400 text-4xl">highlight</span>
              <span className="text-white font-bold text-center">UV Feneri Yakmak İçin<br/>Dokun veya Sürükle</span>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
           <button 
              onClick={() => window.open(`https://wa.me/${CONTACT_INFO.phone.replace(/\s+/g, '')}?text=Merhaba,%20sitenizdeki%20UV%20ışık%20testini%20gördüm.%20Eşyalarımın%20derinlemesine%20temizlenmesi%20için%20randevu%20almak%20istiyorum.`, '_blank')}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-[0_0_20px_rgba(147,51,234,0.4)] hover:shadow-[0_0_30px_rgba(147,51,234,0.6)] flex items-center justify-center gap-2 mx-auto"
            >
              <span className="material-symbols-outlined">coronavirus</span>
              Bakteri ve Maytlardan Kurtul
            </button>
        </div>
      </div>
    </section>
  );
};

export default UVScanner;
