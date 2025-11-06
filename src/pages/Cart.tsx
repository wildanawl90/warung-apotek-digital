import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

interface CartItem {
  id: string;
  quantity: number;
  products: {
    id: string;
    name: string;
    price: number;
    stock: number;
    image_url: string | null;
  };
}

const Cart = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartId, setCartId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shippingAddress, setShippingAddress] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchCart();
  }, [user]);

  const fetchCart = async () => {
    if (!user) return;

    const { data: cart } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!cart) return;
    
    setCartId(cart.id);

    const { data, error } = await supabase
      .from("cart_items")
      .select(`
        *,
        products (id, name, price, stock, image_url)
      `)
      .eq("cart_id", cart.id);

    if (error) {
      toast.error("Gagal memuat keranjang");
      return;
    }
    setCartItems(data || []);
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    const { error } = await supabase
      .from("cart_items")
      .update({ quantity: newQuantity })
      .eq("id", itemId);

    if (error) {
      toast.error("Gagal update jumlah");
      return;
    }
    fetchCart();
  };

  const removeItem = async (itemId: string) => {
    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("id", itemId);

    if (error) {
      toast.error("Gagal menghapus item");
      return;
    }
    toast.success("Item dihapus");
    fetchCart();
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (item.products.price * item.quantity);
    }, 0);
  };

  const handleCheckout = async () => {
    if (!user || !cartId || cartItems.length === 0) return;

    if (!shippingAddress.trim()) {
      toast.error("Silakan isi alamat pengiriman");
      return;
    }

    setLoading(true);
    try {
      // Generate order number
      const orderNumber = `WM${Date.now()}`;
      const totalAmount = calculateTotal();

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          order_number: orderNumber,
          total_amount: totalAmount,
          status: "pending",
          payment_method: "cash",
          shipping_address: shippingAddress,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cartItems.map((item) => ({
        order_id: order.id,
        product_id: item.products.id,
        product_name: item.products.name,
        product_price: item.products.price,
        quantity: item.quantity,
        subtotal: item.products.price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Update product stock
      for (const item of cartItems) {
        await supabase
          .from("products")
          .update({ stock: item.products.stock - item.quantity })
          .eq("id", item.products.id);
      }

      // Clear cart
      await supabase
        .from("cart_items")
        .delete()
        .eq("cart_id", cartId);

      toast.success("Pesanan berhasil dibuat!");
      navigate(`/orders`);
    } catch (error: any) {
      toast.error(error.message || "Gagal membuat pesanan");
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">Keranjang Belanja</h1>

        {cartItems.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-xl text-muted-foreground mb-4">Keranjang kosong</p>
              <Button onClick={() => navigate("/")}>Belanja Sekarang</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="w-24 h-24 bg-secondary rounded flex items-center justify-center flex-shrink-0">
                        {item.products.image_url ? (
                          <img
                            src={item.products.image_url}
                            alt={item.products.name}
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <span className="text-4xl">💊</span>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="font-semibold mb-2">{item.products.name}</h3>
                        <p className="text-lg font-bold text-primary">{formatPrice(item.products.price)}</p>
                        
                        <div className="flex items-center gap-4 mt-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                            >
                              -
                            </Button>
                            <span className="w-12 text-center">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              disabled={item.quantity >= item.products.stock}
                            >
                              +
                            </Button>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-bold">{formatPrice(item.products.price * item.quantity)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div>
              <Card className="sticky top-20">
                <CardHeader>
                  <CardTitle>Ringkasan Pesanan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="address">Alamat Pengiriman</Label>
                    <Textarea
                      id="address"
                      placeholder="Masukkan alamat lengkap..."
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      rows={4}
                      required
                    />
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-primary">{formatPrice(calculateTotal())}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleCheckout}
                    disabled={loading || !shippingAddress.trim()}
                  >
                    {loading ? "Memproses..." : "Checkout"}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
