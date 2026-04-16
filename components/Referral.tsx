import React, { useState } from 'react';

const Referral: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [referralData, setReferralData] = useState<{ code: string; points: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) return;
    
    setIsLoading(true);
    
    // Simüle edilmiş API çağrısı (Preview ortamı için)
    // Hostinger'a yüklendiğinde burası api.php'ye istek atacak şekilde değiştirilebilir.
    setTimeout(() => {
      // Rastgele bir kod oluştur
      const newCode = "NPN" + Math.floor(1000 + Math.random() * 9000);
      // Rastgele bir puan durumu (0 ile 5 arası)
      const randomPoints = Math.floor(Math.random() * 3); 
      
      setReferralData({ code: newCode, points: randomPoints });
      setIsLoading(false);
    }, 1500);
  };

  const copyToClipboard = () => {
    if (referralData) {
      navigator.clipboard.writeText(referralData.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section id="referans" className="py-24 px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto">
        <div className="glass-card rounded-3xl p-8 md:p-12 border border-primary/20 relative overflow-hidden">
          {/* Decorative element */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/30 to-secondary/30 blur-[80px] -z-10"></div>

          <div className="flex flex-col lg:flex-row gap-12 items-center">
            <div className="lg:w-1/2 space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary font-medium text-sm">
                <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
                Puan = Para Sistemi
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">
                Temizliği <span className="text-gradient-primary">Bedavaya</span> Getirin!
              </h2>
              <p className="text-gray-300 text-lg leading-relaxed">
                Memnuniyetinizi komşularınızla ve sevdiklerinizle paylaşın, her ikiniz de kazanın. Biriktirdiğiniz puanlarla bir sonraki hijyen hizmetinizi tamamen ücretsiz alabilirsiniz.
              </p>
              
              <ul className="space-y-6 mt-8">
                <li className="flex items-start gap-4">
                  <div className="size-12 rounded-full bg-surface-dark border border-gray-700 flex items-center justify-center shrink-0 text-primary font-bold text-xl shadow-lg">1</div>
                  <div>
                    <h4 className="text-white font-bold text-lg">Kodunuzu Paylaşın</h4>
                    <p className="text-gray-400 text-sm mt-1">Size özel oluşturulan referans kodunu WhatsApp'tan komşunuza veya akrabanıza gönderin.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="size-12 rounded-full bg-surface-dark border border-gray-700 flex items-center justify-center shrink-0 text-primary font-bold text-xl shadow-lg">2</div>
                  <div>
                    <h4 className="text-white font-bold text-lg">Arkadaşınız %10 İndirim Alsın</h4>
                    <p className="text-gray-400 text-sm mt-1">Arkadaşınız sizin kodunuzla sipariş verdiğinde anında %10 indirimden faydalansın.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="size-12 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center shrink-0 text-primary font-bold text-xl shadow-[0_0_15px_rgba(6,182,212,0.3)]">3</div>
                  <div>
                    <h4 className="text-white font-bold text-lg">Siz Puan (₺) Kazanın</h4>
                    <p className="text-gray-400 text-sm mt-1">Tamamlanan her işlemde cüzdanınıza TL değerinde puan yüklenir. Yeterli puana ulaşınca hizmetiniz bedava!</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="lg:w-1/2 w-full">
              <div className="glass rounded-2xl p-6 md:p-8 border border-gray-800 shadow-2xl relative">
                {/* Expiry Badge */}
                <div className="absolute -top-4 -right-4 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg transform rotate-3 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">timer</span>
                  Puanlar 6 Ay Geçerli!
                </div>

                {!referralData ? (
                  <form onSubmit={handleGenerateCode} className="flex flex-col h-full justify-center py-4">
                    <div className="text-center mb-8">
                      <div className="size-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
                        <span className="material-symbols-outlined text-3xl">qr_code_scanner</span>
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">Sisteme Giriş Yapın</h3>
                      <p className="text-gray-400 text-sm">Telefon numaranızı girerek size özel referans kodunuzu oluşturun veya mevcut puan durumunuzu görüntüleyin.</p>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider font-bold">Telefon Numaranız</label>
                        <input 
                          type="tel" 
                          placeholder="05XX XXX XX XX" 
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full bg-background-dark border border-gray-700 rounded-xl p-4 text-white focus:outline-none focus:border-primary transition-colors"
                          required
                        />
                      </div>
                      <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full bg-primary hover:bg-cyan-600 text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] flex items-center justify-center gap-2 text-lg disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {isLoading ? (
                          <span className="material-symbols-outlined animate-spin">sync</span>
                        ) : (
                          <>
                            <span>Kodumu Oluştur / Sorgula</span>
                            <span className="material-symbols-outlined">arrow_forward</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="animate-fade-in">
                    <div className="text-center mb-8">
                      <h3 className="text-xl font-bold text-white mb-2">Ödül Hedefiniz</h3>
                      <p className="text-gray-400 text-sm">5 Arkadaş = 1 Bedava L Koltuk Yıkama</p>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="relative h-6 bg-surface-dark rounded-full overflow-hidden mb-3 border border-gray-700 shadow-inner">
                      <div 
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-secondary rounded-full relative transition-all duration-1000"
                        style={{ width: `${(referralData.points / 5) * 100}%` }}
                      >
                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between text-xs font-medium text-gray-500 mb-8 px-1">
                      <span>Başlangıç</span>
                      <span className="text-primary font-bold text-sm">{referralData.points} Arkadaş (Mevcut)</span>
                      <span>5 Arkadaş</span>
                    </div>

                    <div className="bg-surface-dark rounded-xl p-5 border border-gray-800 mb-6">
                      <label className="block text-xs text-gray-400 mb-3 uppercase tracking-wider font-bold">Size Özel Referans Kodunuz</label>
                      <div className="flex items-center justify-between bg-background-dark rounded-lg p-4 border border-gray-700">
                        <span className="text-white font-mono text-xl tracking-widest">{referralData.code}</span>
                        <button 
                          onClick={copyToClipboard}
                          className="text-primary hover:text-white transition-colors bg-primary/10 p-2 rounded-md hover:bg-primary/20 flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined">{copied ? 'check' : 'content_copy'}</span>
                          <span className="text-xs font-bold">{copied ? 'Kopyalandı' : 'Kopyala'}</span>
                        </button>
                      </div>
                    </div>

                    <button 
                      onClick={() => setReferralData(null)}
                      className="w-full bg-surface-dark hover:bg-gray-800 border border-gray-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">logout</span>
                      <span>Çıkış Yap</span>
                    </button>
                  </div>
                )}
                
                <p className="text-center text-gray-500 text-xs mt-4">
                  *Kazanılan puanlar 6 ay (180 gün) içerisinde kullanılmalıdır.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Kurumsal Partnerlik Banner */}
        <div className="mt-8 glass-card rounded-3xl p-8 border border-secondary/20 relative overflow-hidden bg-gradient-to-r from-surface-dark to-background-dark">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-secondary to-primary"></div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="md:w-2/3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary font-medium text-xs mb-4">
                <span className="material-symbols-outlined text-sm">domain</span>
                Kurumsal Partnerlik
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">İşletmeler İçin B2B İndirim Sistemi</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Sadece bireysel müşterilerimiz değil, kurumsal partnerlerimiz de kazanıyor. İş ağınızdaki diğer firmaları önererek <strong className="text-white">kurumsal indirimler</strong> kazanabilir veya çalışanlarınıza özel <strong className="text-white">"Personel İndirim Kodu"</strong> tanımlayarak onlara harika bir yan hak sunabilirsiniz.
              </p>
              <div className="flex flex-wrap gap-4 mt-6">
                <div className="flex items-center gap-2 text-sm text-gray-300 bg-surface-dark px-3 py-1.5 rounded-lg border border-gray-700">
                  <span className="material-symbols-outlined text-secondary text-sm">receipt_long</span>
                  Kurumsal İndirim
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300 bg-surface-dark px-3 py-1.5 rounded-lg border border-gray-700">
                  <span className="material-symbols-outlined text-secondary text-sm">badge</span>
                  Personel Yan Hakkı
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300 bg-surface-dark px-3 py-1.5 rounded-lg border border-gray-700">
                  <span className="material-symbols-outlined text-secondary text-sm">verified</span>
                  Öncelikli Hizmet
                </div>
              </div>
            </div>
            <div className="md:w-1/3 flex justify-end w-full">
              <a href="#contact" className="w-full md:w-auto px-8 py-4 bg-surface-dark border border-secondary/50 hover:bg-secondary/10 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                <span>Kurumsal Teklif Al</span>
                <span className="material-symbols-outlined text-secondary">arrow_forward</span>
              </a>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default Referral;
