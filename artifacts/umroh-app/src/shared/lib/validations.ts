import { z } from "zod";

// Pilgrim validation schema
export const pilgrimSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Nama minimal 3 karakter")
    .max(100, "Nama maksimal 100 karakter")
    .regex(/^[a-zA-Z\s'.-]+$/, "Nama hanya boleh berisi huruf, spasi, dan tanda baca"),
  gender: z.enum(["male", "female"], {
    required_error: "Jenis kelamin wajib dipilih",
  }),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^(\+62|62|0)[0-9]{9,13}$/.test(val.replace(/\s/g, "")),
      "Format nomor HP tidak valid (contoh: 08123456789)"
    ),
  email: z
    .string()
    .optional()
    .refine(
      (val) => !val || z.string().email().safeParse(val).success,
      "Format email tidak valid"
    ),
  nik: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^[0-9]{16}$/.test(val),
      "NIK harus 16 digit angka"
    ),
  birth_date: z.string().optional(),
  passport_number: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^[A-Z0-9]{6,9}$/.test(val.toUpperCase()),
      "Nomor paspor tidak valid"
    ),
  passport_expiry: z.string().optional(),
});

// Booking room validation
export const bookingRoomSchema = z.object({
  room_type: z.enum(["quad", "triple", "double"]),
  quantity: z.number().min(0, "Quantity tidak boleh negatif"),
  price: z.number().min(0),
});

// Complete booking validation
export const bookingSchema = z.object({
  rooms: z
    .array(bookingRoomSchema)
    .refine(
      (rooms) => rooms.some((r) => r.quantity > 0),
      "Pilih minimal 1 kamar"
    ),
  pilgrims: z
    .array(pilgrimSchema)
    .min(1, "Minimal 1 data jemaah"),
  pic_type: z.enum(["pusat", "cabang", "agen"]),
  pic_id: z.string().uuid().optional().nullable(),
});

// Payment form validation
export const paymentSchema = z.object({
  amount: z.number().min(1, "Jumlah pembayaran wajib diisi"),
  payment_method: z.string().min(1, "Metode pembayaran wajib dipilih"),
  proof_url: z.string().url("URL bukti pembayaran tidak valid").optional(),
});

// Helper function to validate and get errors
export function validatePilgrim(data: unknown): { valid: boolean; errors: Record<string, string> } {
  const result = pilgrimSchema.safeParse(data);
  if (result.success) {
    return { valid: true, errors: {} };
  }
  
  const errors: Record<string, string> = {};
  result.error.errors.forEach((err) => {
    const path = err.path.join(".");
    errors[path] = err.message;
  });
  
  return { valid: false, errors };
}

export function validateBooking(data: unknown): { valid: boolean; errors: string[] } {
  const result = bookingSchema.safeParse(data);
  if (result.success) {
    return { valid: true, errors: [] };
  }
  
  return { 
    valid: false, 
    errors: result.error.errors.map((e) => e.message) 
  };
}

// Sanitize input to prevent XSS
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, 500); // Max length
}
