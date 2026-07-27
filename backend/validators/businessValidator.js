import { z } from "zod";

export const AddressSchema = z.object({
  addressLine: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  state: z.string().trim().max(80).optional().or(z.literal("")),
  country: z.string().trim().max(80).optional().or(z.literal("")),
  postalCode: z.string().trim().max(20).optional().or(z.literal("")),
});

export const BusinessCreateSchema = z.object({
  companyName: z.string().trim().min(2, "Company name is too short").max(120),
  ownerName: z.string().trim().max(120).optional().or(z.literal("")),
  logo: z
    .string()
    .trim()
    .max(1_500_000, "Logo too large (max 1.5MB as base64)")
    .url({ message: "Logo must be a valid URL or base64 data URL" })
    .or(z.string().startsWith("data:", { message: "Logo must be a URL or data URL" }))
    .nullish()
    .or(z.literal("")),
  phone: z.string().trim().min(6, "Phone is too short").max(30),
  email: z.string().email("Invalid email").max(255).optional().or(z.literal("")),
  website: z.string().trim().max(255).optional().or(z.literal("")),
  gstNumber: z.string().trim().max(20).optional().or(z.literal("")),
  currency: z
    .enum(["INR", "USD", "EUR", "GBP", "AED", "SAR"])
    .default("INR")
    .optional(),
  address: AddressSchema.optional(),
});

export const BusinessUpdateSchema = BusinessCreateSchema.partial().refine(
  (d) => Object.keys(d).length > 0,
  { message: "At least one field is required for update" },
);

export const BusinessQuerySchema = z.object({
  populate: z.enum(["true", "false"]).optional(),
});

export function validateBusinessCreate(data) {
  return BusinessCreateSchema.safeParse(data);
}
export function validateBusinessUpdate(data) {
  return BusinessUpdateSchema.safeParse(data);
}

export default {
  create: validateBusinessCreate,
  update: validateBusinessUpdate,
};
