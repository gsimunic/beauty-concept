"use server";

import { ClientPackageStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { toNumber } from "@/lib/utils";

const baseClientSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().min(6, "Phone is required"),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal(""))
});

const updateClientSchema = baseClientSchema.extend({
  id: z.string().min(1)
});

const deleteClientSchema = z.object({
  id: z.string().min(1)
});

const assignPackageSchema = z.object({
  clientId: z.string().min(1),
  packageTemplateId: z.string().min(1),
  customPrice: z.coerce.number().nonnegative().optional(),
  expirationDate: z.coerce.date().optional()
});

const packageUsageSchema = z.object({
  clientPackageId: z.string().min(1),
  serviceId: z.string().min(1),
  datePerformed: z.coerce.date(),
  notes: z.string().trim().optional().or(z.literal(""))
});

async function requireAuthenticated() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  return session;
}

function toNullable(value?: string) {
  return value && value.length > 0 ? value : null;
}

export async function createClientAction(formData: FormData) {
  await requireAuthenticated();

  const parsed = baseClientSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    notes: formData.get("notes")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid client input");
  }

  await prisma.client.create({
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: toNullable(parsed.data.email),
      notes: toNullable(parsed.data.notes)
    }
  });

  revalidatePath("/dashboard/clients");
}

export async function updateClientAction(formData: FormData) {
  await requireAuthenticated();

  const parsed = updateClientSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    notes: formData.get("notes")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid client input");
  }

  await prisma.client.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: toNullable(parsed.data.email),
      notes: toNullable(parsed.data.notes)
    }
  });

  revalidatePath("/dashboard/clients");
}

export async function deleteClientAction(formData: FormData) {
  await requireAdmin();

  const parsed = deleteClientSchema.safeParse({
    id: formData.get("id")
  });

  if (!parsed.success) {
    throw new Error("Invalid client id");
  }

  await prisma.client.delete({
    where: { id: parsed.data.id }
  });

  revalidatePath("/dashboard/clients");
}

export async function assignClientPackageAction(formData: FormData) {
  await requireAuthenticated();

  const parsed = assignPackageSchema.safeParse({
    clientId: formData.get("clientId"),
    packageTemplateId: formData.get("packageTemplateId"),
    customPrice: formData.get("customPrice") || undefined,
    expirationDate: formData.get("expirationDate") || undefined
  });

  if (!parsed.success) {
    throw new Error("Invalid package assignment");
  }

  await prisma.$transaction(async (tx) => {
    const template = await tx.packageTemplate.findUnique({
      where: { id: parsed.data.packageTemplateId },
      include: { items: true }
    });

    if (!template) throw new Error("Package template not found");

    const totalSessions = template.items.reduce((sum, item) => sum + item.quantity, 0);
    if (totalSessions <= 0) throw new Error("Package template has no sessions");

    await tx.clientPackage.create({
      data: {
        clientId: parsed.data.clientId,
        packageTemplateId: parsed.data.packageTemplateId,
        customPrice: parsed.data.customPrice,
        purchaseDate: new Date(),
        totalSessions,
        remainingSessions: totalSessions,
        expirationDate: parsed.data.expirationDate,
        status: ClientPackageStatus.ACTIVE
      }
    });
  });

  revalidatePath("/dashboard/clients");
}

export async function useClientPackageAction(formData: FormData) {
  await requireAuthenticated();

  const parsed = packageUsageSchema.safeParse({
    clientPackageId: formData.get("clientPackageId"),
    serviceId: formData.get("serviceId"),
    datePerformed: formData.get("datePerformed") || new Date(),
    notes: formData.get("notes")
  });

  if (!parsed.success) {
    throw new Error("Invalid package usage input");
  }

  await prisma.$transaction(async (tx) => {
    const clientPackage = await tx.clientPackage.findUnique({
      where: { id: parsed.data.clientPackageId }
    });
    if (!clientPackage) throw new Error("Client package not found");
    if (clientPackage.remainingSessions <= 0) throw new Error("No sessions remaining");

    await tx.clientPackageUsage.create({
      data: {
        clientPackageId: parsed.data.clientPackageId,
        serviceId: parsed.data.serviceId,
        datePerformed: parsed.data.datePerformed,
        notes: toNullable(parsed.data.notes)
      }
    });

    const remainingSessions = clientPackage.remainingSessions - 1;

    await tx.clientPackage.update({
      where: { id: clientPackage.id },
      data: {
        remainingSessions,
        status: remainingSessions === 0 ? ClientPackageStatus.COMPLETED : clientPackage.status
      }
    });
  });

  revalidatePath("/dashboard/clients");
}
