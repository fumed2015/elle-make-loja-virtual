import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Eye, EyeOff, Trash2 } from "lucide-react";
import { toast } from "sonner";

const ReviewsTab = () => {
  const queryClient = useQueryClient();
  const { data: reviews, isLoading } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reviews").select("*, products(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleApprove = async (id: string, approved: boolean) => {
    await supabase.from("reviews").update({ is_approved: !approved }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    toast.success(approved ? "Review ocultada" : "Review aprovada");
  };

  const handleDelete = async (id: string) => {
    await supabase.from("reviews").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    toast.success("Review removida");
  };

  return (
    <div className="space-y-3">
      {isLoading ? <div className="text-center py-4 text-xs text-muted-foreground">Carregando...</div> : reviews?.length === 0 ? <p className="text-center text-xs text-muted-foreground py-4">Nenhuma review</p> : reviews?.map((r) => (
        <div key={r.id} className="bg-card rounded-xl p-4 border border-border space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium">{(r.products as any)?.name}</p>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => <Star key={i} className={`w-3 h-3 ${i < r.rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />)}
            </div>
          </div>
          {r.comment && <p className="text-xs text-muted-foreground">{r.comment}</p>}
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => handleApprove(r.id, !!r.is_approved)} className="text-xs gap-1">
              {r.is_approved ? <><EyeOff className="w-3 h-3" />Ocultar</> : <><Eye className="w-3 h-3" />Aprovar</>}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleDelete(r.id)} className="text-xs text-destructive gap-1"><Trash2 className="w-3 h-3" />Remover</Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReviewsTab;
