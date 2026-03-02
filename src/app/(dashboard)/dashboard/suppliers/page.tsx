import { getServerSession } from "next-auth";

import { Section } from "@/components/ui/section";
import { authOptions } from "@/lib/auth";
import { createTranslator, getUserLocale } from "@/lib/i18n";
import { getSuppliersOverview } from "@/lib/services/suppliers";

import { createSupplierAction, deleteSupplierAction, updateSupplierAction } from "./actions";

export default async function SuppliersPage() {
  const [suppliers, session] = await Promise.all([getSuppliersOverview(), getServerSession(authOptions)]);
  const isAdmin = session?.user.role === "ADMIN";
  const locale = await getUserLocale(session?.user.id);
  const t = createTranslator(locale);

  return (
    <main className="grid gap-6">
      <h1 className="text-2xl font-semibold text-[var(--bc-text)]">{t("pages.suppliers.title")}</h1>

      <Section title={t("pages.suppliers.addSupplier")}>
        <form action={createSupplierAction} className="grid gap-3 md:grid-cols-2">
          <input name="name" placeholder={t("pages.suppliers.supplierName")} required />
          <input name="contactName" placeholder={t("pages.suppliers.contactName")} />
          <input name="phone" placeholder={t("pages.clients.phone")} />
          <input name="email" placeholder={t("pages.clients.email")} type="email" />
          <textarea className="md:col-span-2" name="notes" placeholder={t("common.notes")} rows={3} />
          <button className="md:col-span-2" type="submit">
            {t("pages.suppliers.addSupplierButton")}
          </button>
        </form>
      </Section>

      <Section title={t("pages.suppliers.supplierList")}>
        {suppliers.length === 0 ? (
          <p className="text-sm text-[var(--bc-muted)]">{t("pages.suppliers.noSuppliers")}</p>
        ) : (
          <div className="grid gap-3">
            {suppliers.map((supplier) => (
              <div className="rounded-lg border border-[var(--bc-border)] bg-[#fffdf9] p-4" key={supplier.id}>
                <form action={updateSupplierAction} className="grid gap-3 md:grid-cols-2">
                  <input name="id" type="hidden" value={supplier.id} />
                  <input defaultValue={supplier.name} name="name" required />
                  <input defaultValue={supplier.contactName ?? ""} name="contactName" placeholder={t("pages.suppliers.contactName")} />
                  <input defaultValue={supplier.phone ?? ""} name="phone" placeholder={t("pages.clients.phone")} />
                  <input defaultValue={supplier.email ?? ""} name="email" placeholder={t("pages.clients.email")} type="email" />
                  <textarea
                    className="md:col-span-2"
                    defaultValue={supplier.notes ?? ""}
                    name="notes"
                    placeholder={t("common.notes")}
                    rows={2}
                  />
                  <div className="flex items-center justify-between gap-2 md:col-span-2">
                    <span className="text-xs text-[var(--bc-muted)]">
                      {t("pages.suppliers.stockMovementsLinked")}: {supplier.movementCount}
                    </span>
                    <div className="flex items-center gap-2">
                      <button type="submit">{t("common.save")}</button>
                    </div>
                  </div>
                </form>

                {isAdmin ? (
                  <form action={deleteSupplierAction} className="mt-2 flex justify-end">
                    <input name="id" type="hidden" value={supplier.id} />
                    <button className="bg-[#7f3b34] hover:bg-[#6d322c]" type="submit">
                      {t("common.delete")}
                    </button>
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
