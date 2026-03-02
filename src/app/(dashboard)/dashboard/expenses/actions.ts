"use server";

import { ExpenseCategory } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

const expenseSchema = z.object({
  category: z.nativeEnum(ExpenseCategory),
  amount: z.coerce.number().nonnegative(),
  date: z.coerce.date(),
  notes: z.string().trim().optional().or(z.literal(""))
});

const updateSchema = expenseSchema.extend({ id: z.string().min(1) });

async function requireAuthenticated() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
}

export async function createExpenseAction(formData: FormData) {
  await requireAuthenticated();
  const parsed = expenseSchema.safeParse({
    category: formData.get("category"),
    amount: formData.get("amount"),
    date: formData.get("date"),
    notes: formData.get("notes")
  });
  if (!parsed.success) throw new Error("Invalid expense");

  await prisma.expense.create({
    data: {
      category: parsed.data.category,
      amount: parsed.data.amount,
      date: parsed.data.date,
      notes: parsed.data.notes || null
    }
  });
  revalidatePath("/dashboard/expenses");
  revalidatePath("/dashboard");
}

export async function updateExpenseAction(formData: FormData) {
  await requireAuthenticated();
  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    category: formData.get("category"),
    amount: formData.get("amount"),
    date: formData.get("date"),
    notes: formData.get("notes")
  });
  if (!parsed.success) throw new Error("Invalid expense");

  await prisma.expense.update({
    where: { id: parsed.data.id },
    data: {
      category: parsed.data.category,
      amount: parsed.data.amount,
      date: parsed.data.date,
      notes: parsed.data.notes || null
    }
  });
  revalidatePath("/dashboard/expenses");
  revalidatePath("/dashboard");
}

export async function deleteExpenseAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Invalid id");

  await prisma.expense.delete({ where: { id } });
  revalidatePath("/dashboard/expenses");
  revalidatePath("/dashboard");
}
