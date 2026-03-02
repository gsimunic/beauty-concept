"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

const serviceSchema = z.object({
  name: z.string().trim().min(1),
  basePrice: z.coerce.number().nonnegative(),
  durationMinutes: z.coerce.number().int().positive().optional(),
  active: z.coerce.boolean().default(true)
});

const serviceUpdateSchema = serviceSchema.extend({ id: z.string().min(1) });

const mappingSchema = z.object({
  serviceId: z.string().min(1),
  productId: z.string().min(1),
  quantityUsed: z.coerce.number().positive()
});

const mappingDeleteSchema = z.object({ id: z.string().min(1) });

async function requireAuthenticated() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
}

export async function createServiceAction(formData: FormData) {
  await requireAuthenticated();
  const parsed = serviceSchema.safeParse({
    name: formData.get("name"),
    basePrice: formData.get("basePrice"),
    durationMinutes: formData.get("durationMinutes") || undefined,
    active: formData.get("active")
  });
  if (!parsed.success) throw new Error("Invalid service data");

  await prisma.service.create({
    data: parsed.data
  });
  revalidatePath("/dashboard/services");
}

export async function updateServiceAction(formData: FormData) {
  await requireAuthenticated();
  const parsed = serviceUpdateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    basePrice: formData.get("basePrice"),
    durationMinutes: formData.get("durationMinutes") || undefined,
    active: formData.get("active")
  });
  if (!parsed.success) throw new Error("Invalid service data");

  await prisma.service.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      basePrice: parsed.data.basePrice,
      durationMinutes: parsed.data.durationMinutes ?? null,
      active: parsed.data.active
    }
  });
  revalidatePath("/dashboard/services");
}

export async function deleteServiceAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Invalid service id");

  await prisma.service.delete({ where: { id } });
  revalidatePath("/dashboard/services");
}

export async function upsertServiceConsumptionAction(formData: FormData) {
  await requireAuthenticated();
  const parsed = mappingSchema.safeParse({
    serviceId: formData.get("serviceId"),
    productId: formData.get("productId"),
    quantityUsed: formData.get("quantityUsed")
  });
  if (!parsed.success) throw new Error("Invalid mapping data");

  await prisma.serviceConsumption.upsert({
    where: {
      serviceId_productId: {
        serviceId: parsed.data.serviceId,
        productId: parsed.data.productId
      }
    },
    update: {
      quantityUsed: parsed.data.quantityUsed
    },
    create: parsed.data
  });

  revalidatePath("/dashboard/services");
}

export async function deleteServiceConsumptionAction(formData: FormData) {
  await requireAdmin();
  const parsed = mappingDeleteSchema.safeParse({
    id: formData.get("id")
  });
  if (!parsed.success) throw new Error("Invalid mapping id");

  await prisma.serviceConsumption.delete({ where: { id: parsed.data.id } });
  revalidatePath("/dashboard/services");
}
