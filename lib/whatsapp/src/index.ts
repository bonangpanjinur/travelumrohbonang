export { sendWhatsApp, normalizePhone } from "./waService";
export { isWhatsAppConfigured, getFonnteToken, getSenderNumber } from "./client";
export {
  bookingCreatedWA,
  paymentReceivedWA,
  documentsCompleteWA,
  departureReminderWA,
} from "./templates";
export type { SendWAInput, SendWAResult } from "./waService";
