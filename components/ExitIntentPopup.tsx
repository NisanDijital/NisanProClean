import React, { useState, useEffect } from 'react';
import { trackWhatsAppClick } from '../analytics';
import { CONTACT_INFO } from '../constants';

const OFFERS = [
  { id: 'buhar', title: 'ÜCRETSİZ BUHAR DEZENFEKSİYONU', desc: '300 TL değerinde Sıcak Buhar Dezenfeksiyonu', code: 'BUHAR2026', icon: 'local_fire_department' },
  { id: 'leke', title: 'ÜCRETSİZ LEKE ÇIKARMA', desc: '500 TL değerinde Özel Leke Çıkarma işlemi', code: 'LEKE2026', icon: 'cleaning_services' },
  { id: 'percent10', title: '%10 EKSTRA İNDİRİM', desc: 'Tüm hijyen işlemlerinde geçerli %10 Ekstra İndirim', code: 'YUZDE10', icon: 'percent' },
  { id: 'percent5', title: '%5 EKSTRA İNDİRİM', desc: 'Tüm hijyen işlemlerinde geçerli %5 Ekstra İndirim', code: 'YUZDE5', icon: 'percent' },
  { id: 'fixed250', title: '250 TL NAKİT İNDİRİM', desc: 'Anında kullanabileceğiniz 250 TL İndirim', code: 'INDIRIM250', icon: 'payments' },
  { id: 'fixed200', title: '200 TL NAKİT İNDİRİM', desc: 'Anında kullanabileceğiniz 200 TL İndirim', code: 'INDIRIM200', icon: 'payments' },
  { id: 'fixed100', title: '100 TL NAKİT İNDİRİM', desc: 'Anında kullanabileceğiniz 100 TL İndirim', code: 'INDIRIM100', icon: 'payments' },
];

const ExitIntentPopup: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const [offer, setOffer] = useState(OFFERS[0]);

  useEffect(() => {
    // Pick a random offer on mount
    setOffer(OFFERS[Math.floor(Math.random() * OFFERS.length)]);

    // İlk 5 saniye boyunca popup'ın çıkmasını engelle (yanlışlıkla tetiklenmeyi önler)
    let canTrigger = false;
    const initialDelay = setTimeout(() => {
      canTrigger = true;
    }, 5000);

    const handleMouseLeave = (e: MouseEvent) => {
      // Fare ekranın üst kısmından çıkarsa (sekmeyi kapatma veya geri gitme hareketi)
      // Hassasiyeti azalttık (clientY <= 5) ve ilk 5 saniye kuralı ekledik
      if (canTrigger && e.clientY <= 5 && !hasTriggered) {
        const isMobile = window.innerWidth < 768;
        if (!isMobile) {
          setIsVisible(true);
          setHasTriggered(true);
        }
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);

    // Mobil cihazlar için fare çıkışı algılanamaz, bu yüzden 45 saniye sitede boş durursa tetikle
    const mobileTimer = setTimeout(() => {
       if (window.innerWidth < 768 && !hasTriggered) {
         setIsVisible(true);
         setHasTriggered(true);
       }
    }, 45000);

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      clearTimeout(mobileTimer);
      clearTimeout(initialDelay);
    };
  }, [hasTriggered]);

  if (!isVisible) return null;

  const handleWhatsApp = () => {
    const message = encodeURIComponent(`Merhaba, web sitenizden çıkarken karşıma çıkan '${offer.title}' fırsatından yararlanarak randevu almak istiyorum. (Kod: ${offer.code})`);
    trackWhatsAppClick('exit_intent_popup', {
      offer_id: offer.id,
      offer_code: offer.code,
    });
    window.open(`https://wa.me/${CONTACT_INFO.phone.replace(/\s+/g, '')}?text=${message}`, '_blank');
    setIsVisible(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background-dark/80 backdrop-blur-sm animate-fade-in">
      <div className="glass-card max-w-md w-full p-8 rounded-3xl border border-primary/30 shadow-[0_0_50px_rgba(45,212,191,0.2)] relative text-center transform transition-all scale-100 animate-fade-in-down">
        <button 
          onClick={() => setIsVisible(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        
        <div className="size-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center text-primary mb-6 animate-bounce">
          <span className="material-symbols-outlined text-3xl">{offer.icon}</span>
        </div>
        
        <h2 className="text-2xl font-black text-white mb-2">Gitmeden Önce!</h2>
        <p className="text-gray-300 mb-6 text-sm leading-relaxed">
          Koltuklarınızı yenilemeyi ertelemeyin. Sadece bu ziyaretinize özel, derinlemesine hijyen işlemlerinde <strong className="text-primary">{offer.desc}</strong> bizden hediye!
        </p>
        
        <div className="bg-background-dark border border-white/10 rounded-xl p-4 mb-6">
          <p className="text-xs text-gray-500 mb-1">Fırsat Kodunuz:</p>
          <p className="text-xl font-mono font-bold text-white tracking-widest">{offer.code}</p>
        </div>
        
        <button 
          onClick={handleWhatsApp}
          className="relative overflow-hidden w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(37,211,102,0.3)] hover:shadow-[0_0_30px_rgba(37,211,102,0.5)] flex items-center justify-center gap-2 group"
        >
          <span className="material-symbols-outlined relative z-10">chat</span>
          <span className="relative z-10">Hediyemi Al & Randevu Oluştur</span>
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shine z-0"></div>
        </button>
        
        <button 
          onClick={() => setIsVisible(false)}
          className="mt-5 text-xs text-gray-500 hover:text-gray-300 underline transition-colors"
        >
          Hayır teşekkürler, lekeli koltuklarımla mutluyum.
        </button>
      </div>
    </div>
  );
};

export default ExitIntentPopup;
