import React from "react";

interface SplitSectionProps {
  image: string;
  imageAlt: string;
  category: string;
  title: string;
  description: string;
  reverse?: boolean;
  theme: "primary" | "secondary";
  children: React.ReactNode;
}

const SplitSection: React.FC<SplitSectionProps> = ({
  image,
  imageAlt,
  category,
  title,
  description,
  reverse = false,
  theme,
  children,
}) => {
  const lineColor = theme === "primary" ? "bg-primary" : "bg-secondary";
  const textColor = theme === "primary" ? "text-primary" : "text-secondary";
  const overlayColor = theme === "primary" ? "bg-secondary/10" : "bg-primary/10";

  return (
    <div className="group grid lg:grid-cols-2 gap-12 items-center">
      <div
        className={`relative rounded-2xl overflow-hidden aspect-[4/3] border border-white/5 ${
          reverse ? "lg:order-2 order-1" : "lg:order-1 order-1"
        }`}
      >
        <div className={`absolute inset-0 ${overlayColor} group-hover:bg-transparent transition-all duration-500 z-10`} />
        <img
          src={image}
          alt={imageAlt}
          width={1200}
          height={900}
          sizes="(max-width: 1024px) 100vw, 50vw"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
        />
      </div>

      <div
        className={`flex flex-col gap-6 items-start ${
          reverse ? "lg:order-1 order-2 lg:items-end lg:text-right" : "lg:order-2 order-2"
        }`}
      >
        <div className={`${textColor} font-bold tracking-widest text-sm uppercase flex items-center gap-2 ${reverse ? "lg:flex-row-reverse" : ""}`}>
          <span className={`w-8 h-[2px] ${lineColor}`} />
          {category}
        </div>
        <h3 className="text-4xl font-bold text-white">{title}</h3>
        <p className="text-gray-400 leading-relaxed text-lg">{description}</p>
        {children}
      </div>
    </div>
  );
};

export default SplitSection;
