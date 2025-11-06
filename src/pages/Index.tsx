import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock: number;
  image_url: string | null;
  is_popular: boolean;
  categories: { name: string } | null;
}

const Index = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, [selectedCategory, searchQuery]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name");
    
    if (error) {
      toast.error("Gagal memuat kategori");
      return;
    }
    setCategories(data || []);
  };

  const fetchProducts = async () => {
    let query = supabase
      .from("products")
      .select(`
        *,
        categories (name)
      `)
      .gt("stock", 0);

    if (selectedCategory) {
      query = query.eq("category_id", selectedCategory);
    }

    if (searchQuery) {
      query = query.ilike("name", `%${searchQuery}%`);
    }

    query = query.order("is_popular", { ascending: false }).order("name");

    const { data, error } = await query;
    
    if (error) {
      toast.error("Gagal memuat produk");
      return;
    }
    setProducts(data || []);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Banner */}
      <div className="bg-primary text-primary-foreground py-16">
        <div className="container">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Warung Madura</h1>
          <p className="text-lg md:text-xl mb-8">Apotek Online Terpercaya - Obat Lengkap, Harga Terjangkau</p>
          
          {/* Search Bar */}
          <div className="max-w-2xl relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Cari obat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background"
            />
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Categories */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Kategori</h2>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              onClick={() => setSelectedCategory(null)}
            >
              Semua
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.icon} {category.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Products */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Produk</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <Card key={product.id} className="overflow-hidden">
                <CardHeader className="p-0">
                  <div className="aspect-square bg-secondary flex items-center justify-center">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-6xl">💊</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <CardTitle className="text-lg mb-2">{product.name}</CardTitle>
                  {product.categories && (
                    <Badge variant="secondary" className="mb-2">
                      {product.categories.name}
                    </Badge>
                  )}
                  <p className="text-xl font-bold text-primary">{formatPrice(product.price)}</p>
                  <p className="text-sm text-muted-foreground">Stok: {product.stock}</p>
                </CardContent>
                <CardFooter className="p-4 pt-0">
                  <Link to={`/product/${product.slug}`} className="w-full">
                    <Button className="w-full">Lihat Detail</Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
