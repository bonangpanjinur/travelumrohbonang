export type RequestedRoom = {
  roomType: string;
  quantity: number;
};

export type OfficialRoomPrice = {
  roomType: string;
  price: number;
};

export type CalculatedRoomLine = RequestedRoom & {
  price: number;
  subtotal: number;
};

export class BookingPricingError extends Error {
  code: "DUPLICATE_ROOM_TYPE" | "ROOM_UNAVAILABLE" | "INVALID_TOTAL" | "TOTAL_TOO_LARGE";

  constructor(code: BookingPricingError["code"], message: string) {
    super(message);
    this.name = "BookingPricingError";
    this.code = code;
  }
}

export function calculateAuthoritativeBookingPrice(
  rooms: RequestedRoom[],
  officialPrices: OfficialRoomPrice[],
) {
  const priceByRoomType = new Map(officialPrices.map((row) => [row.roomType, Number(row.price)]));
  const seenRoomTypes = new Set<string>();
  const lines: CalculatedRoomLine[] = [];
  let total = 0;

  for (const room of rooms) {
    if (seenRoomTypes.has(room.roomType)) {
      throw new BookingPricingError("DUPLICATE_ROOM_TYPE", `Tipe kamar '${room.roomType}' tidak boleh dikirim lebih dari satu kali`);
    }
    seenRoomTypes.add(room.roomType);

    const price = priceByRoomType.get(room.roomType);
    if (!price || price <= 0) {
      throw new BookingPricingError("ROOM_UNAVAILABLE", `Tipe kamar '${room.roomType}' tidak tersedia untuk keberangkatan ini`);
    }
    if (!Number.isSafeInteger(room.quantity) || room.quantity <= 0) {
      throw new BookingPricingError("INVALID_TOTAL", `Jumlah kamar '${room.roomType}' tidak valid`);
    }

    const subtotal = price * room.quantity;
    if (!Number.isSafeInteger(subtotal)) {
      throw new BookingPricingError("TOTAL_TOO_LARGE", "Nominal booking terlalu besar");
    }
    total += subtotal;
    lines.push({ ...room, price, subtotal });
  }

  if (!Number.isSafeInteger(total) || total <= 0) {
    throw new BookingPricingError("INVALID_TOTAL", "Total harga booking tidak valid");
  }

  return { total, lines };
}
