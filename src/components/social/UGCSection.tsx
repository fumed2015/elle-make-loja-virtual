import { useState, useRef } from "react";
import { Camera, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const UGCSection = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");

  const { data: posts, isLoading } = useQuery({
    queryKey: ["ugc-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ugc_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("Faça login");
      setUploading(true);
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("ugc-images").upload(path, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("ugc-images").getPublicUrl(path);
      const { error } = await supabase.from("ugc_posts").insert({
        user_id: user.id,
        image_url: publicUrl,
        caption: caption || null,
        is_approved: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ugc-posts"] });
      setCaption("");
      toast.success("Foto enviada! 📸");
      setUploading(false);
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setUploading(false);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 5MB");
      return;
    }
    uploadMutation.mutate(file);
  };

  return (
    <section className="px-4 py-8 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-primary" />
          <h2 className="text-lg font-display font-semibold">Quem usou e amou</h2>
        </div>
        {user && (
          <>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} className="text-xs text-primary gap-1">
              <ImagePlus className="w-3 h-3" />
              {uploading ? "Enviando..." : "Enviar foto"}
            </Button>
          </>
        )}
      </div>

      {user && (
        <div className="mb-4">
          <Input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Legenda da sua foto (opcional)"
            className="bg-muted border-none min-h-[36px] text-xs"
          />
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : posts?.length === 0 ? (
        <div className="bg-card rounded-2xl p-6 border border-border text-center">
          <p className="text-sm text-muted-foreground">Nenhuma foto ainda. Seja a primeira a compartilhar! 📸</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {posts?.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="relative aspect-square rounded-xl overflow-hidden bg-muted group"
            >
              <img src={post.image_url} alt={post.caption || ""} className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                <div>
                  <p className="text-[10px] font-medium">Usuário</p>
                  {post.caption && <p className="text-[9px] text-muted-foreground line-clamp-2">{post.caption}</p>}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
};

export default UGCSection;
