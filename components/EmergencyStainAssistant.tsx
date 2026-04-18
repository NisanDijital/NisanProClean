import React, { useState } from 'react';
import { trackWhatsAppClick } from '../analytics';
import { CONTACT_INFO } from '../constants';

const EmergencyStainAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [stainType, setStainType] = useState('');
  const [timePassed, setTimePassed] = useState('');
  const [fabricType, setFabricType] = useState('');

  const STAIN_TYPES = ['Kahve / Çay', 'Kedi/Köpek İdrarı', 'Kan', 'Yağ veya Yemek', 'Mürekkep/Boya', 'Diğer'];
  const TIME_OPTIONS = ['Az Önce (Hala Islak)', 'Bugün (Kurumuş)', 'Haftalar Önce', 'Aylar/Yıllar Önce'];
  const FABRIC_OPTIONS = ['Kadife', 'Tay Tüyü', 'Keten', 'Nubuk', 'Deri', 'Emin Değilim'];

  const handleWhatsApp = () => {
    const text = `🚨 *ACİL LEKE BİLDİRİMİ* 🚨\n\n*Ne Döküldü:* ${stainType || 'Belirtilmedi'}\n*Ne Zaman:* ${timePassed || 'Belirtilmedi'}\n*Kumaş Türü:* ${fabricType || 'Belirtilmedi'}\n\nMerhaba, kumaşa zarar vermeden acil müdahale için bilgi veya fiyat alabilir miyim?`;
    trackWhatsAppClick('emergency_stain_assistant', {
      stain_type: stainType || 'unspecified',
      time_passed: timePassed || 'unspecified',
      fabric_type: fabricType || 'unspecified',
    });
    window.open(`https://wa.me/${CONTACT_INFO.whatsapp.replace(/\s+/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Red Siren Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-24 right-4 md:right-6 z-[60] bg-red-600 hover:bg-red-500 text-white rounded-full pl-3 pr-4 py-2 flex items-center gap-2 shadow-[0_0_20px_rgba(220,38,38,0.5)] transition-all cursor-pointer group border border-red-400/50 hover:scale-105"
      >
        <span className="material-symbols-outlined animate-ping absolute opacity-40">emergency</span>
        <span className="material-symbols-outlined relative z-10 text-xl">emergency</span>
        <span className="font-black tracking-widest text-[10px] md:text-xs">ACİL LEKE</span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-dark border border-red-500/30 rounded-3xl p-6 md:p-8 max-w-md w-full relative shadow-[0_0_40px_rgba(220,38,38,0.2)]">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white bg-background-dark rounded-full p-1 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="size-12 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined animate-pulse text-2xl">warning</span>
              </div>
              <div>
                <h3 className="text-xl font-black text-white leading-tight">YARALIYA MÜDAHALE!</h3>
                <p className="text-red-400 text-xs font-bold mt-1">Lütfen bezle silip lekeyi içeri itmeyin.</p>
              </div>
            </div>

            <p className="text-gray-300 text-sm mb-6 leading-relaxed">
              Yanlış kimyasal kullanımı kumaşınızı sonsuza kadar yakabilir! 3 soruyu cevaplayın, endüstriyel çözümümüzle anında müdahale edelim.
            </p>

            <div className="space-y-5">
              {/* Soru 1 */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">1. Ne Döküldü?</label>
                <div className="flex flex-wrap gap-2">
                  {STAIN_TYPES.map(type => (
                    <button
                      key={type}
                      onClick={() => setStainType(type)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${stainType === type ? 'bg-red-500 border-red-500 text-white' : 'bg-background-dark border-white/10 text-gray-400 hover:border-red-500/50'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Soru 2 */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">2. Ne Zaman Oldu?</label>
                <div className="flex flex-wrap gap-2">
                  {TIME_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      onClick={() => setTimePassed(opt)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${timePassed === opt ? 'bg-red-500 border-red-500 text-white' : 'bg-background-dark border-white/10 text-gray-400 hover:border-red-500/50'}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Soru 3 */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">3. Kumaş Türü Nedir?</label>
                <div className="flex flex-wrap gap-2">
                  {FABRIC_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      onClick={() => setFabricType(opt)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${fabricType === opt ? 'bg-red-500 border-red-500 text-white' : 'bg-background-dark border-white/10 text-gray-400 hover:border-red-500/50'}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button 
              onClick={handleWhatsApp}
              disabled={!stainType || !timePassed}
              className={`w-full mt-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${stainType && timePassed ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
            >
              <span className="material-symbols-outlined">send</span>
              Acil Kurtarma Talep Et
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default EmergencyStainAssistant;
