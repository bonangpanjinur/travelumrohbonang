import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/shared/hooks/useAuth";
import { supabase } from "@/shared/integrations/supabase/client";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { toast } from "sonner";
import { Camera, Loader2, ArrowLeft, LayoutDashboard, User as UserIcon, ShieldCheck, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/shared/components/layout/Navbar";
import Footer from "@/shared/components/layout/Footer";

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  avatar_url: string;
}

const Profile = () => {
  const { user, isAdmin, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    name: "",
    email: "",
    phone: "",
    avatar_url: "",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (user) {
      fetchProfile();
    }
  }, [user, authLoading, navigate]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setProfile({
          name: data.name || "",
          email: data.email || user.email || "",
          phone: data.phone || "",
          avatar_url: data.avatar_url || "",
        });
      } else {
        setProfile({
          name: [user.firstName, user.lastName].filter(Boolean).join(" ") || "",
          email: user.email || "",
          phone: "",
          avatar_url: "",
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Gagal memuat profil");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 2MB");
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      setProfile((prev) => ({ ...prev, avatar_url: urlData.publicUrl }));
      toast.success("Foto profil berhasil diupload");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Gagal mengupload foto profil");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          avatar_url: profile.avatar_url,
        });

      if (error) throw error;

      toast.success("Profil berhasil disimpan");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Gagal menyimpan profil");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 px-3 pt-20 pb-24 sm:px-5 sm:pt-24 sm:pb-16 lg:px-8">
        <div className="container-custom max-w-5xl">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4 min-h-11 gap-2 px-2.5 sm:mb-6 sm:px-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Button>

          <header className="mb-6 sm:mb-8">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              Akun Saya
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <h1 className="text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
                  Profil Saya
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                  Kelola informasi profil dan data pribadi Anda dengan mudah.
                </p>
              </div>
              {role && (
                <div className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
                  isAdmin
                    ? "border-primary/20 bg-primary/10 text-primary"
                    : "border-accent/20 bg-accent/10 text-accent"
                }`}>
                  {isAdmin ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShoppingBag className="h-3.5 w-3.5" />}
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </div>
              )}
            </div>
          </header>

          <div className="grid gap-5 lg:grid-cols-[minmax(240px,0.72fr)_minmax(0,1.28fr)] lg:items-start lg:gap-6">
            <Card className="overflow-hidden border-border/80 shadow-sm">
              <div className="bg-primary px-5 py-6 text-primary-foreground sm:px-7 sm:py-8">
                <div className="flex items-center gap-4 sm:flex-col sm:items-center sm:text-center">
                  <div className="relative shrink-0">
                    <Avatar className="h-20 w-20 border-4 border-primary-foreground/15 shadow-lg sm:h-28 sm:w-28">
                      <AvatarImage src={profile.avatar_url} alt={profile.name} />
                      <AvatarFallback className="bg-gold text-2xl font-semibold text-primary sm:text-4xl">
                        {profile.name?.charAt(0)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <label
                      htmlFor="avatar-upload"
                      className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-gold text-primary shadow-md transition-colors hover:bg-gold-light sm:h-9 sm:w-9"
                      aria-label="Ubah foto profil"
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                    </label>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold sm:text-xl">
                      {profile.name || "Pengguna"}
                    </p>
                    <p className="mt-1 truncate text-xs text-primary-foreground/70 sm:text-sm">
                      {profile.email || "Email belum tersedia"}
                    </p>
                  </div>
                </div>
                <p className="mt-5 text-center text-xs leading-5 text-primary-foreground/65">
                  Klik ikon kamera untuk mengubah foto profil.
                </p>
              </div>
              <CardContent className="space-y-3 p-4 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Akses cepat
                </p>
                {isAdmin ? (
                  <Link to="/admin" className="block">
                    <Button variant="outline" className="min-h-11 w-full justify-start gap-2 border-primary/30 text-primary hover:bg-primary/5">
                      <LayoutDashboard className="h-4 w-4" />
                      Buka Dashboard Admin
                    </Button>
                  </Link>
                ) : (
                  <Link to="/my-bookings" className="block">
                    <Button variant="outline" className="min-h-11 w-full justify-start gap-2 border-accent/40 text-accent hover:bg-accent/5">
                      <ShoppingBag className="h-4 w-4" />
                      Lihat Riwayat Pesanan
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>

            <div className="space-y-5">
              <Card className="border-border/80 shadow-sm">
                <CardHeader className="px-5 pb-3 pt-5 sm:px-7 sm:pt-7">
                  <CardTitle className="text-xl sm:text-2xl">Informasi Pribadi</CardTitle>
                  <CardDescription className="leading-5">
                    Pastikan data Anda selalu terbaru untuk memudahkan proses pemesanan.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 px-5 pb-5 sm:px-7 sm:pb-7">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nama Lengkap</Label>
                    <Input
                      id="name"
                      value={profile.name}
                      onChange={(e) =>
                        setProfile((prev) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="Masukkan nama lengkap"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      disabled
                      className="h-11 bg-muted"
                    />
                    <p className="text-xs leading-5 text-muted-foreground">
                      Email tidak dapat diubah.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Nomor Telepon</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={profile.phone}
                      onChange={(e) =>
                        setProfile((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      placeholder="Contoh: 08123456789"
                      className="h-11"
                    />
                  </div>

                  <div className="border-t pt-5">
                    <Label>Keamanan</Label>
                    <p className="mb-3 mt-1 text-xs leading-5 text-muted-foreground">
                      Ubah kata sandi untuk mengamankan akun Anda.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => navigate("/forgot-password")}
                      className="min-h-11 w-full sm:w-auto"
                    >
                      Ubah Kata Sandi
                    </Button>
                  </div>

                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="min-h-11 w-full"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      "Simpan Perubahan"
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-border/80 shadow-sm">
                <CardHeader className="px-5 pb-3 pt-5 sm:px-7 sm:pt-6">
                  <CardTitle className="text-xl sm:text-2xl">Privasi & Data Pribadi</CardTitle>
                  <CardDescription className="leading-5">
                    Unduh salinan data pribadi Anda sesuai UU PDP.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-5 pb-5 sm:px-7 sm:pb-6">
                  <Button
                    variant="outline"
                    onClick={() => {
                      toast.error("Fitur unduh data belum tersedia");
                    }}
                    className="min-h-11 w-full sm:w-auto"
                  >
                    Unduh Data Saya (JSON)
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Profile;
