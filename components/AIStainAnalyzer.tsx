import React, { useState, useRef, useEffect } from 'react';
import { trackWhatsAppClick } from '../analytics';
import { CONTACT_INFO } from '../constants';

const AIStainAnalyzer: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'scanning' | 'result'>('idle');
  const [image, setImage] = useState<string | null>(null);
  const [scanText, setScanText] = useState('Görüntü işleniyor...');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setStatus('scanning');
        
        // Fake AI processing steps
        setTimeout(() => setScanText('Kumaş dokusu analiz ediliyor...'), 800);
        setTimeout(() => setScanText('Leke molekülleri ayrıştırılıyor...'), 1600);
        setTimeout(() => setScanText('Optimum pH değeri hesaplanıyor...'), 2400);
        setTimeout(() => setScanText('Uygun enzimler eşleştiriliyor...'), 3200);

        setTimeout(() => {
          setStatus('result');
        }, 4000);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetAnalyzer = () => {
    setStatus('idle');
    setImage(null);
    setScanText('Görüntü işleniyor...');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent(`Merhaba, web sitenizdeki Nisan AI™ Leke Analiz aracını kullandım. Koltuğumdaki leke için %98.5 başarı oranı verdi. Randevu almak istiyorum.`);
    trackWhatsAppClick('ai_stain_analyzer', { analysis_result: 'success_probability_98_5' });
    window.open(`https://wa.me/${CONTACT_INFO.phone.replace(/\s+/g, '')}?text=${message}`, '_blank');
  };

  return (
    <section className="py-24 px-4 relative overflow-hidden bg-background-dark border-y border-white/5">
      <style>
        {`
          @keyframes scanLine {
            0% { top: 0%; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
          }
          .animate-scan-line {
            animation: scanLine 2s ease-in-out infinite;
          }
          @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 20px rgba(45, 212, 191, 0.2); }
            50% { box-shadow: 0 0 40px rgba(45, 212, 191, 0.6); }
          }
          .glow-effect {
            animation: pulse-glow 2s infinite;
          }
        `}
      </style>

      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent z-0 pointer-events-none"></div>
      
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary font-medium text-xs mb-4">
            <span className="material-symbols-outlined text-sm animate-pulse">memory</span>
            Afyon'da Bir İlk: Nisan AI™
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Yapay Zeka <span className="text-gradient-primary">Leke Analizi</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Koltuğunuzdaki veya yatağınızdaki lekenin fotoğrafını çekin, yapay zeka motorumuz saniyeler içinde analiz edip çıkma garantisini hesaplasın.
          </p>
        </div>

        <div className="glass-card rounded-3xl border border-white/10 p-6 md:p-10 overflow-hidden relative">
          
          {status === 'idle' && (
            <div 
              className="border-2 border-dashed border-gray-600 hover:border-primary/50 rounded-2xl p-12 text-center cursor-pointer transition-all hover:bg-white/5 group"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="size-20 mx-auto bg-surface-dark rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <span className="material-symbols-outlined text-4xl text-primary">add_a_photo</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Lekeli Bölgenin Fotoğrafını Yükleyin</h3>
              <p className="text-gray-400 text-sm mb-6">Kameranızla çekin veya galeriden seçin (Max 5MB)</p>
              <button className="bg-primary text-white font-bold py-3 px-8 rounded-xl shadow-[0_0_15px_rgba(45,212,191,0.3)] hover:shadow-[0_0_25px_rgba(45,212,191,0.5)] transition-all">
                Fotoğraf Seç
              </button>
            </div>
          )}

          {status === 'scanning' && image && (
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video md:aspect-[21/9] flex items-center justify-center glow-effect border border-primary/30">
              <img src={image} alt="Scanning" className="w-full h-full object-cover opacity-50 blur-[2px]" />
              
              {/* Scanning Overlay */}
              <div className="absolute inset-0 z-10">
                <div className="absolute w-full h-1 bg-primary shadow-[0_0_20px_#2dd4bf,0_0_40px_#2dd4bf] animate-scan-line z-20"></div>
                <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] z-10"></div>
              </div>

              {/* Scanning Text */}
              <div className="absolute z-30 flex flex-col items-center">
                <span className="material-symbols-outlined text-5xl text-primary animate-spin mb-4">radar</span>
                <div className="bg-background-dark/80 backdrop-blur-md border border-primary/50 text-white px-6 py-2 rounded-full font-mono text-sm shadow-[0_0_15px_rgba(45,212,191,0.3)]">
                  {scanText}
                </div>
              </div>
            </div>
          )}

          {status === 'result' && image && (
            <div className="grid md:grid-cols-2 gap-8 animate-fade-in">
              <div className="relative rounded-2xl overflow-hidden border border-white/10 aspect-square md:aspect-auto">
                <img src={image} alt="Analyzed" className="w-full h-full object-cover" />
                <div className="absolute top-4 left-4 bg-green-500/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
                  <span className="material-symbols-outlined text-[14px]">verified</span>
                  Analiz Tamamlandı
                </div>
                {/* Fake target box */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-primary rounded-lg shadow-[0_0_15px_rgba(45,212,191,0.5)] flex items-center justify-center">
                  <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-primary"></div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-primary"></div>
                  <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-primary"></div>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-primary"></div>
                </div>
              </div>

              <div className="flex flex-col justify-center space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1">Analiz Raporu</h3>
                  <p className="text-gray-400 text-sm">Nisan AI™ Motoru Sonuçları</p>
                </div>

                <div className="space-y-4">
                  <div className="bg-surface-dark border border-white/5 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-gray-400">water_drop</span>
                      <span className="text-gray-300 text-sm">Leke Tipi Tahmini</span>
                    </div>
                    <span className="text-white font-bold text-sm">Organik / Sıvı Kaynaklı</span>
                  </div>
                  
                  <div className="bg-surface-dark border border-white/5 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-gray-400">science</span>
                      <span className="text-gray-300 text-sm">Önerilen Çözücü</span>
                    </div>
                    <span className="text-white font-bold text-sm">Oksijen Bazlı Enzim</span>
                  </div>

                  <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 flex items-center justify-between shadow-[0_0_15px_rgba(45,212,191,0.1)]">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary">analytics</span>
                      <span className="text-primary font-bold">Başarı Oranı</span>
                    </div>
                    <span className="text-3xl font-black text-white">%98.5</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button 
                    onClick={handleWhatsApp}
                    className="flex-1 bg-primary hover:bg-cyan-600 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-[0_0_15px_rgba(45,212,191,0.3)] flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">cleaning_services</span>
                    Bu Lekeyi Temizlet
                  </button>
                  <button 
                    onClick={resetAnalyzer}
                    className="bg-surface-dark hover:bg-white/10 border border-white/10 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">refresh</span>
                    Yeni
                  </button>
                </div>
              </div>
            </div>
          )}

          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleImageUpload}
          />
        </div>
      </div>
    </section>
  );
};

export default AIStainAnalyzer;
