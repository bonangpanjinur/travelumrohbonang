import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  BrainCircuit, TrendingUp, DollarSign, Users, RefreshCw, Sparkles,
  BarChart3, Target, AlertTriangle, Lightbulb,
} from "lucide-react";

const ANALYTICS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analytics-ai`;

const analysisTypes = [
  { value: "full_analysis", label: "Analisis Lengkap", icon: BrainCircuit, description: "Ringkasan eksekutif, tren, forecasting, dan rekomendasi" },
  { value: "revenue_forecast", label: "Forecasting Revenue", icon: DollarSign, description: "Prediksi pendapatan 3 bulan ke depan" },
  { value: "lead_analysis", label: "Analisis Lead & Konversi", icon: Target, description: "Insight konversi lead-to-booking dan sumber terbaik" },
];

const AdminAnalyticsAI = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedType, setSelectedType] = useState("full_analysis");
  const [result, setResult] = useState("");
  const [lastAnalysis, setLastAnalysis] = useState<string | null>(null);

  const runAnalysis = useCallback(async (type: string) => {
    setIsLoading(true);
    setResult("");
    setSelectedType(type);

    try {
      const resp = await fetch(ANALYTICS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ type }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${resp.status}`);
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setResult(fullText);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Flush remaining
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setResult(fullText);
            }
          } catch { /* ignore */ }
        }
      }

      setLastAnalysis(new Date().toLocaleString("id-ID"));
    } catch (e: any) {
      console.error(e);
      toast.error("Gagal menjalankan analisis: " + e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Simple markdown renderer
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    
    const lines = text.split("\n");
    const elements: JSX.Element[] = [];

    lines.forEach((line, i) => {
      if (line.startsWith("## ")) {
        elements.push(
          <h2 key={i} className="text-lg font-bold mt-6 mb-2 text-foreground flex items-center gap-2">
            {line.replace("## ", "")}
          </h2>
        );
      } else if (line.startsWith("### ")) {
        elements.push(
          <h3 key={i} className="text-base font-semibold mt-4 mb-1 text-foreground">
            {line.replace("### ", "")}
          </h3>
        );
      } else if (line.startsWith("- ")) {
        elements.push(
          <li key={i} className="ml-4 text-sm text-muted-foreground list-disc">
            {line.replace("- ", "")}
          </li>
        );
      } else if (line.startsWith("**") && line.endsWith("**")) {
        elements.push(
          <p key={i} className="font-semibold text-foreground text-sm mt-2">{line.replace(/\*\*/g, "")}</p>
        );
      } else if (line.trim()) {
        elements.push(
          <p key={i} className="text-sm text-muted-foreground leading-relaxed">{line}</p>
        );
      } else {
        elements.push(<div key={i} className="h-2" />);
      }
    });

    return elements;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BrainCircuit className="w-7 h-7 text-primary" />
            Analitik AI
          </h1>
          <p className="text-muted-foreground">Dashboard prediktif berbasis AI untuk analisis bisnis</p>
        </div>
        {lastAnalysis && (
          <Badge variant="outline" className="text-xs">
            Terakhir dianalisis: {lastAnalysis}
          </Badge>
        )}
      </div>

      {/* Analysis Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {analysisTypes.map((at) => {
          const Icon = at.icon;
          const isActive = selectedType === at.value;
          return (
            <Card
              key={at.value}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isActive ? "ring-2 ring-primary bg-primary/5" : ""
              }`}
              onClick={() => !isLoading && runAnalysis(at.value)}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-lg ${isActive ? "bg-primary/20" : "bg-muted"}`}>
                    <Icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">{at.label}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{at.description}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={isActive ? "default" : "outline"}
                  className="w-full mt-3"
                  disabled={isLoading}
                  onClick={(e) => {
                    e.stopPropagation();
                    runAnalysis(at.value);
                  }}
                >
                  {isLoading && selectedType === at.value ? (
                    <><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Menganalisis...</>
                  ) : (
                    <><Sparkles className="w-3 h-3 mr-1" /> Jalankan</>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><BarChart3 className="w-4 h-4 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">Tren Penjualan</p><p className="text-sm font-semibold">AI-Powered</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10"><DollarSign className="w-4 h-4 text-emerald-600" /></div>
            <div><p className="text-xs text-muted-foreground">Forecasting</p><p className="text-sm font-semibold">3 Bulan</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><Users className="w-4 h-4 text-blue-600" /></div>
            <div><p className="text-xs text-muted-foreground">Lead Analysis</p><p className="text-sm font-semibold">Konversi</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10"><AlertTriangle className="w-4 h-4 text-amber-600" /></div>
            <div><p className="text-xs text-muted-foreground">Risk Alert</p><p className="text-sm font-semibold">Otomatis</p></div>
          </CardContent>
        </Card>
      </div>

      {/* AI Result */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary" />
            Hasil Analisis AI
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!result && !isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <BrainCircuit className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Pilih Jenis Analisis</p>
              <p className="text-sm mt-1">Klik salah satu kartu di atas untuk menjalankan analisis AI</p>
            </div>
          ) : isLoading && !result ? (
            <div className="text-center py-12">
              <RefreshCw className="w-10 h-10 mx-auto mb-3 animate-spin text-primary" />
              <p className="text-muted-foreground">AI sedang menganalisis data bisnis Anda...</p>
              <p className="text-xs text-muted-foreground mt-1">Ini mungkin memakan waktu beberapa detik</p>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none">
              {renderMarkdown(result)}
              {isLoading && (
                <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAnalyticsAI;
