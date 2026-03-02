"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

const templateSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional().or(z.literal("")),
  totalPrice: z.coerce.number().nonnegative(),
  active: z.coerce.boolean().default(true)
});

const templateUpdateSchema = templateSchema.extend({ id: z.string().min(1) });
const itemSchema = z.object({
  packageTemplateId: z.string().min(1),
  serviceId: z.string().min(1),
  quantity: z.coerce.number().int().positive()
});

export async function createPackageTemplateAction(formData: FormData) {
  await requireAdmin();
  const parsed = templateSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    totalPrice: formData.get("totalPrice"),
    active: formData.get("active")
  });
  if (!parsed.success) throw new Error("Invalid package template");

  await prisma.packageTemplate.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      totalPrice: parsed.data.totalPrice,
      active: parsed.data.active
    }
  });
  revalidatePath("/dashboard/packages");
}

export async function updatePackageTemplateAction(formData: FormData) {
  await requireAdmin();
  const parsed = templateUpdateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    description: formData.get("description"),
    totalPrice: formData.get("totalPrice"),
    active: formData.get("active")
  });
  if (!parsed.success) throw new Error("Invalid package template");

  await prisma.packageTemplate.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      totalPrice: parsed.data.totalPrice,
      active: parsed.data.active
    }
  });
  revalidatePath("/dashboard/packages");
}

export async function deletePackageTemplateAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Invalid id");

  await prisma.packageTemplate.delete({ where: { id } });
  revalidatePath("/dashboard/packages");
}

export async function addPackageTemplateItemAction(formData: FormData) {
  await requireAdmin();
  const parsed = itemSchema.safeParse({
    packageTemplateId: formData.get("packageTemplateId"),
    serviceId: formData.get("serviceId"),
    quantity: formData.get("quantity")
  });
  if (!parsed.success) throw new Error("Invalid template item");

  await prisma.packageTemplateItem.create({ data: parsed.data });
  revalidatePath("/dashboard/packages");
}

export async function deletePackageTemplateItemAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Invalid id");

  await prisma.packageTemplateItem.delete({ where: { id } });
  revalidatePath("/dashboard/packages");
}
