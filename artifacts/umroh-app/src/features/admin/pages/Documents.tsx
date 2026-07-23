import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { FileText, BarChart2, Settings2 } from "lucide-react";
import DocumentList from "./DocumentList";
import AdminDocumentTracking from "./DocumentTracking";
import DocumentTypes from "./DocumentTypes";

const Documents = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "daftar";

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Dokumen Jemaah</h1>
        <p className="text-muted-foreground">
          Kelola, tracking, dan konfigurasi dokumen jemaah dalam satu tempat
        </p>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="daftar" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span>Daftar Dokumen</span>
          </TabsTrigger>
          <TabsTrigger value="tracking" className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4" />
            <span>Tracking Keberangkatan</span>
          </TabsTrigger>
          <TabsTrigger value="pengaturan" className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            <span>Pengaturan Dokumen</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daftar" className="mt-5">
          <DocumentList />
        </TabsContent>

        <TabsContent value="tracking" className="mt-5">
          <AdminDocumentTracking />
        </TabsContent>

        <TabsContent value="pengaturan" className="mt-5">
          <DocumentTypes />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Documents;
