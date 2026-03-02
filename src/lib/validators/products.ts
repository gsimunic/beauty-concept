import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(1),
  brand: z.string().min(1),
  category: z.string().min(1),
  purchasePrice: z.coerce.number().nonnegative(),
  sellingPrice: z.coerce.number().nonnegative(),
  stockQuantity: z.coerce.number().int().nonnegative(),
  minStockAlert: z.coerce.number().int().nonnegative(),
  active: z.coerce.boolean().default(true)
});
