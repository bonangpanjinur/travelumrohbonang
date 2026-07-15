export { sendEmail } from "./emailService";
export type { SendEmailInput, SendEmailResult } from "./emailService";
export { isEmailConfigured } from "./client";
export {
  bookingCreatedTemplate,
  paymentReceivedTemplate,
  installmentReminderTemplate,
  departureReminderTemplate,
  documentsCompleteTemplate,
} from "./templates";
export type {
  BookingCreatedData,
  PaymentReceivedData,
  InstallmentReminderData,
  DepartureReminderData,
  DocumentsCompleteData,
} from "./templates";
