import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="relative">
          <h1 className="text-9xl font-extrabold text-muted/30 select-none">404</h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-2xl font-bold text-foreground">Halaman Tidak Ditemukan</p>
          </div>
        </div>
        
        <p className="text-muted-foreground text-lg">
          Maaf, halaman yang Anda cari tidak tersedia atau telah dipindahkan.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button asChild variant="outline" className="gap-2">
            <Link to={-1 as any}>
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </Link>
          </Button>
          <Button asChild className="gap-2 bg-[#D4AF37] hover:bg-[#B8962E] text-white">
            <Link to="/">
              <Home className="h-4 w-4" />
              Ke Beranda
            </Link>
          </Button>
        </div>
      </div>
      
      <div className="mt-12 text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} Travel Umroh Bonang. All rights reserved.
      </div>
    </div>
  );
};

export default NotFound;
