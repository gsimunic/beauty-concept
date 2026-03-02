"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

const supplierSchema = z.object({
  name: z.string().trim().min(1, "Supplier name is required"),
  contactName: z.string().trim().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal(""))
});

const updateSupplierSchema = supplierSchema.extend({
  id: z.string().min(1)
});

const deleteSupplierSchema = z.object({
  id: z.string().min(1)
});

async function requireAuthenticated() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
}

function toNullable(value?: string) {
  return value && value.length > 0 ? value : null;
}

export async function createSupplierAction(formData: FormData) {
  await requireAuthenticated();

  const parsed = supplierSchema.safeParse({
    name: formData.get("name"),
    contactName: formData.get("contactName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    notes: formData.get("notes")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid supplier input");
  }

  await prisma.supplier.create({
    data: {
      name: parsed.data.name,
      contactName: toNullable(parsed.data.contactName),
      phone: toNullable(parsed.data.phone),
      email: toNullable(parsed.data.email),
      notes: toNullable(parsed.data.notes)
    }
  });

  revalidatePath("/dashboard/suppliers");
  revalidatePath("/dashboard/inventory");
}

export async function updateSupplierAction(formData: FormData) {
  await requireAuthenticated();

  const parsed = updateSupplierSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    contactName: formData.get("contactName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    notes: formData.get("notes")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid supplier input");
  }

  await prisma.supplier.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      contactName: toNullable(parsed.data.contactName),
      phone: toNullable(parsed.data.phone),
      email: toNullable(parsed.data.email),
      notes: toNullable(parsed.data.notes)
    }
  });

  revalidatePath("/dashboard/suppliers");
  revalidatePath("/dashboard/inventory");
}

export async function deleteSupplierAction(formData: FormData) {
  await requireAdmin();

  const parsed = deleteSupplierSchema.safeParse({
    id: formData.get("id")
  });

  if (!parsed.success) {
    throw new Error("Invalid supplier id");
  }

  await prisma.supplier.delete({
    where: { id: parsed.data.id }
  });

  revalidatePath("/dashboard/suppliers");
  revalidatePath("/dashboard/inventory");
}
