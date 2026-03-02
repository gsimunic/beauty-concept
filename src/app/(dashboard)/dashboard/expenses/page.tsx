import { ExpenseCategory } from "@prisma/client";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { createTranslator, getUserLocale } from "@/lib/i18n";
import { Section } from "@/components/ui/section";
import { prisma } from "@/lib/prisma";

import { createExpenseAction, deleteExpenseAction, updateExpenseAction } from "./actions";

export default async function ExpensesPage() {
  const [session, expenses] = await Promise.all([
    getServerSession(authOptions),
    prisma.expense.findMany({ orderBy: { date: "desc" } })
  ]);
  const isAdmin = session?.user.role === "ADMIN";
  const locale = await getUserLocale(session?.user.id);
  const t = createTranslator(locale);

  return (
    <main className="grid gap-6">
      <h1 className="text-2xl font-semibold text-[var(--bc-text)]">{t("pages.expenses.title")}</h1>

      <Section title={t("pages.expenses.addExpense")}>
        <form action={createExpenseAction} className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-xs text-[var(--bc-muted)]">
            {t("common.category")}
            <select name="category" defaultValue={ExpenseCategory.OTHER}>
              {Object.values(ExpenseCategory).map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs text-[var(--bc-muted)]">
            {t("pages.expenses.amount")}
            <input name="amount" type="number" min={0} step="0.01" required />
          </label>
          <label className="grid gap-1 text-xs text-[var(--bc-muted)]">
            {t("common.date")}
            <input name="date" type="date" required />
          </label>
          <label className="grid gap-1 text-xs text-[var(--bc-muted)]">
            {t("common.notes")}
            <input name="notes" />
          </label>
          <button className="md:col-span-2" type="submit">{t("pages.expenses.createExpense")}</button>
        </form>
      </Section>

      <Section title={t("pages.expenses.expenseList")}>
        {expenses.length === 0 ? (
          <p className="text-sm text-[var(--bc-muted)]">{t("pages.expenses.noExpenses")}</p>
        ) : (
          <div className="grid gap-3">
            {expenses.map((expense) => (
              <div key={expense.id} className="rounded-lg border border-[var(--bc-border)] bg-[#fffdf9] p-4">
                <form action={updateExpenseAction} className="grid gap-3 md:grid-cols-2">
                  <input type="hidden" name="id" value={expense.id} />
                  <select name="category" defaultValue={expense.category}>
                    {Object.values(ExpenseCategory).map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  <input name="amount" type="number" min={0} step="0.01" defaultValue={Number(expense.amount)} required />
                  <input name="date" type="date" defaultValue={expense.date.toISOString().slice(0, 10)} required />
                  <input name="notes" defaultValue={expense.notes ?? ""} placeholder={t("common.notes")} />
                  <div className="md:col-span-2 flex justify-between">
                    <span className="text-xs text-[var(--bc-muted)]">{t("pages.expenses.amount")}: {formatCurrency(Number(expense.amount))}</span>
                    <button type="submit">{t("pages.expenses.saveExpense")}</button>
                  </div>
                </form>
                {isAdmin ? (
                  <form action={deleteExpenseAction} className="mt-2 flex justify-end">
                    <input type="hidden" name="id" value={expense.id} />
                    <button className="bg-[#7f3b34] hover:bg-[#6d322c]" type="submit">{t("common.delete")}</button>
                  </form>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Section>
    </main>
  );
}
