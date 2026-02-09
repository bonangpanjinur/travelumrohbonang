import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Camera, Loader2, ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  avatar_url: string;
}

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
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
          name: user.user_metadata?.name || "",
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
      
      <main className="flex-1 pt-24 pb-16">
        <div className="container-custom max-w-2xl">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Button>

          <Card>
            <CardHeader>
              <CardTitle>Profil Saya</CardTitle>
              <CardDescription>
                Kelola informasi profil dan data pribadi Anda
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={profile.avatar_url} alt={profile.name} />
                    <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                      {profile.name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <label
                    htmlFor="avatar-upload"
                    className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors"
                  >
                    {uploading ? (
                      <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4 text-primary-foreground" />
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
                <p className="text-sm text-muted-foreground">
                  Klik ikon kamera untuk mengubah foto profil
                </p>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Lengkap</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) =>
                      setProfile((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Masukkan nama lengkap"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email tidak dapat diubah
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
                  />
                </div>

                {/* Change Password Section */}
                <div className="pt-4 border-t">
                  <Label>Keamanan</Label>
                  <p className="text-xs text-muted-foreground mt-1 mb-2">
                    Ubah kata sandi untuk mengamankan akun Anda
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/forgot-password")}
                    className="w-full"
                  >
                    Ubah Kata Sandi
                  </Button>
                </div>
              </div>

              {/* Save Button */}
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Perubahan"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Profile;
