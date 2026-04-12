import React, { useState, useRef, useEffect } from 'react';
import { GALLERY_ITEMS } from '../constants';

const ImageSlider: React.FC<{ beforeImage: string; afterImage: string; title: string }> = ({ beforeImage, afterImage, title }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.max(0, Math.min((x / rect.width) * 100, 100));
    setSliderPosition(percent);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    handleMove(e.touches[0].clientX);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', () => setIsDragging(false));
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', () => setIsDragging(false));
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', () => setIsDragging(false));
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', () => setIsDragging(false));
    };
  }, [isDragging]);

  return (
    <div 
      ref={containerRef}
      className="relative h-64 w-full overflow-hidden cursor-ew-resize select-none"
      onMouseDown={(e) => {
        setIsDragging(true);
        handleMove(e.clientX);
      }}
      onTouchStart={(e) => {
        setIsDragging(true);
        handleMove(e.touches[0].clientX);
      }}
    >
      {/* After Image (Background) */}
      <img 
        src={afterImage} 
        alt={`${title} Sonrası`} 
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        referrerPolicy="no-referrer"
        draggable="false"
      />
      <div className="absolute top-3 right-3 bg-primary/90 backdrop-blur-sm text-background-dark text-xs font-bold px-3 py-1 rounded-full shadow-[0_0_10px_rgba(45,212,191,0.5)] pointer-events-none">
        SONRASI
      </div>

      {/* Before Image (Clipped Foreground) */}
      <div 
        className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none"
        style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
      >
        <img 
          src={beforeImage} 
          alt={`${title} Öncesi`} 
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'sepia(40%) brightness(60%) contrast(120%) saturate(60%)' }}
          referrerPolicy="no-referrer"
          draggable="false"
        />
        <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full border border-white/10">
          ÖNCESİ
        </div>
      </div>

      {/* Slider Line & Handle */}
      <div 
        className="absolute top-0 bottom-0 w-1 bg-primary cursor-ew-resize pointer-events-none"
        style={{ left: `calc(${sliderPosition}% - 2px)` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-8 bg-background-dark border-2 border-primary rounded-full flex items-center justify-center text-primary shadow-[0_0_15px_rgba(45,212,191,0.5)]">
          <span className="material-symbols-outlined text-[16px]">compare_arrows</span>
        </div>
      </div>
    </div>
  );
};

const BeforeAfterGallery: React.FC = () => {
  return (
    <section id="gallery" className="py-24 px-4 relative scroll-mt-24 bg-surface-dark/50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-medium text-sm mb-4">
            <span className="material-symbols-outlined text-sm">compare</span>
            Gözle Görülür Fark
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Öncesi ve <span className="text-gradient-primary">Sonrası</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Kelimelere değil, sonuçlara inanın. Yüksek vakum ve sıcak buhar teknolojimizin inatçı lekeler üzerindeki etkisini kendi gözlerinizle görün. (Fotoğrafların üzerindeki çizgiyi sağa sola kaydırın)
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {GALLERY_ITEMS.map((item) => (
            <div key={item.id} className="glass-card rounded-2xl overflow-hidden group border border-white/5 hover:border-primary/30 transition-all duration-500">
              <ImageSlider beforeImage={item.beforeImage} afterImage={item.afterImage} title={item.title} />
              
              <div className="p-6">
                <div className="text-xs text-primary font-bold tracking-wider mb-2 uppercase">{item.category}</div>
                <h3 className="text-white font-bold text-lg">{item.title}</h3>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-12 text-center">
          <p className="text-gray-500 text-sm italic">
            *Fotoğraflar temsilidir. Gerçek müşteri fotoğraflarımızı Instagram sayfamızda bulabilirsiniz.
          </p>
        </div>
      </div>
    </section>
  );
};

export default BeforeAfterGallery;
