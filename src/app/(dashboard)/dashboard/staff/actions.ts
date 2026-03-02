"use server";

import { StaffType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

const nullableNumber = z.union([z.coerce.number().nonnegative(), z.literal(""), z.null(), z.undefined()]);

function toNullableNumber(value: z.infer<typeof nullableNumber>) {
  if (value === "" || value === null || value === undefined) return null;
  return Number(value);
}

const createStaffSchema = z.object({
  name: z.string().trim().min(1),
  type: z.nativeEnum(StaffType),
  baseSalary: nullableNumber,
  commissionPercentage: nullableNumber,
  profitSharePercentage: nullableNumber,
  active: z.union([z.literal("on"), z.literal("true"), z.literal("false"), z.undefined()]).optional()
});

const updateStaffSchema = createStaffSchema.extend({
  id: z.string().min(1)
});

const toggleStaffSchema = z.object({
  id: z.string().min(1),
  active: z.enum(["true", "false"])
});

function buildStaffPayload(parsed: z.infer<typeof createStaffSchema>) {
  const baseSalary = toNullableNumber(parsed.baseSalary);
  const commissionPercentage = toNullableNumber(parsed.commissionPercentage);
  const profitSharePercentage = toNullableNumber(parsed.profitSharePercentage);

  if (parsed.type === "INTERNAL") {
    return {
      name: parsed.name,
      type: parsed.type,
      active: parsed.active !== "false",
      baseSalary,
      commissionPercentage,
      profitSharePercentage: null
    };
  }

  return {
    name: parsed.name,
    type: parsed.type,
    active: parsed.active !== "false",
    baseSalary: null,
    commissionPercentage: null,
    profitSharePercentage
  };
}

export async function createStaffAction(formData: FormData) {
  await requireAdmin();

  const parsed = createStaffSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    baseSalary: formData.get("baseSalary"),
    commissionPercentage: formData.get("commissionPercentage"),
    profitSharePercentage: formData.get("profitSharePercentage"),
    active: formData.get("active")
  });

  if (!parsed.success) throw new Error("Invalid staff payload");

  await prisma.staff.create({ data: buildStaffPayload(parsed.data) });

  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard/sales");
  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/statistics");
}

export async function updateStaffAction(formData: FormData) {
  await requireAdmin();

  const parsed = updateStaffSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    type: formData.get("type"),
    baseSalary: formData.get("baseSalary"),
    commissionPercentage: formData.get("commissionPercentage"),
    profitSharePercentage: formData.get("profitSharePercentage"),
    active: formData.get("active")
  });

  if (!parsed.success) throw new Error("Invalid staff payload");

  await prisma.staff.update({
    where: { id: parsed.data.id },
    data: buildStaffPayload(parsed.data)
  });

  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard/sales");
  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/statistics");
}

export async function toggleStaffActiveAction(formData: FormData) {
  await requireAdmin();

  const parsed = toggleStaffSchema.safeParse({
    id: formData.get("id"),
    active: formData.get("active")
  });

  if (!parsed.success) throw new Error("Invalid staff toggle payload");

  await prisma.staff.update({
    where: { id: parsed.data.id },
    data: { active: parsed.data.active === "true" }
  });

  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard/sales");
  revalidatePath("/dashboard/clients");
}
