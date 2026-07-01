import { useEffect, useState } from "react";
import { supabase } from "@/shared/integrations/supabase/client";
import Navbar from "@/shared/components/layout/Navbar";
import Footer from "@/shared/components/layout/Footer";
import SEO from "@/shared/components/seo/SEO";
import { BookOpen, FileText, Video, Book, Download, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Material = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  file_url: string | null;
  thumbnail_url: string | null;
};

const Manasik = () => {
  const [list, setList] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("manasik_materials")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        setList((data as any) || []);
        setLoading(false);
      });
  }, []);

  const icon = (t: string) => t === "video" ? <Video className="w-5 h-5" /> : t === "ebook" ? <Book className="w-5 h-5" /> : <FileText className="w-5 h-5" />;

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Manasik Kit — Panduan Umroh" description="Kumpulan materi manasik umroh: PDF panduan, video pembelajaran, dan e-book." />
      <Navbar />
      <main className="pt-24 pb-16">
        <section className="py-12 bg-primary">
          <div className="container-custom text-center">
            <div className="inline-flex items-center gap-2 bg-gold/20 text-gold px-4 py-2 rounded-full mb-4">
              <BookOpen className="w-4 h-4" /><span className="text-sm font-medium">Panduan Lengkap</span>
            </div>
            <h1 className="text-4xl font-display font-bold text-primary-foreground mb-2">
              Manasik <span className="text-gradient-gold">Kit</span>
            </h1>
            <p className="text-primary-foreground/80">Materi pembelajaran sebelum berangkat umroh</p>
          </div>
        </section>

        <section className="section-padding">
          <div className="container-custom">
            {loading ? (
              <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>
            ) : list.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground">Belum ada materi manasik</p>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {list.map((m) => (
                  <Card key={m.id} className="overflow-hidden hover:shadow-lg transition">
                    {m.thumbnail_url && (
                      <img src={m.thumbnail_url} alt={m.title} className="w-full aspect-video object-cover" />
                    )}
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start gap-2">
                        <div className="p-2 rounded bg-primary/10 text-primary shrink-0">{icon(m.type)}</div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold">{m.title}</h3>
                          <span className="text-xs uppercase text-muted-foreground">{m.type}</span>
                        </div>
                      </div>
                      {m.description && <p className="text-sm text-muted-foreground line-clamp-2">{m.description}</p>}
                      {m.file_url && (
                        <Button asChild variant="outline" size="sm" className="w-full">
                          <a href={m.file_url} target="_blank" rel="noopener noreferrer">
                            {m.type === "video" ? <ExternalLink className="w-4 h-4 mr-2" /> : <Download className="w-4 h-4 mr-2" />}
                            {m.type === "video" ? "Tonton" : "Unduh"}
                          </a>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Manasik;
