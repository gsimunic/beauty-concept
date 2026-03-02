import { ExpenseCategory } from "@prisma/client";
import { z } from "zod";

export const expenseSchema = z.object({
  date: z.coerce.date(),
  description: z.string().min(1),
  category: z.nativeEnum(ExpenseCategory),
  amount: z.coerce.number().nonnegative(),
  recurring: z.coerce.boolean().default(false)
});
