import React from 'react';
import { IMAGES } from '../constants';

const REVIEWS = [
  {
    id: 1,
    text: "Koltuklarımın renginin bu kadar canlı olduğunu unutmuştum. Çıkan kirli suyu görünce gözlerime inanamadım. NisanProClean ekibi gerçek bir sihirbaz!",
    name: "Ayşe Yılmaz",
    title: "Ev Hanımı, Afyon",
    avatar: IMAGES.avatar
  },
  {
    id: 2,
    text: "Aracımın koltuklarındaki o inatçı su lekelerinden eser kalmadı. Hem çok hızlılar hem de işlerini gerçekten titizlikle yapıyorlar. Kesinlikle tavsiye ederim.",
    name: "Burak Çelik",
    title: "Esnaf, Afyon",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop"
  },
  {
    id: 3,
    text: "Yatağımdaki sararmalar ve kötü koku tamamen gitti. Buharlı temizlik sayesinde artık çok daha rahat ve sağlıklı uyuyorum. Ellerinize sağlık.",
    name: "Merve Kaya",
    title: "Öğretmen, Afyon",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&auto=format&fit=crop"
  }
];

const Testimonial: React.FC = () => {
  return (
    <section id="testimonials" className="py-32 relative overflow-hidden scroll-mt-24">
      <div className="absolute inset-0 bg-gradient-to-tr from-background-dark via-primary/5 to-background-dark -skew-y-3 z-0"></div>
      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <span className="material-symbols-outlined text-6xl text-primary opacity-50 mb-4">format_quote</span>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Müşterilerimiz Ne Diyor?</h2>
          <p className="text-gray-400">Afyon'da 250+ ailenin güvenini kazandık.</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
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
      </div>
    </section>
  );
};

export default Testimonial;