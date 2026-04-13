import React, { useState, useMemo } from 'react';
import { CONTACT_INFO } from '../constants';

// Örnek Fiyatlandırma (Bu fiyatları daha sonra kolayca değiştirebilirsiniz)
const PRICING = {
  koltuk: [
    { id: 'avangard', name: 'Avangard Takım', price: 2500 },
    { id: 'chesterTakim', name: 'Chester Takım', price: 2000 },
    { id: 'minderliTakim', name: 'Minderli Takım', price: 2000 },
    { id: 'maxiTakim', name: 'Maxi Takım (Yataklı)', price: 1750 },
    { id: 'mindersizTakim', name: 'Mindersiz (Düz) Takım', price: 1500 },
    { id: 'buyukLKoltuk', name: 'Büyük L Koltuk', price: 1250 },
    { id: 'kucukLKoltuk', name: 'Küçük L Koltuk', price: 1000 },
    { id: 'berjer', name: 'Berjer / Tekli Koltuk', price: 300 },
    { id: 'sandalye', name: 'Sandalye', price: 150 },
  ],
  yatak: [
    { id: 'ciftYatak', name: 'Çift Kişilik Yatak', price: 1500 },
    { id: 'tekYatak', name: 'Tek Kişilik Yatak', price: 1000 },
    { id: 'bazaBasligi', name: 'Baza Başlığı', price: 500 },
  ],
  arac: [
    { id: 'binekArac', name: 'Binek Araç Koltuk Temizliği', price: 1800 },
    { id: 'suvArac', name: 'SUV / Ticari Araç Koltuk Temizliği', price: 2000 },
  ]
};

const ADDONS = [
  { id: 'buhar', name: 'Sıcak Buhar Dezenfeksiyonu', price: 300, desc: '140 derece buhar ile derinlemesine hijyen' },
  { id: 'leke', name: 'Özel Leke Çıkarma', price: 500, desc: 'İnatçı lekeler için endüstriyel müdahale' },
  { id: 'pet', name: 'Evcil Hayvan Koku Giderici', price: 250, desc: 'Enzim bazlı derinlemesine koku imhası' }
];

const PricingCalculator: React.FC = () => {
  const [items, setItems] = useState<Record<string, number>>({});
  const [addons, setAddons] = useState<Record<string, boolean>>({});
  const [date, setDate] = useState('');
  const [time, setTime] = useState('Öğleden Önce (09:00 - 13:00)');

  const updateItem = (id: string, delta: number) => {
    setItems(prev => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      }
      return { ...prev, [id]: next };
    });
  };

  const toggleAddon = (id: string) => {
    setAddons(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const { total, subTotal, discount, summary } = useMemo(() => {
    let calcTotal = 0;
    const calcSummary: { name: string; qty: number; price: number; total: number }[] = [];

    // Calculate Items
    Object.entries(PRICING).forEach(([_, categoryItems]) => {
      categoryItems.forEach(item => {
        const qty = items[item.id] || 0;
        if (qty > 0) {
          const itemTotal = qty * item.price;
          calcTotal += itemTotal;
          calcSummary.push({ name: item.name, qty, price: item.price, total: itemTotal });
        }
      });
    });

    // Calculate Addons (only if there are items selected)
    const hasItems = calcSummary.length > 0;
    if (hasItems) {
      ADDONS.forEach(addon => {
        if (addons[addon.id]) {
          calcTotal += addon.price;
          calcSummary.push({ name: addon.name, qty: 1, price: addon.price, total: addon.price });
        }
      });
    }

    const calcDiscount = 0; // İndirim kaldırıldı
    const finalTotal = calcTotal;

    return { total: finalTotal, subTotal: calcTotal, discount: calcDiscount, summary: calcSummary };
  }, [items, addons]);

  const handleWhatsAppOrder = () => {
    if (summary.length === 0) return;
    
    let message = "Merhaba, web sitenizden fiyat hesaplaması yaptım ve randevu almak istiyorum.\n\n*Seçtiğim Hizmetler:*\n";
    summary.forEach(item => {
      message += `- ${item.qty}x ${item.name}\n`;
    });
    message += `\n*Ödenecek Tutar:* ${total} TL\n\n`;

    if (date) {
      const [year, month, day] = date.split('-');
      message += `*Talep Edilen Randevu:*\nTarih: ${day}.${month}.${year}\nSaat: ${time}\n\n`;
    } else {
      message += `*Talep Edilen Randevu:*\nEn kısa sürede uygun bir vakit.\n\n`;
    }

    message += `Bu tarihte müsaitlik durumunuz nedir? Randevumu onaylar mısınız?`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${CONTACT_INFO.phone.replace(/\s+/g, '')}?text=${encodedMessage}`, '_blank');
  };

  return (
    <section id="fiyat-hesapla" className="py-24 px-4 relative scroll-mt-24">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-medium text-sm mb-4">
            <span className="material-symbols-outlined text-sm">calculate</span>
            Şeffaf Fiyatlandırma
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Kendi Fiyatınızı <span className="text-gradient-primary">Hesaplayın</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Sürpriz maliyetler yok. İhtiyacınız olan hizmetleri seçin, anında tahmini fiyatı görün ve tek tıkla randevunuzu oluşturun.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Side: Selectors */}
          <div className="lg:w-2/3 space-y-8">
            
            {/* Koltuklar */}
            <div className="glass-card p-6 md:p-8 rounded-2xl border border-white/5">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">chair</span>
                Koltuk & Sandalye
              </h3>
              <div className="space-y-4">
                {PRICING.koltuk.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors">
                    <div>
                      <div className="text-white font-medium">{item.name}</div>
                      <div className="text-primary text-sm">{item.price} TL</div>
                    </div>
                    <div className="flex items-center gap-4 bg-background-dark rounded-lg p-1 border border-white/10">
                      <button onClick={() => updateItem(item.id, -1)} className="size-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors">
                        <span className="material-symbols-outlined text-sm">remove</span>
                      </button>
                      <span className="text-white font-bold w-4 text-center">{items[item.id] || 0}</span>
                      <button onClick={() => updateItem(item.id, 1)} className="size-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors">
                        <span className="material-symbols-outlined text-sm">add</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Yatak & Araç */}
            <div className="grid md:grid-cols-2 gap-8">
              <div className="glass-card p-6 rounded-2xl border border-white/5">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">bed</span>
                  Yatak Yıkama
                </h3>
                <div className="space-y-4">
                  {PRICING.yatak.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors">
                      <div>
                        <div className="text-white font-medium text-sm">{item.name}</div>
                        <div className="text-secondary text-xs">{item.price} TL</div>
                      </div>
                      <div className="flex items-center gap-2 bg-background-dark rounded-lg p-1 border border-white/10">
                        <button onClick={() => updateItem(item.id, -1)} className="size-6 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded-md"><span className="material-symbols-outlined text-xs">remove</span></button>
                        <span className="text-white font-bold w-3 text-center text-sm">{items[item.id] || 0}</span>
                        <button onClick={() => updateItem(item.id, 1)} className="size-6 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded-md"><span className="material-symbols-outlined text-xs">add</span></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card p-6 rounded-2xl border border-white/5">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">directions_car</span>
                  Araç Koltuk Temizliği
                </h3>
                <div className="space-y-4">
                  {PRICING.arac.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors">
                      <div>
                        <div className="text-white font-medium text-sm">{item.name}</div>
                        <div className="text-secondary text-xs">{item.price} TL</div>
                      </div>
                      <div className="flex items-center gap-2 bg-background-dark rounded-lg p-1 border border-white/10">
                        <button onClick={() => updateItem(item.id, -1)} className="size-6 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded-md"><span className="material-symbols-outlined text-xs">remove</span></button>
                        <span className="text-white font-bold w-3 text-center text-sm">{items[item.id] || 0}</span>
                        <button onClick={() => updateItem(item.id, 1)} className="size-6 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded-md"><span className="material-symbols-outlined text-xs">add</span></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Ekstra Hizmetler (Upsell) */}
            <div className="glass-card p-6 md:p-8 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">auto_awesome</span>
                Ekstra Koruma & Hijyen
              </h3>
              <p className="text-gray-400 text-sm mb-6">Temizliğin ömrünü uzatan profesyonel dokunuşlar.</p>
              
              <div className="grid md:grid-cols-2 gap-4">
                {ADDONS.map(addon => (
                  <div 
                    key={addon.id}
                    onClick={() => toggleAddon(addon.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 flex items-start gap-3 ${addons[addon.id] ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(45,212,191,0.2)]' : 'bg-surface-dark border-white/10 hover:border-white/30'}`}
                  >
                    <div className={`mt-1 size-5 rounded border flex items-center justify-center shrink-0 transition-colors ${addons[addon.id] ? 'bg-primary border-primary text-background-dark' : 'border-gray-500 text-transparent'}`}>
                      <span className="material-symbols-outlined text-[14px] font-bold">check</span>
                    </div>
                    <div>
                      <div className="text-white font-bold text-sm">{addon.name}</div>
                      <div className="text-gray-400 text-xs mt-1">{addon.desc}</div>
                      <div className="text-primary text-sm font-bold mt-2">+{addon.price} TL</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Side: Receipt / Summary */}
          <div className="lg:w-1/3">
            {/* Campaign Banner */}
            <div className="bg-gradient-to-r from-primary/20 to-transparent border border-primary/30 rounded-2xl p-5 mb-6 flex items-start gap-4 shadow-[0_0_20px_rgba(45,212,191,0.1)]">
              <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
                <span className="material-symbols-outlined animate-pulse">local_offer</span>
              </div>
              <div>
                <h4 className="text-white font-bold text-sm mb-1">Bahar Kampanyası</h4>
                <p className="text-gray-400 text-xs leading-relaxed">Web sitemize özel online randevularda <strong className="text-primary">Öncelikli Hizmet!</strong></p>
              </div>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-white/10 sticky top-28">
              <h3 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4">Sipariş Özeti</h3>
              
              {summary.length === 0 ? (
                <div className="text-center py-8 text-gray-500 flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-4xl opacity-50">shopping_cart</span>
                  <p>Henüz bir hizmet seçmediniz.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2">
                    {summary.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start text-sm">
                        <div className="text-gray-300">
                          <span className="text-white font-bold mr-2">{item.qty}x</span>
                          {item.name}
                        </div>
                        <div className="text-white font-medium whitespace-nowrap ml-4">
                          {item.total} TL
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t border-white/10 pt-4 mb-6">
                    <div className="flex justify-between items-end border-t border-white/5 pt-3">
                      <div className="text-white font-bold text-sm">Ödenecek Tutar</div>
                      <div className="text-3xl font-black text-primary drop-shadow-[0_0_10px_rgba(45,212,191,0.5)]">
                        {total} TL
                      </div>
                    </div>

                    {/* PayTR & Credit Card */}
                    <div className="mt-4 p-3 bg-white/5 border border-white/10 rounded-xl flex items-center gap-3">
                      <div className="flex -space-x-2">
                        <div className="size-8 rounded-full bg-[#1c1f27] border border-white/20 flex items-center justify-center z-20"><span className="text-[10px] font-bold text-white">VISA</span></div>
                        <div className="size-8 rounded-full bg-[#1c1f27] border border-white/20 flex items-center justify-center z-10"><span className="text-[10px] font-bold text-white">MC</span></div>
                      </div>
                      <div>
                        <p className="text-white text-xs font-bold">Kredi Kartı Geçerlidir</p>
                        <p className="text-gray-400 text-[10px]">PayTR Güvencesiyle Taksit İmkanı</p>
                      </div>
                    </div>

                    {/* 7 Day Guarantee */}
                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                      <span className="material-symbols-outlined text-red-400 text-lg">gavel</span>
                      <div>
                        <p className="text-red-400 text-xs font-bold">7 Gün Rest Garantisi!</p>
                        <p className="text-gray-400 text-[10px] leading-relaxed">Memnun kalmazsanız 7 gün içinde ücretsiz yeniden yıkama veya uygun şartlarda para iade garantisi.</p>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 mt-4">*Fiyatlar tahmini olup, yerinde yapılacak net tespite göre küçük değişiklikler gösterebilir.</p>
                  </div>

                  {/* Randevu Seçimi */}
                  <div className="bg-background-dark border border-white/10 rounded-xl p-4 mb-6">
                    <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-sm">calendar_month</span>
                      Randevu Tercihiniz
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Tarih Seçin</label>
                        <input
                          type="date"
                          min={new Date().toISOString().split('T')[0]}
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="w-full bg-surface-dark border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary [color-scheme:dark]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Saat Aralığı</label>
                        <select
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                          className="w-full bg-surface-dark border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                        >
                          <option>Öğleden Önce (09:00 - 13:00)</option>
                          <option>Öğleden Sonra (13:00 - 17:00)</option>
                          <option>Akşam (17:00 - 20:00)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-red-400 text-xs font-medium mb-3 animate-pulse">
                    <span className="material-symbols-outlined text-[16px]">local_fire_department</span>
                    Dikkat: Bu hafta için sadece 2 boş randevu kaldı!
                  </div>

                  <button 
                    onClick={handleWhatsAppOrder}
                    className="relative overflow-hidden w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(37,211,102,0.3)] hover:shadow-[0_0_30px_rgba(37,211,102,0.5)] flex items-center justify-center gap-2 text-lg group"
                  >
                    <span className="material-symbols-outlined relative z-10">chat</span>
                    <span className="relative z-10">WhatsApp'tan Randevu Al</span>
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shine z-0"></div>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingCalculator;
