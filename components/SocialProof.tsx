import React, { useState, useEffect } from 'react';

const NAMES = ["Ahmet Y.", "Ayşe K.", "Mehmet T.", "Fatma S.", "Caner B.", "Zeynep A.", "Burak C.", "Elif D.", "Mustafa E.", "Merve F."];
const LOCATIONS = ["Afyon Merkez", "Erenler", "Uydukent", "Sahipata", "Erkmen", "Fatih", "Kanlıca", "Gazi"];
const SERVICES = [
  "Koltuk Hijyeni", 
  "Yatak Hijyeni", 
  "Araç Koltuk Temizliği", 
  "Altın Kasko VIP Paketi", 
  "Gümüş Kasko", 
  "Leke Çıkarma (Buharlı)", 
  "Platin VIP Kasko Aboneliği",
  "U Köşe Takımı Temizliği"
];

const SocialProof: React.FC = () => {
  const [viewers, setViewers] = useState(Math.floor(Math.random() * 6) + 5); // 5 ile 10 arası başlar
  const [isVisible, setIsVisible] = useState(false);
  const [mode, setMode] = useState<'viewers' | 'booking'>('viewers');
  const [booking, setBooking] = useState({ name: '', location: '', service: '' });

  useEffect(() => {
    // Sayfa açıldıktan 3 saniye sonra ilk bildirimi göster
    const initialTimer = setTimeout(() => setIsVisible(true), 3000);

    // İzleyici sayısını her 4 saniyede bir dalgalandır (Hareket algısı)
    const viewerInterval = setInterval(() => {
      setViewers(prev => {
        const change = Math.random() > 0.5 ? 1 : -1;
        const next = prev + change;
        return next < 4 ? 4 : (next > 14 ? 14 : next); // 4 ile 14 arası gidip gelsin
      });
    }, 4000);

    // Bildirim tipini değiştirme döngüsü (İzleyici -> Randevu -> İzleyici)
    const cycleInterval = setInterval(() => {
      setIsVisible(false); // Önce gizle (Fade out)
      
      setTimeout(() => {
        setMode(prev => {
          if (prev === 'viewers') {
            // Yeni sahte randevu oluştur
            setBooking({
              name: NAMES[Math.floor(Math.random() * NAMES.length)],
              location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
              service: SERVICES[Math.floor(Math.random() * SERVICES.length)],
            });
            return 'booking';
          }
          return 'viewers';
        });
        setIsVisible(true); // İçeriği değiştirip tekrar göster (Fade in)
      }, 1000); // 1 saniye gizli kalsın

    }, 12000); // Her 12 saniyede bir döngüye gir

    return () => {
      clearTimeout(initialTimer);
      clearInterval(viewerInterval);
      clearInterval(cycleInterval);
    };
  }, []);

  return (
    <div className={`fixed bottom-6 left-6 z-50 transition-all duration-700 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
      <div className="glass-card bg-surface-dark/90 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center gap-4 max-w-[320px]">
        {mode === 'viewers' ? (
          <>
            <div className="relative flex items-center justify-center size-10 rounded-full bg-primary/20 text-primary shrink-0">
              <span className="absolute inset-0 rounded-full border border-primary animate-ping opacity-40"></span>
              <span className="material-symbols-outlined text-[20px]">visibility</span>
            </div>
            <div>
              <p className="text-white text-sm font-medium leading-snug">
                Şu an <strong className="text-primary">{viewers} kişi</strong> bu sayfayı inceliyor.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className={`flex items-center justify-center size-10 rounded-full shrink-0 ${booking.service.includes('Kasko') ? 'bg-yellow-500/20 text-yellow-500' : 'bg-[#25D366]/20 text-[#25D366]'}`}>
              <span className="material-symbols-outlined text-[20px]">{booking.service.includes('Kasko') ? 'workspace_premium' : 'event_available'}</span>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-0.5">{booking.name} ({booking.location})</p>
              <p className="text-white text-sm font-medium leading-snug">
                Az önce <strong className={booking.service.includes('Kasko') ? 'text-yellow-500' : 'text-[#25D366]'}>{booking.service}</strong> {booking.service.includes('Kasko') ? 'satın aldı.' : 'randevusu aldı.'}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SocialProof;
