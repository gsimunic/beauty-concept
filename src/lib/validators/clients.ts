import { z } from "zod";

export const clientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(6),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal(""))
});
