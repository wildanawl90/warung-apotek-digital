import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import { toast } from "sonner";

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  shipping_address: string;
  created_at: string;
  order_items: Array<{
    product_name: string;
    product_price: number;
    quantity: number;
    subtotal: number;
  }>;
}

const Orders = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (*)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Gagal memuat pesanan");
      setLoading(false);
      return;
    }

    setOrders(data || []);
    setLoading(false);
  };

  const downloadInvoice = (order: Order) => {
    const invoiceContent = `
=================================
      WARUNG MADURA
   Apotek Online Terpercaya
=================================
Invoice: ${order.order_number}
Tanggal: ${new Date(order.created_at).toLocaleDateString("id-ID")}
---------------------------------

ITEM PESANAN:
${order.order_items.map((item, index) => `
${index + 1}. ${item.product_name}
   ${item.quantity} x ${formatPrice(item.product_price)} = ${formatPrice(item.subtotal)}
`).join("")}

---------------------------------
TOTAL: ${formatPrice(order.total_amount)}
---------------------------------

Alamat Pengiriman:
${order.shipping_address}

Status: ${getStatusText(order.status)}

Terima kasih telah berbelanja
di Warung Madura!
=================================
    `.trim();

    const blob = new Blob([invoiceContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Invoice-${order.order_number}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: "Menunggu Pembayaran",
      paid: "Dibayar",
      processing: "Diproses",
      shipped: "Dikirim",
      completed: "Selesai",
      cancelled: "Dibatalkan",
    };
    return statusMap[status] || status;
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" => {
    if (status === "completed") return "default";
    if (status === "cancelled") return "destructive";
    return "secondary";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-8">
          <p className="text-center">Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">Riwayat Pesanan</h1>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-xl text-muted-foreground mb-4">Belum ada pesanan</p>
              <Button onClick={() => navigate("/")}>Mulai Belanja</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl mb-2">{order.order_number}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <Badge variant={getStatusVariant(order.status)}>
                      {getStatusText(order.status)}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-2">
                    {order.order_items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>
                          {item.product_name} (x{item.quantity})
                        </span>
                        <span>{formatPrice(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t mt-4 pt-4">
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span className="text-primary">{formatPrice(order.total_amount)}</span>
                    </div>
                  </div>

                  <div className="mt-4 text-sm text-muted-foreground">
                    <strong>Alamat Pengiriman:</strong>
                    <p>{order.shipping_address}</p>
                  </div>
                </CardContent>

                <CardFooter>
                  <Button
                    variant="outline"
                    onClick={() => downloadInvoice(order)}
                    className="w-full"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Invoice
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
