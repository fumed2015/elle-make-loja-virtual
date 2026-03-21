import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Eye, EyeOff, FileText, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type BlogPost = Tables<"blog_posts">;

const generateSlug = (title: string) =>
  title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const emptyPost = {
  title: "",
  slug: "",
  content: "",
  excerpt: "",
  cover_image: "",
  author_name: "Elle Make",
  tags: [] as string[],
  seo_title: "",
  seo_description: "",
  is_published: false,
};

const BlogTab = () => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [form, setForm] = useState(emptyPost);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const { data: posts, isLoading } = useQuery({
    queryKey: ["admin-blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as BlogPost[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (isNew: boolean) => {
      const payload = {
        ...form,
        slug: form.slug || generateSlug(form.title),
        published_at: form.is_published ? new Date().toISOString() : null,
        tags: form.tags.length > 0 ? form.tags : null,
      };
      if (isNew) {
        const { error } = await supabase.from("blog_posts").insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("blog_posts")
          .update(payload)
          .eq("id", editing!.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      toast.success(editing ? "Artigo atualizado!" : "Artigo criado!");
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      toast.success("Artigo excluído!");
    },
  });

  const resetForm = () => {
    setEditing(null);
    setForm(emptyPost);
    setTagsInput("");
  };

  const openEdit = (post: BlogPost) => {
    setEditing(post);
    setForm({
      title: post.title,
      slug: post.slug,
      content: post.content || "",
      excerpt: post.excerpt || "",
      cover_image: post.cover_image || "",
      author_name: post.author_name || "Elle Make",
      tags: post.tags || [],
      seo_title: post.seo_title || "",
      seo_description: post.seo_description || "",
      is_published: post.is_published,
    });
    setTagsInput((post.tags || []).join(", "));
    setDialogOpen(true);
  };

  const openNew = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleTagsChange = (value: string) => {
    setTagsInput(value);
    setForm((f) => ({
      ...f,
      tags: value
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    }));
  };

  const handleGenerateWithAI = async () => {
    if (!form.title) {
      toast.error("Preencha o título primeiro");
      return;
    }
    setAiLoading(true);
    try {
      const res = await supabase.functions.invoke("ai-content-generator", {
        body: {
          action: "blog_post",
          title: form.title,
          tags: form.tags,
        },
      });
      if (res.error) throw res.error;
      const data = res.data;
      setForm((f) => ({
        ...f,
        content: data.content || f.content,
        excerpt: data.excerpt || f.excerpt,
        seo_title: data.seo_title || f.seo_title,
        seo_description: data.seo_description || f.seo_description,
        tags: data.tags || f.tags,
      }));
      if (data.tags) setTagsInput(data.tags.join(", "));
      toast.success("Conteúdo gerado com IA!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar conteúdo");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Blog</h2>
          <p className="text-sm text-muted-foreground">{posts?.length || 0} artigos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" />Novo Artigo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Artigo" : "Novo Artigo"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Título *</Label>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value, slug: f.slug || generateSlug(e.target.value) }))} placeholder="Como fazer um delineado perfeito" />
              </div>
              <div>
                <Label>Slug</Label>
                <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="como-fazer-delineado-perfeito" />
              </div>
              <div>
                <Label>URL da Capa</Label>
                <Input value={form.cover_image} onChange={(e) => setForm((f) => ({ ...f, cover_image: e.target.value }))} placeholder="https://..." />
              </div>
              <div>
                <Label>Resumo (Excerpt)</Label>
                <Textarea value={form.excerpt} onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))} rows={2} placeholder="Breve descrição do artigo..." />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>Conteúdo</Label>
                  <Button variant="outline" size="sm" onClick={handleGenerateWithAI} disabled={aiLoading}>
                    {aiLoading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
                    Gerar com IA
                  </Button>
                </div>
                <Textarea value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} rows={12} placeholder="Escreva o conteúdo do artigo..." className="font-mono text-sm" />
              </div>
              <div>
                <Label>Tags (separadas por vírgula)</Label>
                <Input value={tagsInput} onChange={(e) => handleTagsChange(e.target.value)} placeholder="maquiagem, tutorial, delineado" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>SEO Title</Label>
                  <Input value={form.seo_title} onChange={(e) => setForm((f) => ({ ...f, seo_title: e.target.value }))} placeholder="Título para Google (max 60 chars)" />
                  <p className="text-xs text-muted-foreground mt-1">{form.seo_title.length}/60</p>
                </div>
                <div>
                  <Label>Autor</Label>
                  <Input value={form.author_name} onChange={(e) => setForm((f) => ({ ...f, author_name: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>SEO Description</Label>
                <Textarea value={form.seo_description} onChange={(e) => setForm((f) => ({ ...f, seo_description: e.target.value }))} rows={2} placeholder="Meta descrição (max 160 chars)" />
                <p className="text-xs text-muted-foreground mt-1">{form.seo_description.length}/160</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_published} onCheckedChange={(v) => setForm((f) => ({ ...f, is_published: v }))} />
                <Label>Publicar agora</Label>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancelar</Button>
                <Button onClick={() => saveMutation.mutate(!editing)} disabled={saveMutation.isPending || !form.title}>
                  {saveMutation.isPending ? "Salvando..." : editing ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : (
        <div className="space-y-3">
          {posts?.map((post) => (
            <Card key={post.id}>
              <CardContent className="p-4 flex items-center gap-4">
                {post.cover_image ? (
                  <img src={post.cover_image} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold truncate">{post.title}</h3>
                    {post.is_published ? (
                      <Badge variant="default" className="text-[10px]"><Eye className="w-3 h-3 mr-0.5" />Publicado</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]"><EyeOff className="w-3 h-3 mr-0.5" />Rascunho</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{post.excerpt || "Sem resumo"}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {post.tags?.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">{tag}</span>
                    ))}
                    {post.views && <span className="text-[10px] text-muted-foreground ml-auto">{post.views} views</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(post)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm("Excluir artigo?")) deleteMutation.mutate(post.id); }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {posts?.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Nenhum artigo ainda. Crie o primeiro!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BlogTab;
