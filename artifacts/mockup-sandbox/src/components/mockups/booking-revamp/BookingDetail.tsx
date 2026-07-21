import React from "react";
import { 
  ChevronRight, Calendar, PlaneTakeoff, Wallet, CreditCard, User, Users, 
  CheckCircle2, AlertCircle, Printer, FileText, MessageCircle, Building2, 
  Trash2, Plus, ChevronDown, Check, MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

export function BookingDetail() {
  return (
    <div className="min-h-screen bg-muted/30 pb-16 font-sans">
      {/* TOP BAR (sticky header) */}
      <header className="sticky top-0 z-20 bg-background border-b px-6 py-4 shadow-sm">
        <div className="flex items-center text-sm text-muted-foreground mb-2 space-x-1">
          <span className="hover:text-foreground cursor-pointer transition-colors">Booking</span>
          <ChevronRight className="w-3.5 h-3.5 mx-0.5" />
          <span className="font-medium text-foreground">BNG-UMX2H3BM</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-mono font-bold tracking-tight text-slate-900">BNG-UMX2H3BM</h1>
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200">
              Terkonfirmasi
            </Badge>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
            <Button variant="outline" size="sm" className="whitespace-nowrap">
              Ubah Status <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="outline" size="sm" className="whitespace-nowrap">
              <Building2 className="w-4 h-4 mr-2" /> Ubah Kamar
            </Button>
            <Button variant="outline" size="sm" className="whitespace-nowrap">
              <PlaneTakeoff className="w-4 h-4 mr-2" /> Ubah Keberangkatan
            </Button>
            <Button variant="outline" size="sm" className="whitespace-nowrap">
              <Printer className="w-4 h-4 mr-2" /> Cetak Invoice
            </Button>
            <Button variant="default" size="sm" className="whitespace-nowrap bg-indigo-600 hover:bg-indigo-700">
              <FileText className="w-4 h-4 mr-2" /> Lihat Manifest
            </Button>
          </div>
        </div>
      </header>

      <main className="px-6 mt-6 max-w-7xl mx-auto space-y-6">
        
        {/* SECTION 1: Hero info strip */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-sm border-slate-200/60 bg-white">
            <CardContent className="p-5 flex items-start gap-4">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <PlaneTakeoff className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Paket</p>
                <p className="font-semibold text-slate-900 line-clamp-2 leading-tight">PAKET 27 JUNI PRIVATE</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200/60 bg-white">
            <CardContent className="p-5 flex items-start gap-4">
              <div className="p-2.5 bg-sky-50 text-sky-600 rounded-lg">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Keberangkatan</p>
                <p className="font-semibold text-slate-900 leading-tight">27 Jun 2026</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200/60 bg-white">
            <CardContent className="p-5 flex items-start gap-4">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Harga</p>
                <p className="font-semibold text-slate-900 leading-tight">Rp 27.500.000</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-rose-200 bg-rose-50/30">
            <CardContent className="p-5 flex items-start gap-4">
              <div className="p-2.5 bg-rose-100 text-rose-600 rounded-lg">
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="w-full">
                <p className="text-xs font-medium text-rose-600/80 uppercase tracking-wider mb-1">Status Bayar</p>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="destructive" className="bg-rose-500 hover:bg-rose-600">Belum Bayar</Badge>
                </div>
                {/* Custom progress bar for full color control */}
                <div className="h-1.5 w-full bg-rose-200 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: '0%' }}></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SECTION 2: Two-column grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN */}
          <div className="xl:col-span-7 space-y-6">
            
            {/* Jemaah Utama & Pemesan */}
            <Card className="shadow-sm border-slate-200/60 overflow-hidden">
              <CardHeader className="border-b bg-slate-50/50 pb-4">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-indigo-500" /> 
                  Data Jemaah & Pemesan
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  <div className="grid grid-cols-1 sm:grid-cols-3 p-5 gap-1 sm:gap-4 sm:items-center">
                    <div className="text-sm text-muted-foreground">Jemaah Pertama</div>
                    <div className="sm:col-span-2 text-lg font-semibold text-slate-900 flex items-center gap-2">
                      Hj. Siti Rahayu
                      <Badge variant="outline" className="bg-slate-50 font-normal">Ketua Keluarga</Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 p-5 gap-1 sm:gap-4 sm:items-center">
                    <div className="text-sm text-muted-foreground">Pemesan (Akun)</div>
                    <div className="sm:col-span-2 text-sm font-medium text-slate-900">
                      putrilutfiah760 <span className="text-muted-foreground font-normal mx-1">&middot;</span> putrilutfiah760@gmail.com
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 p-5 gap-1 sm:gap-4 sm:items-center">
                    <div className="text-sm text-muted-foreground">Diinput oleh</div>
                    <div className="sm:col-span-2 flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">Mariska Agency</span>
                      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200 border text-xs font-medium">
                        Agen
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 p-5 gap-1 sm:gap-4 sm:items-center">
                    <div className="text-sm text-muted-foreground">No. HP Pemesan</div>
                    <div className="sm:col-span-2 flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-900">+62 812 3456 7890</span>
                      <Button size="icon" variant="outline" className="h-7 w-7 rounded-full text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 shadow-sm">
                        <MessageCircle className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 p-5 gap-1 sm:gap-4 sm:items-center">
                    <div className="text-sm text-muted-foreground">Cabang</div>
                    <div className="sm:col-span-2 flex items-center justify-between">
                      <span className="text-sm text-slate-500 italic">&mdash; Tanpa Cabang &mdash;</span>
                      <Button variant="ghost" size="sm" className="text-indigo-600 h-8 font-medium">Ubah</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Daftar Jemaah */}
            <Card className="shadow-sm border-slate-200/60 overflow-hidden">
              <CardHeader className="border-b bg-slate-50/50 pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-500" /> 
                  Daftar Jemaah <span className="text-muted-foreground font-normal text-sm ml-1">(1)</span>
                </CardTitle>
                <Button size="sm" variant="outline" className="h-8 border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 font-medium">
                  <Plus className="w-4 h-4 mr-1.5" /> Tambah Jemaah
                </Button>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/80">
                    <TableRow>
                      <TableHead className="w-12 text-center">No</TableHead>
                      <TableHead>Nama Jemaah</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Status Dokumen</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="hover:bg-slate-50/50">
                      <TableCell className="text-center font-medium">1</TableCell>
                      <TableCell className="font-medium text-slate-900">Hj. Siti Rahayu</TableCell>
                      <TableCell className="text-slate-600">Perempuan</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 flex w-fit items-center gap-1.5 font-medium">
                          <AlertCircle className="w-3 h-3" /> Kurang
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50">
                            <FileText className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-rose-600 hover:bg-rose-50">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN */}
          <div className="xl:col-span-5 space-y-6">
            
            {/* Pembayaran */}
            <Card className="shadow-sm border-rose-200 bg-white">
              <CardHeader className="border-b bg-rose-50/30 pb-4">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-rose-900">
                  <CreditCard className="w-5 h-5 text-rose-500" /> 
                  Pembayaran
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="mb-6">
                  <div className="flex justify-between items-end mb-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Sudah Dibayar</p>
                      <p className="text-3xl font-bold text-slate-900 tracking-tight">Rp 0</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Total Tagihan</p>
                      <p className="text-lg font-semibold text-slate-700">Rp 27.500.000</p>
                    </div>
                  </div>
                  
                  <div className="relative pt-2 pb-1">
                    <div className="h-3 w-full bg-rose-100 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full transition-all duration-500" style={{ width: '0%' }}></div>
                    </div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold text-rose-700 mt-1">
                      0%
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center gap-3">
                    <Badge variant="destructive" className="bg-rose-500 hover:bg-rose-600 font-medium px-2.5 py-0.5">Belum Bayar</Badge>
                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">Jatuh tempo: 20 Mei 2026</span>
                  </div>
                </div>
                
                <Separator className="my-6" />
                
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-slate-900">Riwayat Pembayaran</h4>
                  <div className="bg-slate-50 rounded-xl p-8 border border-slate-200 border-dashed text-center">
                    <p className="text-sm text-slate-500 italic">(Belum ada pembayaran)</p>
                  </div>
                </div>

                <Button className="w-full mt-6 bg-slate-900 hover:bg-slate-800 text-white shadow-sm font-medium h-10">
                  <Plus className="w-4 h-4 mr-2" /> Catat Pembayaran Manual
                </Button>
              </CardContent>
            </Card>

            {/* Info Komisi */}
            <Card className="shadow-sm border-slate-200/60 bg-white">
              <CardHeader className="border-b bg-slate-50/50 pb-4">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-amber-500" /> 
                  Info Komisi
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <span className="text-sm text-slate-500">Penerima Komisi</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900">Mariska Agency</span>
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200 border text-[10px] px-1.5 py-0 font-medium">
                      Agen
                    </Badge>
                  </div>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <span className="text-sm text-slate-500">Komisi per Jemaah</span>
                  <span className="text-sm font-medium text-slate-900">Rp 500.000</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <span className="text-sm text-slate-500">Jumlah Jemaah</span>
                  <span className="text-sm font-medium text-slate-900">1 orang</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm font-bold text-slate-900 uppercase tracking-wider">Total Komisi</span>
                  <span className="text-xl font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-lg border border-amber-100">Rp 500.000</span>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>

        {/* SECTION 3: Full-width tabs */}
        <div className="pt-4">
          <Tabs defaultValue="kamar" className="w-full">
            <TabsList className="bg-slate-200/50 p-1 w-full flex-wrap sm:flex-nowrap justify-start h-auto rounded-xl border border-slate-200/60">
              <TabsTrigger value="kamar" className="flex-1 sm:flex-none py-2.5 px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg font-medium text-slate-600 data-[state=active]:text-indigo-700 transition-all">
                <Building2 className="w-4 h-4 mr-2" /> Kamar
              </TabsTrigger>
              <TabsTrigger value="riwayat" className="flex-1 sm:flex-none py-2.5 px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg font-medium text-slate-600 data-[state=active]:text-indigo-700 transition-all">
                <CheckCircle2 className="w-4 h-4 mr-2" /> Riwayat Status
              </TabsTrigger>
              <TabsTrigger value="perlengkapan" className="flex-1 sm:flex-none py-2.5 px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg font-medium text-slate-600 data-[state=active]:text-indigo-700 transition-all">
                <MapPin className="w-4 h-4 mr-2" /> Perlengkapan
              </TabsTrigger>
              <TabsTrigger value="catatan" className="flex-1 sm:flex-none py-2.5 px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg font-medium text-slate-600 data-[state=active]:text-indigo-700 transition-all">
                <FileText className="w-4 h-4 mr-2" /> Catatan
              </TabsTrigger>
            </TabsList>
            
            <div className="mt-4 bg-white rounded-xl border shadow-sm p-6 border-slate-200/60">
              
              <TabsContent value="kamar" className="m-0 focus-visible:outline-none">
                <h3 className="text-lg font-semibold mb-4 text-slate-900">Detail Kamar</h3>
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50/80">
                      <TableRow>
                        <TableHead className="font-semibold text-slate-900">Tipe Kamar</TableHead>
                        <TableHead className="text-center font-semibold text-slate-900">Qty</TableHead>
                        <TableHead className="text-right font-semibold text-slate-900">Harga / malam</TableHead>
                        <TableHead className="text-right font-semibold text-slate-900">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium text-indigo-700">Quad</TableCell>
                        <TableCell className="text-center font-medium">1</TableCell>
                        <TableCell className="text-right text-slate-600">Rp 6.875.000</TableCell>
                        <TableCell className="text-right font-semibold text-slate-900">Rp 6.875.000</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-5 flex items-start gap-3 text-sm text-emerald-800 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium mb-0.5">Sudah Termasuk Paket</p>
                    <p className="text-emerald-700/80">Harga kamar ini sudah ditanggung di dalam total tagihan paket jemaah.</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="riwayat" className="m-0 focus-visible:outline-none">
                <h3 className="text-lg font-semibold mb-8 text-slate-900">Riwayat Perubahan Status</h3>
                <div className="px-4">
                  <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                    
                    {/* Timeline item 1 */}
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-emerald-500 text-white shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                        <Check className="w-4 h-4" />
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-5 rounded-2xl border border-slate-100 shadow-sm bg-slate-50/50">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-1 sm:space-y-0 mb-2">
                          <div className="font-bold text-slate-900 text-base">Terkonfirmasi</div>
                          <time className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">15 Jun 2026, 14:30</time>
                        </div>
                        <div className="text-sm text-slate-600 leading-relaxed">Status diubah dari Draft menjadi Terkonfirmasi oleh <span className="font-semibold text-slate-900">Admin Budi</span>.</div>
                      </div>
                    </div>

                    {/* Timeline item 2 */}
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-slate-300 text-slate-600 shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-5 rounded-2xl border border-slate-100 shadow-sm bg-white">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-1 sm:space-y-0 mb-2">
                          <div className="font-bold text-slate-900 text-base">Draft</div>
                          <time className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">15 Jun 2026, 10:15</time>
                        </div>
                        <div className="text-sm text-slate-600 leading-relaxed">Booking dibuat oleh <span className="font-semibold text-slate-900">Mariska Agency</span>.</div>
                      </div>
                    </div>

                  </div>
                </div>
              </TabsContent>

              <TabsContent value="perlengkapan" className="m-0 focus-visible:outline-none">
                <div className="flex flex-col items-center justify-center py-16 text-center bg-slate-50/50 rounded-xl border border-slate-100 border-dashed">
                  <div className="bg-white p-5 rounded-full mb-5 shadow-sm border border-slate-100">
                    <MapPin className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Belum ada perlengkapan yang dibagikan</h3>
                  <p className="text-slate-500 max-w-sm mb-6 leading-relaxed">Informasi pembagian koper, kain ihram, dan perlengkapan lainnya akan muncul di sini.</p>
                  <Button variant="outline" className="font-medium bg-white">Atur Perlengkapan</Button>
                </div>
              </TabsContent>

              <TabsContent value="catatan" className="m-0 focus-visible:outline-none">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Catatan Internal</h3>
                  <span className="text-xs text-muted-foreground">Hanya bisa dilihat oleh Admin</span>
                </div>
                <textarea 
                  className="w-full min-h-[160px] p-4 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm resize-y bg-slate-50/30 leading-relaxed"
                  placeholder="Tambahkan catatan khusus, request makanan, atau informasi medis untuk booking ini..."
                ></textarea>
                <div className="mt-4 flex justify-end">
                  <Button className="bg-slate-900 text-white hover:bg-slate-800 font-medium px-6">Simpan Catatan</Button>
                </div>
              </TabsContent>

            </div>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
