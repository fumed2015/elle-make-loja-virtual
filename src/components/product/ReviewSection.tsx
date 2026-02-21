import { useState } from "react";
import { Star, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useReviews, useCreateReview } from "@/hooks/useReviews";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const ReviewSection = ({ productId }: { productId: string }) => {
  const { data: reviews, isLoading } = useReviews(productId);
  const createReview = useCreateReview();
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [showForm, setShowForm] = useState(false);

  const avgRating = reviews?.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

  const handleSubmit = () => {
    if (rating === 0) return;
    createReview.mutate(
      { productId, rating, comment },
      { onSuccess: () => { setRating(0); setComment(""); setShowForm(false); } }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-display font-semibold">Avaliações</h3>
          {reviews && reviews.length > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-primary text-primary" />
              <span className="text-xs font-medium">{avgRating.toFixed(1)}</span>
              <span className="text-[10px] text-muted-foreground">({reviews.length})</span>
            </div>
          )}
        </div>
        {user && (
          <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)} className="text-xs text-primary">
            {showForm ? "Cancelar" : "Avaliar"}
          </Button>
        )}
      </div>

      {/* Review form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="bg-card rounded-xl p-4 border border-border space-y-3">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                onClick={() => setRating(i)}
                onMouseEnter={() => setHoverRating(i)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-0.5"
              >
                <Star className={cn("w-6 h-6 transition-colors", (hoverRating || rating) >= i ? "fill-primary text-primary" : "text-muted-foreground")} />
              </button>
            ))}
          </div>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Conte sua experiência com o produto..."
            className="bg-muted border-none min-h-[60px] text-sm"
          />
          <Button onClick={handleSubmit} disabled={rating === 0 || createReview.isPending} size="sm" className="bg-gradient-gold text-primary-foreground text-xs">
            <Send className="w-3 h-3 mr-1" />
            {createReview.isPending ? "Enviando..." : "Enviar"}
          </Button>
        </motion.div>
      )}

      {/* Reviews list */}
      {isLoading ? (
        <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : reviews?.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">Nenhuma avaliação ainda. Seja a primeira!</p>
      ) : (
        <div className="space-y-3">
          {reviews?.slice(0, 5).map((review) => (
            <div key={review.id} className="bg-card rounded-xl p-3 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-full bg-gradient-teal flex items-center justify-center text-[10px] font-bold text-secondary-foreground">
                  {((review.profiles as any)?.full_name || "U").charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-medium">{(review.profiles as any)?.full_name || "Usuário"}</span>
                <div className="flex gap-0.5 ml-auto">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={cn("w-3 h-3", i < review.rating ? "fill-primary text-primary" : "text-muted-foreground")} />
                  ))}
                </div>
              </div>
              {review.comment && <p className="text-xs text-muted-foreground">{review.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewSection;
