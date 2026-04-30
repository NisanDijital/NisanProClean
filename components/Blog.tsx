import React, { useEffect, useMemo, useState } from "react";
import { fetchBlogPosts, type ApiBlogPost } from "../apiClient";
import { BLOG_CATEGORIES, BLOG_POSTS } from "../contentConstants";
import OptimizedImage from "./OptimizedImage";

type BlogPostView = {
  id: number | string;
  title: string;
  category: string;
  image: string;
  date: string;
  excerpt: string;
  content: string;
};

const formatBlogDate = (value?: string) => {
  if (!value) return "";
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
};

const mapApiPost = (post: ApiBlogPost): BlogPostView => ({
  id: post.id || post.slug,
  title: post.title,
  category: post.category || "Yerel Rehber",
  image: post.image || BLOG_POSTS[0]?.image || "",
  date: formatBlogDate(post.published_at || post.created_at),
  excerpt: post.excerpt,
  content: post.content,
});

const Blog: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState("Tumu");
  const [apiPosts, setApiPosts] = useState<BlogPostView[]>([]);

  useEffect(() => {
    let isMounted = true;
    void fetchBlogPosts().then((posts) => {
      if (!isMounted || posts.length === 0) return;
      setApiPosts(posts.map(mapApiPost));
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const posts = apiPosts.length > 0 ? apiPosts : BLOG_POSTS;
  const categories = useMemo(
    () => ["Tumu", ...Array.from(new Set(posts.map((post) => post.category).filter(Boolean)))],
    [posts]
  );
  const visibleCategories = apiPosts.length > 0 ? categories : BLOG_CATEGORIES;

  useEffect(() => {
    if (!visibleCategories.includes(activeCategory)) {
      setActiveCategory("Tumu");
    }
  }, [activeCategory, visibleCategories]);

  const filteredPosts =
    activeCategory === "Tumu"
      ? posts
      : posts.filter((post) => post.category === activeCategory);

  return (
    <section id="blog" className="py-24 px-4 relative bg-background-dark/50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-primary font-bold tracking-widest text-sm uppercase mb-3 block">
            Guncel Bilgiler
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Temizlik Rehberi ve Ipuclari
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Ev hijyeni, leke cikarma yontemleri ve profesyonel temizlik
            teknolojileri hakkinda uzman gorusleri.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {visibleCategories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 border ${
                activeCategory === category
                  ? "bg-primary border-primary text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] transform scale-105"
                  : "bg-surface-dark border-white/10 text-gray-400 hover:text-white hover:border-primary/50 hover:bg-white/5"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div key={activeCategory} className="grid md:grid-cols-3 gap-8">
          {filteredPosts.map((post, index) => (
            <article
              key={post.id}
              className="glass rounded-2xl overflow-hidden group hover:border-primary/40 transition-colors flex flex-col h-full animate-fade-in-down"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="h-48 overflow-hidden relative">
                <div className="absolute inset-0 bg-primary/20 group-hover:bg-transparent transition-colors z-10" />
                <div className="absolute top-4 left-4 z-20">
                  <span className="bg-surface-dark/90 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    {post.category}
                  </span>
                </div>
                <OptimizedImage
                  src={post.image}
                  alt={post.title}
                  width={1200}
                  height={675}
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="p-8 flex flex-col flex-grow">
                <div className="flex justify-between items-center mb-3">
                  <div className="text-primary text-xs font-bold uppercase tracking-wider">
                    {post.date}
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white mb-4 group-hover:text-primary transition-colors">
                  {post.title}
                </h3>
                <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                  {post.excerpt}
                </p>

                <div className="mt-auto border-t border-white/5 pt-4">
                  <p
                    className="text-gray-300 text-sm leading-relaxed line-clamp-3"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                  />
                  <button className="mt-4 text-primary text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                    Devamini Oku{" "}
                    <span className="material-symbols-outlined text-sm">
                      arrow_forward
                    </span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {filteredPosts.length === 0 && (
          <div className="text-center py-12 text-gray-500 animate-fade-in-down">
            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">
              search_off
            </span>
            <p>Bu kategoride henuz yazi bulunmamaktadir.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default Blog;
