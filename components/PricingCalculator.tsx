import React, { useState, useMemo } from 'react';
import { CONTACT_INFO } from '../constants';

// Örnek Fiyatlandırma (Bu fiyatları daha sonra kolayca değiştirebilirsiniz)
const PRICING = {
  koltuk: [
    { id: 'maxiTakim', name: 'Maxi Takım', price: 3000 },
    { id: 'megaKose', name: 'U / Büyük Köşe Takımı', price: 3000 },
    { id: 'chesterTakim', name: 'Chester Koltuk Takımı', price: 2500 },
    { id: 'minderliTakim', name: 'Minderli Koltuk Takımı', price: 2500 },
    { id: 'duzTakim', name: 'Düz Koltuk Takımı', price: 2000 },
    { id: 'takim3211', name: '3+2+1+1 Takım', price: 1800 },
    { id: 'buyukLKoltuk', name: 'L Koltuk (Büyük)', price: 1250 },
    { id: 'ucluKoltuk', name: 'Üçlü Koltuk', price: 750 },
    { id: 'ikiliKoltuk', name: 'İkili Koltuk', price: 550 },
    { id: 'tekliKoltuk', name: 'Tekli Koltuk / Berjer', price: 350 },
    { id: 'sandalye', name: 'Ev Sandalyesi (Adet)', price: 200 },
  ],
  yatak: [
    { id: 'ciftYatak', name: 'Çift Kişilik Yatak', price: 1750 },
    { id: 'tekYatak', name: 'Tek Kişilik Yatak', price: 1000 },
    { id: 'bazaBasligi', name: 'Baza Başlığı', price: 500 },
  ],
  arac: [
    { id: 'aracKoltugu', name: 'Binek Araç Koltuğu', price: 2000 },
    { id: 'suvArac', name: 'SUV / Ticari Araç Koltuğu', price: 2500 },
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
  const [isGuaranteeModalOpen, setIsGuaranteeModalOpen] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

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
    if (!acceptedTerms) return;
    
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

            {/* ProClean Care (Kasko) - 3 Tier System */}
            <div id="kasko-paketleri" className="mt-12 scroll-mt-24">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-yellow-500/20 text-yellow-400 text-[10px] font-bold uppercase tracking-wider mb-3">
                  <span className="material-symbols-outlined text-[12px]">star</span>
                  Mavi Okyanus Stratejisi
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">ProClean Care <span className="text-gradient-primary">Koltuk Kaskosu</span></h3>
                <p className="text-gray-400 text-sm">Koltuklarınızı yılda 1 kez yıkatıp kaderine terk etmeyin. İhtiyacınıza uygun paketi seçin, 365 gün koruma altına alın.</p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 items-start">
                {/* Silver */}
                <div className="glass-card rounded-2xl border border-gray-400/20 bg-gradient-to-b from-gray-400/5 to-transparent p-6 relative">
                  <div className="text-gray-400 mb-4 flex justify-between items-center">
                    <span className="material-symbols-outlined text-3xl">shield</span>
                    <span className="text-xs font-bold uppercase tracking-wider border border-gray-400/30 px-2 py-1 rounded-full">Gümüş</span>
                  </div>
                  <div className="mb-6">
                    <div className="text-3xl font-black text-white">249<span className="text-sm text-gray-500 font-medium"> TL/ay</span></div>
                    <div className="text-xs text-gray-400 mt-1">Temel Koruma Paketi</div>
                  </div>
                  <ul className="space-y-3 mb-8 text-sm text-gray-300">
                    <li className="flex items-start gap-2"><span className="material-symbols-outlined text-gray-400 text-[18px]">check</span> Yılda 1 kez detaylı takım yıkama</li>
                    <li className="flex items-start gap-2"><span className="material-symbols-outlined text-gray-400 text-[18px]">check</span> Ek hizmetlerde %20 indirim</li>
                    <li className="flex items-start gap-2"><span className="material-symbols-outlined text-gray-400 text-[18px]">check</span> WhatsApp destek hattı</li>
                  </ul>
                  <a href={`https://wa.me/${CONTACT_INFO.phone.replace(/\s+/g, '')}?text=${encodeURIComponent("Merhaba, ProClean Care (Gümüş Kasko) abonelik sistemi hakkında bilgi almak ve üye olmak istiyorum.")}`} target="_blank" rel="noopener noreferrer" className="block w-full text-center bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3 rounded-xl transition-colors text-sm">Gümüş Üye Ol</a>
                </div>

                {/* Gold */}
                <div className="glass-card rounded-2xl border border-yellow-500/50 bg-gradient-to-b from-yellow-500/10 to-transparent p-6 relative transform md:-translate-y-4 shadow-[0_0_30px_rgba(234,179,8,0.15)]">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-yellow-400 to-orange-500 text-background-dark text-[10px] font-black uppercase tracking-widest py-1 px-3 rounded-full shadow-lg whitespace-nowrap">En Çok Tercih Edilen</div>
                  <div className="text-yellow-400 mb-4 flex justify-between items-center mt-2">
                    <span className="material-symbols-outlined text-3xl">workspace_premium</span>
                    <span className="text-xs font-bold uppercase tracking-wider border border-yellow-500/30 px-2 py-1 rounded-full bg-yellow-500/10">Altın</span>
                  </div>
                  <div className="mb-6">
                    <div className="text-3xl font-black text-white">399<span className="text-sm text-gray-500 font-medium"> TL/ay</span></div>
                    <div className="text-xs text-yellow-500/80 mt-1">Standart Aile Paketi</div>
                  </div>
                  <ul className="space-y-3 mb-8 text-sm text-gray-300">
                    <li className="flex items-start gap-2"><span className="material-symbols-outlined text-yellow-500 text-[18px]">check_circle</span> Yılda 2 kez detaylı takım yıkama</li>
                    <li className="flex items-start gap-2"><span className="material-symbols-outlined text-yellow-500 text-[18px]">check_circle</span> Yılda 1 kez acil lokal müdahale</li>
                    <li className="flex items-start gap-2"><span className="material-symbols-outlined text-yellow-500 text-[18px]">check_circle</span> Ek hizmetlerde %30 indirim</li>
                    <li className="flex items-start gap-2"><span className="material-symbols-outlined text-yellow-500 text-[18px]">check_circle</span> Öncelikli randevu hakkı</li>
                  </ul>
                  <a href={`https://wa.me/${CONTACT_INFO.phone.replace(/\s+/g, '')}?text=${encodeURIComponent("Merhaba, ProClean Care (Altın Kasko) abonelik sistemi hakkında bilgi almak ve üye olmak istiyorum.")}`} target="_blank" rel="noopener noreferrer" className="block w-full text-center bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-background-dark font-bold py-3 rounded-xl transition-colors text-sm shadow-lg shadow-yellow-500/20">Altın Üye Ol</a>
                </div>

                {/* Platinum */}
                <div className="glass-card rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-cyan-500/10 to-transparent p-6 relative">
                  <div className="text-cyan-400 mb-4 flex justify-between items-center">
                    <span className="material-symbols-outlined text-3xl">diamond</span>
                    <span className="text-xs font-bold uppercase tracking-wider border border-cyan-500/30 px-2 py-1 rounded-full bg-cyan-500/10">Platin</span>
                  </div>
                  <div className="mb-6">
                    <div className="text-3xl font-black text-white">599<span className="text-sm text-gray-500 font-medium"> TL/ay</span></div>
                    <div className="text-xs text-cyan-400/80 mt-1">VIP & Evcil Hayvan Paketi</div>
                  </div>
                  <ul className="space-y-3 mb-8 text-sm text-gray-300">
                    <li className="flex items-start gap-2"><span className="material-symbols-outlined text-cyan-400 text-[18px]">check</span> Yılda 2 takım + 1 yatak yıkama</li>
                    <li className="flex items-start gap-2"><span className="material-symbols-outlined text-cyan-400 text-[18px]">check</span> Sınırsız acil lokal müdahale</li>
                    <li className="flex items-start gap-2"><span className="material-symbols-outlined text-cyan-400 text-[18px]">check</span> Tüm ek hizmetlerde %50 indirim</li>
                    <li className="flex items-start gap-2"><span className="material-symbols-outlined text-cyan-400 text-[18px]">check</span> Bayramlarda VIP randevu garantisi</li>
                  </ul>
                  <a href={`https://wa.me/${CONTACT_INFO.phone.replace(/\s+/g, '')}?text=${encodeURIComponent("Merhaba, ProClean Care (Platin VIP Kasko) abonelik sistemi hakkında bilgi almak ve üye olmak istiyorum.")}`} target="_blank" rel="noopener noreferrer" className="block w-full text-center bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-300 font-bold py-3 rounded-xl transition-colors text-sm">Platin Üye Ol</a>
                </div>
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
                  
                  <div className="border-t border-white/10 pt-4 mb-6 relative group">
                    <div className="flex justify-between items-end border-t border-white/5 pt-3 mb-2">
                      <div className="text-white font-bold text-sm">Ödenecek Tutar</div>
                      <div className="text-3xl font-black text-primary drop-shadow-[0_0_10px_rgba(45,212,191,0.5)]">
                        {total} TL
                      </div>
                    </div>
                    
                    {/* Return On Investment (Tasarruf) Banner */}
                    {total > 0 && (
                      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 mt-3 animate-fade-in relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        <div className="flex gap-2 items-start relative z-10">
                          <span className="material-symbols-outlined text-emerald-500 text-lg shrink-0">savings</span>
                          <div>
                            <p className="text-white text-xs font-bold leading-tight mb-1 flex items-center gap-1">
                              Tebrikler! <strong className="text-emerald-400">{(45000 - total).toLocaleString('tr-TR')} TL</strong> Tasarruf Ettiniz
                            </p>
                            <p className="text-gray-400 text-[10px] leading-relaxed">
                              Sıfır bir koltuk/yatak takımının ortalama maliyeti 45.000 TL'dir. NisanProClean ile eşyalarınızı ilk günkü yeniliğine kavuşturarak devasa bir bütçe tasarrufu sağladınız.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Upsell to Premium Packages Banner */}
                    {total >= 1500 && (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mt-3 animate-fade-in">
                        <div className="flex gap-2 items-start">
                          <span className="material-symbols-outlined text-yellow-500 text-lg shrink-0">lightbulb</span>
                          <div>
                            <p className="text-white text-xs font-bold leading-tight mb-1">
                              Bunu tek seferde ödemek yerine;
                            </p>
                            <p className="text-gray-400 text-[10px] leading-relaxed">
                              Ayda sadece <strong className="text-yellow-500">249 TL</strong>'ye Gümüş Üye olup bu işlemi yılda 1 kez bedavaya getirebileceğinizi biliyor muydunuz? <a href="#fiyat-hesapla" onClick={(e) => { e.preventDefault(); document.getElementById('kasko-paketleri')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-yellow-500 hover:underline">Paketleri İncele</a>
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* PayTR & Credit Card */}
                    <div className="mt-4 p-3 bg-white/5 border border-white/10 rounded-xl flex items-center gap-3">
                      <div className="flex -space-x-2 shrink-0">
                        <div className="size-8 rounded-full bg-[#1c1f27] border border-white/20 flex items-center justify-center z-20"><span className="text-[10px] font-bold text-white">VISA</span></div>
                        <div className="size-8 rounded-full bg-[#1c1f27] border border-white/20 flex items-center justify-center z-10"><span className="text-[10px] font-bold text-white">MC</span></div>
                      </div>
                      <div>
                        <p className="text-white text-xs font-bold">Tek Çekim & Nakit Ödeme</p>
                        <p className="text-gray-400 text-[10px]">*Taksitlendirme işlemi sadece VIP (Altın/Platin) Paketlerde sunulmaktadır.</p>
                      </div>
                    </div>

                    {/* 7 Day Guarantee */}
                    <div 
                      onClick={() => setIsGuaranteeModalOpen(true)}
                      className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 cursor-pointer hover:bg-red-500/20 transition-colors group"
                    >
                      <span className="material-symbols-outlined text-red-400 text-lg group-hover:scale-110 transition-transform">verified_user</span>
                      <div>
                        <p className="text-red-400 text-xs font-bold flex items-center gap-1">
                          7 Gün Memnuniyet Garantisi 
                          <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                        </p>
                        <p className="text-gray-400 text-[10px] leading-relaxed">Şartları okumak için tıklayın. Ücretsiz yeniden yıkama veya iade güvencesi.</p>
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

                  {/* Terms Checkbox */}
                  <div className="mb-4 flex items-start gap-3">
                    <input 
                      type="checkbox" 
                      id="terms" 
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-white/20 bg-background-dark text-primary focus:ring-primary focus:ring-offset-background-dark cursor-pointer"
                    />
                    <label htmlFor="terms" className="text-xs text-gray-400 leading-relaxed cursor-pointer select-none">
                      <button type="button" onClick={(e) => { e.preventDefault(); setIsGuaranteeModalOpen(true); }} className="text-primary hover:underline font-medium">Hizmet ve Garanti Şartnamesi</button>'ni okudum, anladım ve kabul ediyorum.
                    </label>
                  </div>

                  <button 
                    onClick={handleWhatsAppOrder}
                    disabled={!acceptedTerms}
                    className={`relative overflow-hidden w-full font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-lg group ${acceptedTerms ? 'bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-[0_0_20px_rgba(37,211,102,0.3)] hover:shadow-[0_0_30px_rgba(37,211,102,0.5)]' : 'bg-gray-700 text-gray-400 cursor-not-allowed'}`}
                  >
                    <span className="material-symbols-outlined relative z-10">chat</span>
                    <span className="relative z-10">WhatsApp'tan Randevu Al</span>
                    {acceptedTerms && <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shine z-0"></div>}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Guarantee Modal */}
      {isGuaranteeModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-dark border border-white/10 rounded-3xl p-6 md:p-8 max-w-2xl w-full relative max-h-[90vh] flex flex-col shadow-2xl">
            <button 
              onClick={() => setIsGuaranteeModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white bg-background-dark rounded-full p-1 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10 shrink-0">
              <div className="size-10 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined">gavel</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Hizmet ve Garanti Şartnamesi</h3>
                <p className="text-gray-400 text-xs">NisanProClean Müşteri Sözleşmesi</p>
              </div>
            </div>

            <div className="overflow-y-auto pr-2 custom-scrollbar text-sm text-gray-300 space-y-6">
              <section>
                <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-sm">cleaning_services</span>
                  1. Hizmetin Kapsamı
                </h4>
                <p className="leading-relaxed">Firmamız, endüstriyel vakum ve buhar makineleri ile profesyonel solüsyonlar kullanarak yerinde temizlik hizmeti sunmaktadır. Leke çıkarma işlemi, kumaşın türüne ve lekenin yapısına bağlı olarak kumaşa zarar vermeyecek maksimum eforla gerçekleştirilir.</p>
              </section>

              <section>
                <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-sm">person</span>
                  2. Müşterinin Sorumlulukları
                </h4>
                <ul className="list-disc pl-5 space-y-1 leading-relaxed">
                  <li>İşlem yapılacak alanda standart elektrik ve su temini müşteri tarafından sağlanmalıdır.</li>
                  <li>Temizlenecek eşyaların üzerindeki veya çevresindeki kırılabilir, değerli eşyalar işlem öncesi kaldırılmalıdır.</li>
                  <li>Daha önce kimyasal (çamaşır suyu, asitli temizleyiciler, market ürünleri vb.) müdahale görmüş lekeler işlem öncesinde ekibimize mutlaka bildirilmelidir.</li>
                </ul>
              </section>

              <section>
                <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-sm">verified_user</span>
                  3. 7 Gün Memnuniyet Garantisi ve İade Şartları
                </h4>
                <p className="leading-relaxed mb-2">Müşteri memnuniyetini sağlamak temel prensibimizdir. İşlem sonrası aşağıdaki şartlar geçerlidir:</p>
                <ul className="list-disc pl-5 space-y-1 leading-relaxed">
                  <li>Hizmet tamamlandıktan sonraki <strong>7 (yedi) takvim günü</strong> içerisinde kusma, lekenin geri çıkması veya bariz temizlik eksikliği tespit edilirse, firmamız <strong>1 (bir) defaya mahsus ücretsiz yeniden yıkama (rötuş)</strong> hizmeti sunmayı taahhüt eder. İkinci bir rötuş işlemi garanti kapsamında değildir.</li>
                  <li><strong>Ön Tespit ve Detaylı Analiz:</strong> Şikayet durumunda ekibimiz yerinde tespit yapar. İşlem öncesi ve sonrası çekilen fotoğraflar detaylı olarak incelenerek lekenin bizden mi kaynaklandığı, yoksa işlem sonrası yeni bir dökülme (kahve, çocuk/evcil hayvan idrarı vb.) mi olduğu kesin olarak tespit edilir. Yeni oluşan lekeler garanti dışıdır.</li>
                  <li>Yeniden yıkama işlemine rağmen, firmamızdan kaynaklı teknik bir hata nedeniyle sonuç alınamaması durumunda, hizmet bedelinin uygun görülen kısmı veya tamamı iade edilir.</li>
                  <li><strong>Puan İptali:</strong> İade işlemi gerçekleştiğinde veya garantinin kötüye kullanıldığı tespit edildiğinde, müşterinin hesabına tanımlanan tüm indirim kodları, nakit iadeler ve kazanılan puanlar sistemden kalıcı olarak silinir.</li>
                </ul>
              </section>

              <section>
                <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-400 text-sm">warning</span>
                  4. Garanti Kapsamı Dışındaki Durumlar
                </h4>
                <ul className="list-disc pl-5 space-y-1 leading-relaxed text-gray-400">
                  <li>6 aydan eski, kumaşın dokusuna işlemiş ve boya formunu almış kronik lekeler.</li>
                  <li>Müşteri tarafından daha önce yanlış kimyasallarla silinmiş ve kumaşa "sabitlenmiş" veya kumaşı yakmış lekeler.</li>
                  <li>Güneş yanığı, kumaş yıpranması, iplik atması, renk solması gibi fiziksel deformasyonlar kir/leke olarak değerlendirilemez ve garanti kapsamına girmez.</li>
                  <li>İşlem sonrası kuruma süresi (ortalama 4-6 saat) boyunca eşyanın kullanılması sonucu oluşan yeni lekeler ve deformasyonlar.</li>
                </ul>
              </section>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 shrink-0">
              <button 
                onClick={() => {
                  setAcceptedTerms(true);
                  setIsGuaranteeModalOpen(false);
                }}
                className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-primary/20"
              >
                Okudum ve Kabul Ediyorum
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default PricingCalculator;
