import React, { useState } from 'react';

const Referral: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [referralData, setReferralData] = useState<{ code: string; points: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const fallbackGenerate = async (normalizedPhone: string) => {
    const response = await fetch('/api.php?action=generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ phone: normalizedPhone }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Sorgu isleminde bir hata olustu.');
    }
    setReferralData({
      code: String(data.code || ''),
      points: Number(data.points || 0),
    });
    setInfoMessage('Guvenli kod servisi aktif olmadigi icin standart sorgu modu kullanildi.');
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    const normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.length < 10) {
      setError('Lutfen gecerli bir telefon numarasi girin.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api.php?action=referral_otp_request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ phone: normalizedPhone }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Sorgu isleminde bir hata olustu.');
      }
      setOtpSent(true);
      setOtp('');
      setInfoMessage('Dogrulama kodu gonderildi. Lutfen kodu girin.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sorgu isleminde bir hata olustu.';
      if (
        message.includes('Dogrulama sistemi devre disi') ||
        message.includes('Dogrulama kodu gonderilemedi') ||
        message.includes('notify_')
      ) {
        try {
          await fallbackGenerate(normalizedPhone);
        } catch (fallbackErr) {
          const fallbackMessage = fallbackErr instanceof Error ? fallbackErr.message : 'Sorgu isleminde bir hata olustu.';
          setError(fallbackMessage);
        }
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    const normalizedPhone = phone.replace(/\D/g, '');
    const normalizedOtp = otp.replace(/\D/g, '');
    if (normalizedPhone.length < 10 || normalizedOtp.length !== 6) {
      setError('Telefon veya dogrulama kodu gecersiz.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api.php?action=referral_otp_verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ phone: normalizedPhone, otp: normalizedOtp }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Kod dogrulanamadi.');
      }
      setReferralData({
        code: String(data.code || ''),
        points: Number(data.points || 0),
      });
      setInfoMessage(
        data.existing
          ? 'Hesabiniz dogrulandi. Guncel puaniniz gosteriliyor.'
          : 'Hesap olusturuldu ve dogrulandi.'
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Kod dogrulanamadi.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!referralData) return;
    navigator.clipboard.writeText(referralData.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="referans" className="py-24 px-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] -z-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto">
        <div className="glass-card rounded-3xl p-8 md:p-12 border border-primary/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/30 to-secondary/30 blur-[80px] -z-10" />

          <div className="flex flex-col lg:flex-row gap-12 items-center">
            <div className="lg:w-1/2 space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary font-medium text-sm">
                <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
                Puan = Para Sistemi
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">
                Temizligi <span className="text-gradient-primary">Bedavaya</span> Getirin!
              </h2>
              <p className="text-gray-300 text-lg leading-relaxed">
                Referans kodunuzu paylasin, tamamlanan islemlerden puan biriktirin ve sonraki temizliklerde indirim/bedava hizmet kazanin.
              </p>

              <ul className="space-y-6 mt-8">
                <li className="flex items-start gap-4">
                  <div className="size-12 rounded-full bg-surface-dark border border-gray-700 flex items-center justify-center shrink-0 text-primary font-bold text-xl shadow-lg">1</div>
                  <div>
                    <h4 className="text-white font-bold text-lg">Kodunuzu Paylasin</h4>
                    <p className="text-gray-400 text-sm mt-1">Size ozel referans kodunu yakininiza gonderin.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="size-12 rounded-full bg-surface-dark border border-gray-700 flex items-center justify-center shrink-0 text-primary font-bold text-xl shadow-lg">2</div>
                  <div>
                    <h4 className="text-white font-bold text-lg">Musteri Indirim Alsin</h4>
                    <p className="text-gray-400 text-sm mt-1">Kod kullanilan sipariste musteriniz indirim alir.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="size-12 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center shrink-0 text-primary font-bold text-xl shadow-[0_0_15px_rgba(6,182,212,0.3)]">3</div>
                  <div>
                    <h4 className="text-white font-bold text-lg">Puaninizi Harcayin</h4>
                    <p className="text-gray-400 text-sm mt-1">Puanlar admin tarafindan bakiyenize tanimlanir ve kampanyalarda kullanilir.</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="lg:w-1/2 w-full">
              <div className="glass rounded-2xl p-6 md:p-8 border border-gray-800 shadow-2xl relative">
                <div className="absolute -top-4 -right-4 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg transform rotate-3 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">timer</span>
                  Puanlar 6 Ay Gecerli
                </div>

                {!referralData ? (
                  <form onSubmit={otpSent ? handleVerifyOtp : handleRequestOtp} className="flex flex-col h-full justify-center py-4">
                    <div className="text-center mb-8">
                      <div className="size-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
                        <span className="material-symbols-outlined text-3xl">qr_code_scanner</span>
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">{otpSent ? 'Dogrulama Kodu Girin' : 'Sisteme Giris Yapin'}</h3>
                      <p className="text-gray-400 text-sm">
                        {otpSent
                          ? 'Telefonunuza gonderilen 6 haneli kodu girin.'
                          : 'Telefon numaranizi girerek mevcut puaninizi guvenli sekilde goruntuleyin.'}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider font-bold">Telefon Numaraniz</label>
                        <input
                          type="tel"
                          placeholder="05XX XXX XX XX"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full bg-background-dark border border-gray-700 rounded-xl p-4 text-white focus:outline-none focus:border-primary transition-colors disabled:opacity-60"
                          disabled={otpSent}
                          required
                        />
                      </div>

                      {otpSent && (
                        <div>
                          <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider font-bold">6 Haneli Kod</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="123456"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            className="w-full bg-background-dark border border-gray-700 rounded-xl p-4 text-white focus:outline-none focus:border-primary transition-colors"
                            required
                          />
                        </div>
                      )}

                      {error && (
                        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                          {error}
                        </div>
                      )}

                      {infoMessage && (
                        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                          {infoMessage}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-primary hover:bg-cyan-600 text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] flex items-center justify-center gap-2 text-lg disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {isLoading ? (
                          <span className="material-symbols-outlined animate-spin">sync</span>
                        ) : (
                          <>
                            <span>{otpSent ? 'Kodu Dogrula' : 'Dogrulama Kodu Gonder'}</span>
                            <span className="material-symbols-outlined">arrow_forward</span>
                          </>
                        )}
                      </button>

                      {otpSent && (
                        <button
                          type="button"
                          onClick={() => {
                            setOtpSent(false);
                            setOtp('');
                            setInfoMessage('');
                            setError('');
                          }}
                          className="w-full bg-surface-dark hover:bg-gray-800 border border-gray-700 text-white font-bold py-3 rounded-xl transition-all"
                        >
                          Numarayi Degistir
                        </button>
                      )}
                    </div>
                  </form>
                ) : (
                  <div className="animate-fade-in">
                    {infoMessage && (
                      <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                        {infoMessage}
                      </div>
                    )}

                    <div className="text-center mb-8">
                      <h3 className="text-xl font-bold text-white mb-2">Odul Hedefiniz</h3>
                      <p className="text-gray-400 text-sm">5 referans = 1 bedava L koltuk yikama</p>
                    </div>

                    <div className="relative h-6 bg-surface-dark rounded-full overflow-hidden mb-3 border border-gray-700 shadow-inner">
                      <div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-secondary rounded-full relative transition-all duration-1000"
                        style={{ width: `${(Math.min(referralData.points, 5) / 5) * 100}%` }}
                      >
                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                      </div>
                    </div>

                    <div className="flex justify-between text-xs font-medium text-gray-500 mb-8 px-1">
                      <span>Baslangic</span>
                      <span className="text-primary font-bold text-sm">{referralData.points} Puan</span>
                      <span>5 Puan</span>
                    </div>

                    <div className="bg-surface-dark rounded-xl p-5 border border-gray-800 mb-6">
                      <label className="block text-xs text-gray-400 mb-3 uppercase tracking-wider font-bold">Size Ozel Referans Kodunuz</label>
                      <div className="flex items-center justify-between bg-background-dark rounded-lg p-4 border border-gray-700">
                        <span className="text-white font-mono text-xl tracking-widest">{referralData.code}</span>
                        <button
                          type="button"
                          onClick={copyToClipboard}
                          className="text-primary hover:text-white transition-colors bg-primary/10 p-2 rounded-md hover:bg-primary/20 flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined">{copied ? 'check' : 'content_copy'}</span>
                          <span className="text-xs font-bold">{copied ? 'Kopyalandi' : 'Kopyala'}</span>
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setReferralData(null);
                        setInfoMessage('');
                        setError('');
                        setOtp('');
                        setOtpSent(false);
                      }}
                      className="w-full bg-surface-dark hover:bg-gray-800 border border-gray-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">logout</span>
                      <span>Cikis Yap</span>
                    </button>
                  </div>
                )}

                <p className="text-center text-gray-500 text-xs mt-4">
                  *Kazanilan puanlar 6 ay (180 gun) icinde kullanilmalidir.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 glass-card rounded-3xl p-8 border border-secondary/20 relative overflow-hidden bg-gradient-to-r from-surface-dark to-background-dark">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-secondary to-primary" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="md:w-2/3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary font-medium text-xs mb-4">
                <span className="material-symbols-outlined text-sm">domain</span>
                Kurumsal Partnerlik
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Isletmeler Icin B2B Indirim Sistemi</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Kurumsal musteri yonlendirmeleri icin ozel indirim ve personel yan hak paketleri sunuyoruz.
              </p>
            </div>
            <div className="md:w-1/3 flex justify-end w-full">
              <a
                href="#contact"
                className="w-full md:w-auto px-8 py-4 bg-surface-dark border border-secondary/50 hover:bg-secondary/10 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]"
              >
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
