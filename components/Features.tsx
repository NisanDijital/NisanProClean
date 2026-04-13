import React from 'react';

const Features: React.FC = () => {
  return (
    <section id="features" className="py-32 px-4 relative scroll-mt-24">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-start mb-20">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
              NisanProClean<br/><span className="text-primary">Temizlik Felsefesi</span>
            </h2>
            <p className="text-lg text-gray-400 font-light max-w-md">
              Koltuklarınız sadece silinmiyor, dokusuna kadar yenileniyor. Patentli vakum teknolojimiz ve anti-bakteriyel solüsyonlarımızla evinizdeki konforu tazeliyoruz.
            </p>
          </div>
          <div className="flex items-end justify-end">
            <button className="text-white border-b border-primary pb-1 hover:text-primary transition-colors flex items-center gap-2">
              Teknolojimiz hakkında bilgi edinin <span className="material-symbols-outlined text-sm">arrow_outward</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <FeatureCard 
            icon="chair" 
            title="Profesyonel Koltuk Yıkama" 
            description="Kumaş türüne özel şampuanlarla, döşemelerinize zarar vermeden lekeleri ve maytları %99 oranında yok ediyoruz."
            theme="primary"
          />
          <FeatureCard 
            icon="bed" 
            title="Yatak Hijyeni" 
            description="Yüksek vakum gücü ve sıcak buhar teknolojisiyle yataklarınızdaki alerjenleri, ölü derileri ve bakterileri tamamen temizliyoruz."
            theme="secondary"
          />
          <FeatureCard 
            icon="directions_car" 
            title="Araç Koltuk Temizliği" 
            description="Aracınızın koltuklarını sökmeden, yerinde temizliyoruz. İşlem için sadece elektrik alabileceğimiz bir yer göstermeniz yeterlidir."
            theme="primary"
          />
        </div>
      </div>
    </section>
  );
};

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  theme: 'primary' | 'secondary';
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, theme }) => {
  const themeColor = theme === 'primary' ? 'text-primary' : 'text-secondary';
  const shadowColor = theme === 'primary' ? 'shadow-[0_0_15px_rgba(6,182,212,0.2)]' : 'shadow-[0_0_15px_rgba(59,130,246,0.2)]';
  const glowColor = theme === 'primary' ? 'bg-primary/10 group-hover:bg-primary/20' : 'bg-secondary/10 group-hover:bg-secondary/20';

  return (
    <div className="glass-card p-8 rounded-2xl flex flex-col gap-6 relative group overflow-hidden">
      <div className={`absolute top-0 right-0 w-32 h-32 ${glowColor} rounded-full blur-[40px] transition-all duration-500`}></div>
      <div className={`size-12 rounded-xl bg-surface-dark border border-white/10 flex items-center justify-center ${themeColor} mb-4 z-10 ${shadowColor} transition-transform duration-500 ease-out group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-[0_0_25px_rgba(6,182,212,0.4)]`}>
        <span className="material-symbols-outlined transition-transform duration-300 group-hover:scale-110">{icon}</span>
      </div>
      <div className="z-10">
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
};

export default Features;