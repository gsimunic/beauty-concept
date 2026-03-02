import { PaymentMethod } from "@prisma/client";
import { z } from "zod";

export const saleSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
  sellingPrice: z.coerce.number().nonnegative(),
  saleDate: z.coerce.date(),
  paymentMethod: z.nativeEnum(PaymentMethod)
});
