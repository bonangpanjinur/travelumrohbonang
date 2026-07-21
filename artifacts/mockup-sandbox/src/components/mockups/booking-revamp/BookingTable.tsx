import React from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, ArrowRight, Users, CheckCircle2, Clock, CheckCircle } from "lucide-react";

// Mock Data
const stats = [
  { label: "Total Booking", value: "4", icon: Users, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
  { label: "Terkonfirmasi", value: "2", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30" },
  { label: "Pending", value: "0", icon: Clock, color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30" },
  { label: "Selesai", value: "1", icon: CheckCircle, color: "text-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-900/30" },
];

const bookings = [
  {
    id: "1",
    kode: "BNG-UMX2H3BM",
    isGroup: false,
    pilgrimCount: 1,
    jemaah: {
      primary: "Hj. Siti Rahayu",
      pemesan: "putrilutfiah760",
    },
    diinput: {
      role: "Agen",
      name: "Mariska Agency",
    },
    paket: "PAKET 27 JUNI PRIVATE",
    keberangkatan: "27 Jun 2026",
    total: 27500000,
    statusBayar: "Belum",
    status: "Terkonfirmasi",
  },
  {
    id: "2",
    kode: "BNG-ABC9K2MN",
    isGroup: true,
    groupName: "Rombongan Al-Ikhlas",
    pilgrimCount: 3,
    jemaah: {
      primary: "Bpk. Ahmad Kurniawan",
      pemesan: "ahmad.kurniawan",
    },
    diinput: {
      role: "Admin",
      name: "Budi Santoso",
    },
    paket: "UMROH RAMADAN 2027",
    keberangkatan: "15 Mar 2027",
    total: 82500000,
    statusBayar: "DP/Cicil",
    status: "Terkonfirmasi",
  },
  {
    id: "3",
    kode: "BNG-DEF4R7PQ",
    isGroup: false,
    pilgrimCount: 1,
    jemaah: {
      primary: null,
      pemesan: "dewi.susanti",
    },
    diinput: {
      role: "Cabang",
      name: "Cabang Surabaya",
    },
    paket: "PAKET HEMAT REGULER",
    keberangkatan: "10 Jan 2027",
    total: 23000000,
    statusBayar: "Belum",
    status: "Draft",
  },
  {
    id: "4",
    kode: "BNG-GHI1L5ST",
    isGroup: false,
    pilgrimCount: 1,
    jemaah: {
      primary: "Ibu Fatimah Zahra",
      pemesan: "fatimah.z@gmail.com",
    },
    diinput: {
      role: "Pusat",
      name: "Pusat",
    },
    paket: "PAKET HAJI PLUS",
    keberangkatan: "20 Feb 2027",
    total: 145000000,
    statusBayar: "✓ Lunas",
    status: "Selesai",
  },
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};

// Helper components for badges
const RoleBadge = ({ role }: { role: string }) => {
  const styles: Record<string, string> = {
    Agen: "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300",
    Admin: "bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/40 dark:text-purple-300",
    Cabang: "bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/40 dark:text-orange-300",
    Pusat: "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300",
  };
  
  return (
    <Badge variant="secondary" className={`${styles[role] || styles.Pusat} border-none font-semibold text-[10px] px-1.5 py-0 uppercase tracking-wider`}>
      {role}
    </Badge>
  );
};

const PaymentStatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    "✓ Lunas": "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
    "DP/Cicil": "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    "Belum": "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
  };
  
  return (
    <Badge variant="outline" className={`${styles[status] || ""} rounded-full whitespace-nowrap`}>
      {status}
    </Badge>
  );
};

const BookingStatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    "Terkonfirmasi": "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/30",
    "Pending": "bg-yellow-50 text-yellow-600 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/30",
    "Draft": "bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800/50 dark:text-slate-400 border-slate-200 dark:border-slate-700/50",
    "Selesai": "bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800/30",
    "Dibatalkan": "bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400 border-rose-200 dark:border-rose-800/30",
  };
  
  return (
    <Badge variant="outline" className={`${styles[status] || ""} shadow-sm whitespace-nowrap`}>
      {status}
    </Badge>
  );
};

export function BookingTable() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 md:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Manajemen Booking
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Kelola semua booking jemaah di sini
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="shadow-sm">Filter</Button>
            <Button className="shadow-sm bg-blue-600 hover:bg-blue-700 text-white">Buat Booking</Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <Card key={i} className="border-slate-200/60 dark:border-slate-800 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`p-3 rounded-full ${stat.bg}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Table Card */}
        <Card className="rounded-xl border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12 text-center">
                    <Checkbox className="mx-auto border-slate-300 dark:border-slate-600" />
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase text-slate-500 dark:text-slate-400 h-10 tracking-wider">Kode</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-slate-500 dark:text-slate-400 h-10 tracking-wider">Jemaah</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-slate-500 dark:text-slate-400 h-10 tracking-wider">Diinput oleh</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-slate-500 dark:text-slate-400 h-10 tracking-wider">Paket & Waktu</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-slate-500 dark:text-slate-400 h-10 tracking-wider text-right">Total</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-slate-500 dark:text-slate-400 h-10 tracking-wider text-center">Status Bayar</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-slate-500 dark:text-slate-400 h-10 tracking-wider text-center">Status</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-slate-500 dark:text-slate-400 h-10 tracking-wider text-right pr-4">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0">
                    
                    {/* Checkbox */}
                    <TableCell className="w-12 text-center align-top pt-4">
                      <Checkbox className="mx-auto border-slate-300 dark:border-slate-600" />
                    </TableCell>
                    
                    {/* Kode */}
                    <TableCell className="align-top pt-4">
                      <div className="flex flex-col gap-1.5 items-start">
                        <span className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {booking.kode}
                        </span>
                        {booking.isGroup ? (
                          <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800 rounded-sm">
                            Grup: {booking.pilgrimCount} pax
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-slate-500 font-medium">1 pax</span>
                        )}
                      </div>
                    </TableCell>
                    
                    {/* Jemaah */}
                    <TableCell className="align-top pt-4 min-w-[200px]">
                      <div className="flex flex-col gap-1">
                        {booking.jemaah.primary ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-[15px] text-slate-900 dark:text-slate-100">
                              {booking.jemaah.primary}
                            </span>
                            {booking.isGroup && (
                              <span className="text-xs text-slate-500 font-medium bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                                +{booking.pilgrimCount - 1} lainnya
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[15px] italic text-slate-400 dark:text-slate-500 font-medium">
                            Belum ada jemaah
                          </span>
                        )}
                        
                        <div className="text-xs text-slate-500 flex flex-col gap-0.5">
                          {booking.isGroup && (
                            <span className="text-indigo-600 dark:text-indigo-400 font-medium text-[11px] uppercase tracking-wide">
                              {booking.groupName}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <span className="opacity-75">Pemesan:</span>
                            <span className="font-medium text-slate-700 dark:text-slate-300">{booking.jemaah.pemesan}</span>
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    
                    {/* Diinput oleh */}
                    <TableCell className="align-top pt-4">
                      <div className="flex flex-col items-start gap-1">
                        <RoleBadge role={booking.diinput.role} />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                          {booking.diinput.name}
                        </span>
                      </div>
                    </TableCell>
                    
                    {/* Paket & Waktu */}
                    <TableCell className="align-top pt-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-1">
                          {booking.paket}
                        </span>
                        <a href="#" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline hover:text-blue-700 flex items-center gap-1">
                          {booking.keberangkatan}
                        </a>
                      </div>
                    </TableCell>
                    
                    {/* Total */}
                    <TableCell className="align-top pt-4 text-right">
                      <span className="font-semibold text-[15px] text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {formatCurrency(booking.total)}
                      </span>
                    </TableCell>
                    
                    {/* Status Bayar */}
                    <TableCell className="align-top pt-4 text-center">
                      <PaymentStatusBadge status={booking.statusBayar} />
                    </TableCell>
                    
                    {/* Status */}
                    <TableCell className="align-top pt-4 text-center">
                      <BookingStatusBadge status={booking.status} />
                    </TableCell>
                    
                    {/* Aksi */}
                    <TableCell className="align-top pt-4 text-right pr-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-500 dark:hover:bg-green-950/50"
                          title="Hubungi via WhatsApp"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                        <Button size="sm" className="h-8 pl-3 pr-2.5 gap-1 shadow-sm font-medium">
                          Detail
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                    
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="border-t border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <span className="text-sm text-slate-500 font-medium">Menampilkan 4 dari 4 booking</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled>Sebelumnya</Button>
              <Button variant="outline" size="sm" disabled>Selanjutnya</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
