import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  image_url: string | null;
  dosage: string | null;
  categories: { name: string } | null;
}

const ProductDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [slug]);

  const fetchProduct = async () => {
    const { data, error } = await supabase
      .from("products")
      .select(`*, categories (name)`)
      .eq("slug", slug)
      .single();

    if (error || !data) {
      toast.error("Produk tidak ditemukan");
      navigate("/");
      return;
    }
    setProduct(data);
  };

  const addToCart = async () => {
    if (!user) {
      toast.error("Silakan login terlebih dahulu");
      navigate("/auth");
      return;
    }

    if (!product) return;

    setLoading(true);
    try {
      // Get or create cart
      let { data: cart } = await supabase
        .from("carts")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!cart) {
        const { data: newCart, error: cartError } = await supabase
          .from("carts")
          .insert({ user_id: user.id })
          .select("id")
          .single();

        if (cartError) throw cartError;
        cart = newCart;
      }

      // Check if product already in cart
      const { data: existingItem } = await supabase
        .from("cart_items")
        .select("*")
        .eq("cart_id", cart.id)
        .eq("product_id", product.id)
        .single();

      if (existingItem) {
        // Update quantity
        const { error } = await supabase
          .from("cart_items")
          .update({ quantity: existingItem.quantity + quantity })
          .eq("id", existingItem.id);

        if (error) throw error;
      } else {
        // Insert new item
        const { error } = await supabase
          .from("cart_items")
          .insert({
            cart_id: cart.id,
            product_id: product.id,
            quantity,
          });

        if (error) throw error;
      }

      toast.success("Produk ditambahkan ke keranjang");
      navigate("/cart");
    } catch (error: any) {
      toast.error(error.message || "Gagal menambahkan ke keranjang");
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (!product) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <Card>
          <div className="grid md:grid-cols-2 gap-8">
            <CardHeader className="p-0">
              <div className="aspect-square bg-secondary flex items-center justify-center rounded-t-lg md:rounded-l-lg md:rounded-tr-none">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover rounded-t-lg md:rounded-l-lg md:rounded-tr-none"
                  />
                ) : (
                  <span className="text-9xl">💊</span>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="p-8">
              <div className="space-y-4">
                <div>
                  <CardTitle className="text-3xl mb-2">{product.name}</CardTitle>
                  {product.categories && (
                    <Badge variant="secondary">{product.categories.name}</Badge>
                  )}
                </div>

                <p className="text-3xl font-bold text-primary">{formatPrice(product.price)}</p>

                <div>
                  <p className="text-sm text-muted-foreground">Stok: {product.stock} tersedia</p>
                </div>

                {product.description && (
                  <div>
                    <h3 className="font-semibold mb-2">Deskripsi</h3>
                    <p className="text-muted-foreground">{product.description}</p>
                  </div>
                )}

                {product.dosage && (
                  <div>
                    <h3 className="font-semibold mb-2">Dosis</h3>
                    <p className="text-muted-foreground">{product.dosage}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="quantity">Jumlah</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    max={product.stock}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Math.min(product.stock, parseInt(e.target.value) || 1)))}
                  />
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={addToCart}
                  disabled={loading || product.stock === 0}
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  {loading ? "Menambahkan..." : "Tambah ke Keranjang"}
                </Button>
              </div>
            </CardContent>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ProductDetail;
