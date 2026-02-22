import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProducts } from "@/hooks/useProducts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { FileText, Plus, Pencil, Trash2, Eye, Check, X, Loader2, Search, Image, Star, Globe } from "lucide-react";

const SEOContentTab = () => {
  const queryClient = useQueryClient();
  const { data: products } = useProducts({});
  const [showBlogForm, setShowBlogForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const emptyForm = {
    title: "", slug: "", content: "", excerpt: "", cover_image: "",
    author_name: "Elle Make", tags: "", is_published: false,
    seo_title: "", seo_description: "",
  };
  const [form, setForm] = useState(emptyForm);

  const { data: posts, refetch: refetchPosts } = useQuery({
    queryKey: ["admin-blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("blog_posts").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: reviews, refetch: refetchReviews } = useQuery({
    queryKey: ["admin-reviews-seo"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reviews").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: seoReports } = useQuery({
    queryKey: ["admin-seo-reports"],
    queryFn: async () => {
      const { data, error } = await supabase.from("seo_reports").select("*").order("created_at", { ascending: false }).limit(1);
      if (error) throw error;
      return data;
    },
  });

  // ===== SEO HEALTH =====
  const productsNoDesc = products?.filter(p => !p.description || p.description.length < 30).length || 0;
  const productsNoImages = products?.filter(p => !p.images || p.images.length === 0).length || 0;
  const productsNoTags = products?.filter(p => !p.tags || p.tags.length === 0).length || 0;
  const totalProducts = products?.length || 0;
  const seoScore = totalProducts > 0
    ? Math.round(((totalProducts - productsNoDesc - productsNoImages - productsNoTags) / (totalProducts * 3)) * 100)
    : 0;

  // ===== REVIEW MODERATION =====
  const pendingReviews = reviews?.filter(r => !r.is_approved) || [];
  const approvedReviews = reviews?.filter(r => r.is_approved) || [];
  const reviewsWithImages = reviews?.filter(r => r.images && r.images.length > 0) || [];

  const handleApproveReview = async (id: string) => {
    const { error } = await supabase.from("reviews").update({ is_approved: true }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Review aprovada!"); refetchReviews(); }
  };

  const handleDeleteReview = async (id: string) => {
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Review removida!"); refetchReviews(); }
  };

  // ===== BLOG MANAGEMENT =====
  const generateSlug = (title: string) => title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setShowBlogForm(false); };

  const openEdit = (p: any) => {
    setForm({
      title: p.title, slug: p.slug, content: p.content || "", excerpt: p.excerpt || "",
      cover_image: p.cover_image || "", author_name: p.author_name || "Elle Make",
      tags: (p.tags || []).join(", "), is_published: p.is_published,
      seo_title: p.seo_title || "", seo_description: p.seo_description || "",
    });
    setEditingId(p.id);
    setShowBlogForm(true);
  };

  const handleSubmitPost = async () => {
    if (!form.title.trim()) { toast.error("Título obrigatório"); return; }
    setSubmitting(true);

    const slug = form.slug || generateSlug(form.title);
    const tags = form.tags.split(",").map(t => t.trim()).filter(Boolean);
    const payload = {
      title: form.title, slug, content: form.content || null, excerpt: form.excerpt || null,
      cover_image: form.cover_image || null, author_name: form.author_name,
      tags, is_published: form.is_published, seo_title: form.seo_title || null,
      seo_description: form.seo_description || null,
      published_at: form.is_published ? new Date().toISOString() : null,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("blog_posts").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("blog_posts").insert(payload));
    }

    if (error) toast.error(error.message);
    else { toast.success(editingId ? "Post atualizado!" : "Post criado!"); resetForm(); refetchPosts(); }
    setSubmitting(false);
  };

  const handleDeletePost = async (id: string) => {
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Post removido!"); refetchPosts(); }
  };

  const filteredPosts = posts?.filter(p =>
    !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-bold flex items-center gap-2">
        <Globe className="w-4 h-4 text-primary" /> SEO & Conteúdo
      </h2>

      {/* SEO Health Score */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl p-4 border border-border space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold">🏥 Saúde SEO do Catálogo</p>
          <Badge variant={seoScore >= 70 ? "secondary" : "destructive"} className="text-[10px]">{seoScore}%</Badge>
        </div>
        <div className="w-full bg-muted rounded-full h-3">
          <div className={`h-3 rounded-full transition-all ${seoScore >= 70 ? "bg-accent" : seoScore >= 40 ? "bg-yellow-500" : "bg-destructive"}`}
            style={{ width: `${seoScore}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-muted rounded-lg p-2.5 text-center">
            <p className={`text-sm font-bold ${productsNoDesc > 0 ? "text-destructive" : "text-accent"}`}>{productsNoDesc}</p>
            <p className="text-[8px] text-muted-foreground">Sem descrição</p>
          </div>
          <div className="bg-muted rounded-lg p-2.5 text-center">
            <p className={`text-sm font-bold ${productsNoImages > 0 ? "text-destructive" : "text-accent"}`}>{productsNoImages}</p>
            <p className="text-[8px] text-muted-foreground">Sem imagens</p>
          </div>
          <div className="bg-muted rounded-lg p-2.5 text-center">
            <p className={`text-sm font-bold ${productsNoTags > 0 ? "text-yellow-500" : "text-accent"}`}>{productsNoTags}</p>
            <p className="text-[8px] text-muted-foreground">Sem tags</p>
          </div>
        </div>
        {seoReports?.[0] && (
          <p className="text-[9px] text-muted-foreground">
            Último relatório: {new Date(seoReports[0].created_at).toLocaleDateString("pt-BR")} • Score: {seoReports[0].score}
          </p>
        )}
      </motion.div>

      {/* Review Moderation */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-card rounded-xl p-4 border border-border space-y-3">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-primary" />
          <p className="text-xs font-bold">⭐ Moderação de Reviews</p>
          {pendingReviews.length > 0 && <Badge variant="destructive" className="text-[9px]">{pendingReviews.length} pendentes</Badge>}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-muted rounded-lg p-2 text-center">
            <p className="text-sm font-bold">{reviews?.length || 0}</p>
            <p className="text-[8px] text-muted-foreground">Total</p>
          </div>
          <div className="bg-muted rounded-lg p-2 text-center">
            <p className="text-sm font-bold text-accent">{approvedReviews.length}</p>
            <p className="text-[8px] text-muted-foreground">Aprovadas</p>
          </div>
          <div className="bg-muted rounded-lg p-2 text-center">
            <p className="text-sm font-bold">{reviewsWithImages.length}</p>
            <p className="text-[8px] text-muted-foreground">Com fotos</p>
          </div>
        </div>

        {pendingReviews.length > 0 && (
          <div className="space-y-2 max-h-[250px] overflow-y-auto">
            <p className="text-[9px] font-bold text-muted-foreground uppercase">Aguardando aprovação</p>
            {pendingReviews.slice(0, 10).map(r => {
              const product = products?.find(p => p.id === r.product_id);
              return (
                <div key={r.id} className="bg-muted rounded-lg p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium">{product?.name || "Produto removido"}</p>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < r.rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`} />
                        ))}
                        <span className="text-[9px] text-muted-foreground ml-1">{new Date(r.created_at).toLocaleDateString("pt-BR")}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-accent" onClick={() => handleApproveReview(r.id)}>
                        <Check className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => handleDeleteReview(r.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  {r.comment && <p className="text-[10px] text-foreground">{r.comment}</p>}
                  {r.images && r.images.length > 0 && (
                    <div className="flex gap-1">
                      {r.images.map((img, i) => (
                        <img key={i} src={img} alt="" className="w-10 h-10 rounded object-cover" />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Blog Management */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-card rounded-xl p-4 border border-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <p className="text-xs font-bold">📝 Blog & Conteúdo</p>
            <Badge variant="secondary" className="text-[9px]">{posts?.length || 0} posts</Badge>
          </div>
          <Button size="sm" onClick={() => { resetForm(); setShowBlogForm(true); }} className="text-xs h-7 gap-1">
            <Plus className="w-3 h-3" /> Novo Post
          </Button>
        </div>

        {/* Blog Form */}
        <AnimatePresence>
          {showBlogForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="border-2 border-primary/30 rounded-lg p-4 space-y-3">
              <h4 className="text-xs font-bold">{editingId ? "Editar Post" : "Novo Post"}</h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px]">Título</Label>
                  <Input value={form.title} onChange={e => {
                    setForm({ ...form, title: e.target.value, slug: form.slug || generateSlug(e.target.value) });
                  }} className="bg-muted border-none h-8 text-xs" placeholder="10 Dicas de Maquiagem para Iniciantes" />
                </div>
                <div>
                  <Label className="text-[10px]">Slug</Label>
                  <Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })}
                    className="bg-muted border-none h-8 text-xs" placeholder="10-dicas-maquiagem" />
                </div>
              </div>

              <div>
                <Label className="text-[10px]">Resumo</Label>
                <Input value={form.excerpt} onChange={e => setForm({ ...form, excerpt: e.target.value })}
                  className="bg-muted border-none h-8 text-xs" placeholder="Breve resumo do post..." />
              </div>

              <div>
                <Label className="text-[10px]">Conteúdo (Markdown)</Label>
                <Textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
                  className="bg-muted border-none text-xs min-h-[120px]" placeholder="# Título&#10;&#10;Conteúdo do post..." />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px]">Imagem de capa (URL)</Label>
                  <Input value={form.cover_image} onChange={e => setForm({ ...form, cover_image: e.target.value })}
                    className="bg-muted border-none h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px]">Tags (separadas por vírgula)</Label>
                  <Input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })}
                    className="bg-muted border-none h-8 text-xs" placeholder="maquiagem, tutorial, beleza" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px]">Título SEO</Label>
                  <Input value={form.seo_title} onChange={e => setForm({ ...form, seo_title: e.target.value })}
                    className="bg-muted border-none h-8 text-xs" placeholder="Título otimizado para Google" />
                  <p className="text-[8px] text-muted-foreground mt-0.5">{form.seo_title.length}/60 caracteres</p>
                </div>
                <div>
                  <Label className="text-[10px]">Meta Description</Label>
                  <Input value={form.seo_description} onChange={e => setForm({ ...form, seo_description: e.target.value })}
                    className="bg-muted border-none h-8 text-xs" placeholder="Descrição para resultados de busca" />
                  <p className="text-[8px] text-muted-foreground mt-0.5">{form.seo_description.length}/160 caracteres</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={form.is_published} onCheckedChange={v => setForm({ ...form, is_published: v })} />
                <Label className="text-xs">Publicar</Label>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSubmitPost} disabled={submitting} className="text-xs gap-1 flex-1">
                  {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  {editingId ? "Salvar" : "Criar Post"}
                </Button>
                <Button variant="outline" onClick={resetForm} className="text-xs"><X className="w-3 h-3" /></Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Posts List */}
        <Input placeholder="Buscar posts..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          className="bg-muted border-none h-8 text-xs" />

        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {filteredPosts.length === 0 ? (
            <p className="text-[10px] text-muted-foreground text-center py-4">Nenhum post encontrado</p>
          ) : filteredPosts.map(p => (
            <div key={p.id} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-medium truncate">{p.title}</p>
                  {p.is_published ? (
                    <Badge variant="secondary" className="text-[8px] bg-accent/15 text-accent">Publicado</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[8px]">Rascunho</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] text-muted-foreground">{new Date(p.created_at).toLocaleDateString("pt-BR")}</span>
                  <span className="text-[9px] text-muted-foreground">• {p.views || 0} views</span>
                  {p.tags && p.tags.length > 0 && (
                    <span className="text-[9px] text-muted-foreground">• {p.tags.slice(0, 3).join(", ")}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => openEdit(p)}><Pencil className="w-3 h-3" /></Button>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => handleDeletePost(p.id)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Products without SEO */}
      {productsNoDesc > 0 && (
        <div className="bg-destructive/5 rounded-xl p-4 border border-destructive/20 space-y-2">
          <p className="text-xs font-bold text-destructive">⚠️ Produtos sem descrição ({productsNoDesc})</p>
          <div className="space-y-1 max-h-[150px] overflow-y-auto">
            {products?.filter(p => !p.description || p.description.length < 30).slice(0, 10).map(p => (
              <div key={p.id} className="flex items-center justify-between text-[10px] bg-card rounded px-2 py-1">
                <span className="truncate">{p.name}</span>
                <Badge variant="outline" className="text-[8px]">{p.brand}</Badge>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-muted-foreground">Use a aba "IA Conteúdo" para gerar descrições automaticamente</p>
        </div>
      )}
    </div>
  );
};

export default SEOContentTab;
