import { Heart } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useWishlist } from "@/features/paket/hooks/useWishlist";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function WishlistButton({ packageId, variant = "outline" }: { packageId: string; variant?: "outline" | "ghost" | "default" }) {
  const { has, toggle } = useWishlist();
  const navigate = useNavigate();
  const active = has(packageId);

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const res = await toggle(packageId);
    if (res.needsAuth) {
      toast.info("Login dulu untuk menyimpan ke wishlist");
      navigate("/auth");
      return;
    }
    toast.success(res.added ? "Ditambahkan ke wishlist" : "Dihapus dari wishlist");
  };

  return (
    <Button variant={variant} size="icon" onClick={onClick} aria-label={active ? "Hapus dari wishlist" : "Tambahkan ke wishlist"}>
      <Heart className={`w-4 h-4 ${active ? "fill-destructive text-destructive" : ""}`} />
    </Button>
  );
}
