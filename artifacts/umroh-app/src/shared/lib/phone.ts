/**
 * Normalisasi nomor telepon Indonesia ke format E.164 (+62…).
 * Aturan:
 * - Hapus spasi, tanda hubung, kurung, titik
 * - Awalan +62 → biarkan (digit-only setelah +)
 * - Awalan 62 → +62
 * - Awalan 0 → +62
 * - Awalan 8 → +628…
 * - Lainnya → "+" + digit
 * Mengembalikan "" untuk input kosong / hanya simbol.
 */
export const normalizePhone = (raw: string | null | undefined): string => {
  if (!raw) return "";
  const cleaned = raw.replace(/[\s\-().]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("+62")) {
    const rest = cleaned.slice(1).replace(/\D/g, "");
    return rest ? "+" + rest : "";
  }
  const digits = cleaned.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("62")) return "+" + digits;
  if (digits.startsWith("0")) return "+62" + digits.slice(1);
  if (digits.startsWith("8")) return "+62" + digits;
  return "+" + digits;
};

/**
 * Validasi ketat: hanya menerima +62 diikuti 9–13 digit (total 10–14 digit setelah '+').
 * Nomor seluler Indonesia umumnya 10–13 digit setelah kode negara (8xx…).
 */
export const PHONE_REGEX = /^\+628\d{8,11}$/;

export const isValidIndonesianPhone = (v: string): boolean => PHONE_REGEX.test(v);
