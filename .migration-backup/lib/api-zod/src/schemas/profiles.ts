import { z } from "zod";

export const ProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  branchId: z.string().nullable(),
  totpEnabled: z.boolean(),
  createdAt: z.coerce.date().nullable(),
});

export const UpdateProfileRequest = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().url().optional(),
});

export type Profile = z.infer<typeof ProfileSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileRequest>;
