import { z } from "zod";

const CustomerSchema = z.object({
  name: z.string().trim().min(2, "Customer name is too short").max(120),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().email("Invalid customer email").max(255).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
});

const ItemSchema = z.object({
  itemName: z.string().trim().min(1, "Item name is required").max(200),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  quantity: z.coerce
    .number({ invalid_type_error: "Quantity must be a number" })
    .finite()
    .gt(0, "Quantity must be greater than 0"),
  unitPrice: z.coerce
    .number({ invalid_type_error: "Unit price must be a number" })
    .finite()
    .gte(0, "Unit price must be >= 0"),
  total: z.coerce.number().finite().gte(0).optional(),
});

export const ReceiptCreateSchema = z.object({
  customer: CustomerSchema,
  items: z
    .array(ItemSchema)
    .min(1, "At least one item is required")
    .max(200, "Max 200 items per receipt"),
  gstEnabled: z.boolean().optional().default(false),
  gstPercentage: z.coerce
    .number()
    .finite()
    .gte(0)
    .lte(100, "GST % must be <= 100")
    .optional()
    .default(0),
  discount: z
    .object({
      percentage: z.coerce.number().finite().gte(0).lte(100).optional().default(0),
    })
    .optional(),
  discountPercentage: z.coerce.number().finite().gte(0).lte(100).optional(),
  shipping: z.coerce.number().finite().gte(0).optional().default(0),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  currency: z
    .enum(["INR", "USD", "EUR", "GBP", "AED", "SAR"])
    .default("INR")
    .optional(),
  businessId: z.string().trim().optional().or(z.literal("")),
});

export const ReceiptUpdateSchema = ReceiptCreateSchema.partial().refine(
  (d) => Object.keys(d).length > 0,
  { message: "At least one field is required for update" },
);

export const ReceiptListSchema = z.object({
  page: z.coerce.number().int().gte(1).default(1),
  limit: z.coerce.number().int().gte(1).lte(200).default(25),
  search: z.string().trim().max(100).optional().or(z.literal("")),
  from: z.string().optional(),
  to: z.string().optional(),
  sort: z.enum(["newest", "oldest", "highest", "lowest"]).default("newest"),
});

export function validateReceiptCreate(data) {
  return ReceiptCreateSchema.safeParse(data);
}

export function validateReceiptUpdate(data) {
  return ReceiptUpdateSchema.safeParse(data);
}

export function validateReceiptList(query) {
  return ReceiptListSchema.safeParse(query);
}

export default {
  create: validateReceiptCreate,
  update: validateReceiptUpdate,
  list: validateReceiptList,
};
