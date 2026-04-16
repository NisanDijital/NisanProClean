import React, { useState } from 'react';
import { CONTACT_INFO } from '../constants';

const REVIEWS = [
  {
    id: 1,
    text: "İki çocuklu bir evimiz var ve koltuklarımızın durumu gerçekten içler acısıydı. NisanProClean ekibi geldi, kumaşı detaylıca analiz edip işleme başladılar. Sonuç inanılmaz! Koltuklar ilk günkü gibi oldu, üstelik 4 saatte kurudu.",
    name: "Ayşe Y.",
    title: "Uydukent, Afyon",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop"
  },
  {
    id: 2,
    text: "Daha önce başka firmalara da yıkatmıştım ama hep bir kusma veya koku kalıyordu. Bu sefer buharlı yıkama tercih ettim. Hem lekeler tamamen çıktı hem de ev mis gibi koktu. Kesinlikle tavsiye ederim.",
    name: "Mehmet D.",
    title: "Erenler, Afyon",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop"
  },
  {
    id: 3,
    text: "Kedimizin koltuğa bıraktığı o inatçı kokudan ne yaptıysak kurtulamamıştık. Özel enzim bazlı şampuanları sayesinde kokudan eser kalmadı. İşlerini gerçekten profesyonel yapıyorlar.",
    name: "Zeynep K.",
    title: "Afyon Merkez",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&auto=format&fit=crop"
  }
];

const Testimonial: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [reviewText, setReviewText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const stars = '⭐'.repeat(rating);
    const message = `🎁 *YORUM & KAZAN KAMPANYASI* 🎁\n\n${stars}\n*İsim:* ${name}\n*Bölge:* ${location}\n*Yorum:* ${reviewText}\n\n📸 _Not: Öncesi/Sonrası fotoğraflarınızı bu mesaja ekleyebilirsiniz!_\n\n💡 Vaat edilen indirim kodumu / nakit iademi talep ediyorum.`;
    
    // Format phone number (remove spaces)
    const phone = CONTACT_INFO.whatsapp.replace(/\s/g, '');
    const encodedMessage = encodeURIComponent(message);
    
    window.open(`https://wa.me/90${phone}?text=${encodedMessage}`, '_blank');
    setIsModalOpen(false);
    
    // Reset form
    setName('');
    setLocation('');
    setReviewText('');
    setRating(5);
  };

  return (
    <section id="testimonials" className="py-32 relative overflow-hidden scroll-mt-24">
      <div className="absolute inset-0 bg-gradient-to-tr from-background-dark via-primary/5 to-background-dark -skew-y-3 z-0"></div>
      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
            <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" className="w-5 h-5" />
            <div className="flex text-yellow-500">
              <span className="material-symbols-outlined text-[16px] font-solid">star</span>
              <span className="material-symbols-outlined text-[16px] font-solid">star</span>
              <span className="material-symbols-outlined text-[16px] font-solid">star</span>
              <span className="material-symbols-outlined text-[16px] font-solid">star</span>
              <span className="material-symbols-outlined text-[16px] font-solid">star</span>
            </div>
            <span className="text-white font-bold text-sm">50+ Gerçek Müşteri Yorumu</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Müşterilerimiz Ne Diyor?</h2>
          <p className="text-gray-400">Afyon'da kalitemizi deneyimleyen müşterilerimizin gerçek yorumları.</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {REVIEWS.map((review) => (
            <div key={review.id} className="glass-card p-8 rounded-3xl border border-white/5 hover:border-primary/30 transition-colors relative">
              <div className="flex text-yellow-500 mb-6">
                <span className="material-symbols-outlined text-[18px] font-solid">star</span>
                <span className="material-symbols-outlined text-[18px] font-solid">star</span>
                <span className="material-symbols-outlined text-[18px] font-solid">star</span>
                <span className="material-symbols-outlined text-[18px] font-solid">star</span>
                <span className="material-symbols-outlined text-[18px] font-solid">star</span>
              </div>
              <p className="text-gray-300 mb-8 leading-relaxed italic">"{review.text}"</p>
              <div className="flex items-center gap-4 mt-auto">
                <div className="size-12 rounded-full overflow-hidden border-2 border-primary/50">
                  <img 
                    alt={review.name} 
                    className="w-full h-full object-cover" 
                    src={review.avatar}
                  />
                </div>
                <div>
                  <div className="text-white font-bold">{review.name}</div>
                  <div className="text-primary text-xs uppercase tracking-wider">{review.title}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Review Request & Incentive Hack */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-block p-[2px] rounded-2xl bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 shadow-[0_0_30px_rgba(250,204,21,0.3)] hover:shadow-[0_0_40px_rgba(250,204,21,0.5)] transition-shadow">
            <button
              onClick={() => setIsModalOpen(true)}
              className="relative bg-background-dark hover:bg-surface-dark text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all flex items-center gap-3"
            >
              <span className="material-symbols-outlined text-yellow-400 animate-pulse">redeem</span>
              <span>Yorum Yap & 150 TL Kazan!</span>
            </button>
          </div>
          <p className="text-gray-400 text-sm mt-6 leading-relaxed">
            Hizmetimizden memnun kaldınız mı? Yorumunuzu ve <strong className="text-white">öncesi/sonrası fotoğrafınızı</strong> bizimle paylaşın, anında <strong className="text-white">150 TL Nakit İade</strong> veya bir sonraki işleminizde <strong className="text-white">%20 İndirim</strong> kazanın!
          </p>
        </div>
      </div>

      {/* Review Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-dark border border-white/10 rounded-3xl p-6 md:p-8 max-w-md w-full relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            
            <div className="text-center mb-6">
              <div className="size-12 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined">stars</span>
              </div>
              <h3 className="text-2xl font-bold text-white">Değerlendir & Kazan</h3>
              <p className="text-gray-400 text-sm mt-1">Yorumunuzu yazın, ödülünüzü kapın.</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Star Rating */}
              <div className="flex justify-center gap-2 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <span className={`material-symbols-outlined text-3xl ${star <= rating ? 'text-yellow-500 font-solid' : 'text-gray-600'}`}>
                      star
                    </span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">İsim Soyisim</label>
                  <input 
                    required
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#111318] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    placeholder="Örn: Ahmet Y."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Bölge / Mahalle</label>
                  <input 
                    required
                    type="text" 
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-[#111318] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    placeholder="Örn: Erenler"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Yorumunuz</label>
                <textarea 
                  required
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows={3}
                  className="w-full bg-[#111318] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none"
                  placeholder="Hizmetimizden ne kadar memnun kaldınız?"
                ></textarea>
              </div>

              <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 flex items-start gap-3">
                <span className="material-symbols-outlined text-primary shrink-0">add_a_photo</span>
                <p className="text-xs text-gray-300 leading-relaxed">
                  <strong className="text-white">Fotoğraf Ekleme:</strong> Yorumunuzu gönderdikten sonra açılacak olan WhatsApp penceresinde, öncesi/sonrası fotoğraflarınızı mesaja ekleyebilirsiniz.
                </p>
              </div>

              <button 
                type="submit"
                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl mt-2 flex items-center justify-center gap-2 transition-colors shadow-lg shadow-green-900/20"
              >
                <span className="material-symbols-outlined">send</span>
                <span>WhatsApp ile Gönder & Kazan</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default Testimonial;