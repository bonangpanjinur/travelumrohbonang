export * from "./generated/api";
export * from "./generated/api.schemas";
export { setBaseUrl, setAuthTokenGetter } from "./custom-fetch";
export type { AuthTokenGetter } from "./custom-fetch";
export type {
  Booking,
  BookingWithDetailsSchema,
  CreateBookingInput,
  Package,
  PackageDetail,
  PackageDeparture,
  DeparturePrice,
  Profile,
  UpdateProfileInput,
} from "@workspace/api-zod";
export * from './generated/api';
export * from './generated/api.schemas';
