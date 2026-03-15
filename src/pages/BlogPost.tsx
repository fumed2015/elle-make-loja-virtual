import { useParams, Link } from "react-router-dom";
import { Calendar, Clock, Eye, ArrowLeft, Share2, Tag } from "lucide-react";
import { useBlogPost, useBlogPosts } from "@/hooks/useBlogPosts";
import SEOHead from "@/components/SEOHead";
import Breadcrumbs, { breadcrumbJsonLd } from "@/components/Breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const SITE_URL = "https://www.ellemake.com.br";

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: post, isLoading } = useBlogPost(slug || "");
  const { data: relatedPosts } = useBlogPosts({ limit: 4 });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Artigo não encontrado</h1>
        <p className="text-muted-foreground mb-6">O artigo que você está procurando não existe ou foi removido.</p>
        <Button asChild><Link to="/blog">Voltar ao Blog</Link></Button>
      </div>
    );
  }

  const breadcrumbItems = [
    { label: "Blog", href: "/blog" },
    { label: post.title },
  ];

  const formatDate = (date: string | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "numeric", month: "long", year: "numeric",
    });
  };

  const readTime = (content: string | null) => {
    if (!content) return "2 min";
    return `${Math.max(2, Math.ceil(content.split(/\s+/).length / 200))} min`;
  };

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.seo_title || post.title,
    description: post.seo_description || post.excerpt || "",
    image: post.cover_image || `${SITE_URL}/og-image.jpg`,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: {
      "@type": "Person",
      name: post.author_name || "Elle Make",
    },
    publisher: {
      "@type": "Organization",
      name: "Elle Make",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/favicon.png` },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/blog/${post.slug}`,
    },
    keywords: post.tags?.join(", ") || "maquiagem, beleza",
  };

  const handleShare = async () => {
    const url = `${SITE_URL}/blog/${post.slug}`;
    if (navigator.share) {
      await navigator.share({ title: post.title, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado!");
    }
  };

  // Filter related posts (exclude current)
  const related = relatedPosts?.filter((p) => p.id !== post.id).slice(0, 3) || [];

  // Render content - supports basic markdown-like formatting
  const renderContent = (content: string) => {
    // Split by double newlines for paragraphs
    const blocks = content.split(/\n\n+/);
    return blocks.map((block, i) => {
      const trimmed = block.trim();
      if (!trimmed) return null;

      // Headings
      if (trimmed.startsWith("### ")) {
        return <h3 key={i} className="text-lg font-display font-bold text-foreground mt-8 mb-3">{trimmed.slice(4)}</h3>;
      }
      if (trimmed.startsWith("## ")) {
        return <h2 key={i} className="text-xl font-display font-bold text-foreground mt-10 mb-4">{trimmed.slice(3)}</h2>;
      }

      // List items
      if (trimmed.includes("\n- ") || trimmed.startsWith("- ")) {
        const items = trimmed.split("\n").filter((l) => l.startsWith("- "));
        return (
          <ul key={i} className="list-disc list-inside space-y-2 my-4 text-foreground/90">
            {items.map((item, j) => (
              <li key={j} className="leading-relaxed">{item.slice(2)}</li>
            ))}
          </ul>
        );
      }

      // Bold text with **
      const formatted = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

      return (
        <p
          key={i}
          className="text-foreground/90 leading-relaxed mb-4"
          dangerouslySetInnerHTML={{ __html: formatted }}
        />
      );
    });
  };

  return (
    <>
      <SEOHead
        title={post.seo_title || post.title}
        description={post.seo_description || post.excerpt || `Leia ${post.title} no blog Elle Make.`}
        image={post.cover_image || undefined}
        jsonLd={[breadcrumbJsonLd(breadcrumbItems), articleJsonLd]}
      />
      <Breadcrumbs items={breadcrumbItems} />

      <article className="max-w-3xl mx-auto px-4 py-8">
        {/* Back */}
        <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Blog
        </Link>

        {/* Header */}
        <header className="mb-8">
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {post.tags.map((tag) => (
                <Link key={tag} to={`/blog?tag=${tag}`}>
                  <Badge variant="outline" className="capitalize hover:bg-primary/10 transition-colors">
                    <Tag className="w-3 h-3 mr-1" />
                    {tag}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold text-foreground leading-tight mb-4">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="text-lg text-muted-foreground leading-relaxed mb-4">{post.excerpt}</p>
          )}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {(post.author_name || "E")[0]}
                </span>
                {post.author_name || "Elle Make"}
              </span>
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(post.published_at)}</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{readTime(post.content)}</span>
              {(post.views ?? 0) > 0 && (
                <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{post.views} leituras</span>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={handleShare} className="text-muted-foreground">
              <Share2 className="w-4 h-4 mr-1" /> Compartilhar
            </Button>
          </div>
        </header>

        {/* Cover Image */}
        {post.cover_image && (
          <div className="rounded-xl overflow-hidden mb-8">
            <img
              src={post.cover_image}
              alt={post.title}
              className="w-full aspect-[16/9] object-cover"
              loading="eager"
            />
          </div>
        )}

        {/* Content */}
        <div className="prose-elle">
          {post.content ? renderContent(post.content) : (
            <p className="text-muted-foreground italic">Conteúdo em breve...</p>
          )}
        </div>

        {/* CTA */}
        <div className="mt-12 p-6 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-border text-center">
          <h3 className="text-lg font-display font-bold mb-2">Gostou das dicas? 💄</h3>
          <p className="text-sm text-muted-foreground mb-4">Explore nossos produtos e encontre o make perfeito para você!</p>
          <Button asChild><Link to="/explorar">Ver Produtos</Link></Button>
        </div>

        {/* Related Posts */}
        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-display font-bold mb-6">Leia também</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {related.map((rp) => (
                <Link key={rp.id} to={`/blog/${rp.slug}`} className="group">
                  <article className="bg-card rounded-lg border border-border overflow-hidden hover:shadow-md transition-shadow">
                    {rp.cover_image ? (
                      <img src={rp.cover_image} alt={rp.title} className="w-full aspect-[16/9] object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    ) : (
                      <div className="w-full aspect-[16/9] bg-muted" />
                    )}
                    <div className="p-3">
                      <h3 className="text-sm font-bold line-clamp-2 group-hover:text-primary transition-colors">{rp.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{formatDate(rp.published_at)}</p>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  );
};

export default BlogPost;
