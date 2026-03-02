import { z } from "zod";

export const idSchema = z.string().uuid();
export const dateSchema = z.coerce.date();
export const moneySchema = z.coerce.number().nonnegative();
