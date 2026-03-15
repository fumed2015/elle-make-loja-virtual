import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, Eye, Tag, Search, BookOpen } from "lucide-react";
import { useBlogPosts } from "@/hooks/useBlogPosts";
import SEOHead from "@/components/SEOHead";
import Breadcrumbs, { breadcrumbJsonLd } from "@/components/Breadcrumbs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const POPULAR_TAGS = [
  "maquiagem", "skincare", "tutorial", "resenha", "tendências",
  "dicas", "pele oleosa", "batom", "base", "protetor solar",
];

const breadcrumbItems = [{ label: "Blog" }];

const Blog = () => {
  const { data: posts, isLoading } = useBlogPosts();
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const filteredPosts = useMemo(() => {
    if (!posts) return [];
    return posts.filter((post) => {
      const matchesSearch =
        !search ||
        post.title.toLowerCase().includes(search.toLowerCase()) ||
        post.excerpt?.toLowerCase().includes(search.toLowerCase());
      const matchesTag =
        !activeTag || post.tags?.includes(activeTag);
      return matchesSearch && matchesTag;
    });
  }, [posts, search, activeTag]);

  const featuredPost = filteredPosts[0];
  const otherPosts = filteredPosts.slice(1);

  const blogJsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Blog Elle Make - Dicas de Maquiagem e Beleza",
    description: "Artigos, tutoriais e resenhas sobre maquiagem, skincare e beleza. Dicas de especialistas para realçar sua beleza natural.",
    url: "https://www.ellemake.com.br/blog",
    publisher: {
      "@type": "Organization",
      name: "Elle Make",
      logo: { "@type": "ImageObject", url: "https://www.ellemake.com.br/favicon.png" },
    },
  };

  const formatDate = (date: string | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "numeric", month: "long", year: "numeric",
    });
  };

  const readTime = (content: string | null) => {
    if (!content) return "2 min";
    const words = content.split(/\s+/).length;
    return `${Math.max(2, Math.ceil(words / 200))} min`;
  };

  return (
    <>
      <SEOHead
        title="Blog - Dicas de Maquiagem e Beleza"
        description="Artigos, tutoriais e resenhas sobre maquiagem, skincare e beleza. Dicas para realçar sua beleza natural com os melhores produtos."
        jsonLd={[breadcrumbJsonLd(breadcrumbItems), blogJsonLd]}
      />
      <Breadcrumbs items={breadcrumbItems} />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
            <BookOpen className="w-3.5 h-3.5" />
            Blog de Beleza
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
            Dicas de Maquiagem & Beleza
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Tutoriais, resenhas e tendências para você arrasar no make. Conteúdo atualizado toda semana.
          </p>
        </div>

        {/* Search + Tags */}
        <div className="max-w-2xl mx-auto mb-10 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar artigos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {POPULAR_TAGS.map((tag) => (
              <Badge
                key={tag}
                variant={activeTag === tag ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary/10 transition-colors capitalize"
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-48 w-full rounded-xl" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium">Nenhum artigo encontrado</p>
            <p className="text-sm">Tente buscar por outro termo ou categoria.</p>
          </div>
        ) : (
          <>
            {/* Featured Post */}
            {featuredPost && !search && !activeTag && (
              <Link
                to={`/blog/${featuredPost.slug}`}
                className="block mb-10 group"
              >
                <article className="grid md:grid-cols-2 gap-6 bg-card rounded-2xl overflow-hidden border border-border hover:shadow-lg transition-shadow">
                  {featuredPost.cover_image ? (
                    <div className="aspect-[16/9] md:aspect-auto overflow-hidden">
                      <img
                        src={featuredPost.cover_image}
                        alt={featuredPost.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="eager"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[16/9] md:aspect-auto bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <BookOpen className="w-16 h-16 text-primary/30" />
                    </div>
                  )}
                  <div className="p-6 flex flex-col justify-center">
                    <Badge className="w-fit mb-3 bg-primary/10 text-primary border-0">Destaque</Badge>
                    <h2 className="text-xl md:text-2xl font-display font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                      {featuredPost.title}
                    </h2>
                    {featuredPost.excerpt && (
                      <p className="text-muted-foreground text-sm mb-4 line-clamp-3">{featuredPost.excerpt}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(featuredPost.published_at)}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{readTime(featuredPost.content)}</span>
                      {(featuredPost.views ?? 0) > 0 && (
                        <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{featuredPost.views}</span>
                      )}
                    </div>
                  </div>
                </article>
              </Link>
            )}

            {/* Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(search || activeTag ? filteredPosts : otherPosts).map((post) => (
                <Link key={post.id} to={`/blog/${post.slug}`} className="group">
                  <article className="bg-card rounded-xl overflow-hidden border border-border hover:shadow-md transition-shadow h-full flex flex-col">
                    {post.cover_image ? (
                      <div className="aspect-[16/9] overflow-hidden">
                        <img
                          src={post.cover_image}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[16/9] bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                        <BookOpen className="w-10 h-10 text-primary/20" />
                      </div>
                    )}
                    <div className="p-4 flex-1 flex flex-col">
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {post.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">{tag}</span>
                          ))}
                        </div>
                      )}
                      <h3 className="font-display font-bold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {post.title}
                      </h3>
                      {post.excerpt && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-1">{post.excerpt}</p>
                      )}
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-auto pt-2 border-t border-border">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(post.published_at)}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{readTime(post.content)}</span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default Blog;
