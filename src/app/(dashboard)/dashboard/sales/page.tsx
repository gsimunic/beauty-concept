import { SaleItemType } from "@prisma/client";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { createTranslator, getUserLocale } from "@/lib/i18n";
import { Section } from "@/components/ui/section";
import { prisma } from "@/lib/prisma";

import { createSaleAction } from "./actions";

export default async function SalesPage() {
  const [products, services, packages, clients, sales, session] = await Promise.all([
    prisma.product.findMany({ orderBy: { name: "asc" } }),
    prisma.service.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.packageTemplate.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.sale.findMany({
      include: {
        employee: { select: { name: true, email: true } },
        items: true
      },
      orderBy: { createdAt: "desc" },
      take: 30
    }),
    getServerSession(authOptions)
  ]);
  const locale = await getUserLocale(session?.user.id);
  const t = createTranslator(locale);

  const refCatalog = [
    ...products.map((p) => ({ id: p.id, label: `PRODUCT | ${p.name}`, price: Number(p.sellingPrice), type: "PRODUCT" })),
    ...services.map((s) => ({ id: s.id, label: `SERVICE | ${s.name}`, price: Number(s.basePrice), type: "SERVICE" })),
    ...packages.map((p) => ({ id: p.id, label: `PACKAGE | ${p.name}`, price: Number(p.totalPrice), type: "PACKAGE" }))
  ];
  const paymentLabel: Record<string, string> = {
    CASH: t("pages.sales.paymentCash"),
    TRANSFER: t("pages.sales.paymentReservation")
  };

  return (
    <main className="grid gap-6">
      <h1 className="text-2xl font-semibold text-[var(--bc-text)]">{t("pages.sales.title")}</h1>

      <Section title={t("pages.sales.createSale")}>
        <form action={createSaleAction} className="grid gap-3 md:grid-cols-3">
          <select name="paymentMethod" defaultValue="CASH">
            <option value="CASH">{t("pages.sales.paymentCash")}</option>
            <option value="TRANSFER">{t("pages.sales.paymentReservation")}</option>
          </select>

          <select name="type" defaultValue={SaleItemType.PRODUCT}>
            {Object.values(SaleItemType).map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <select name="referenceId" required>
            <option value="">{t("pages.sales.selectItem")}</option>
            {refCatalog.map((item) => (
              <option key={`${item.type}-${item.id}`} value={item.id}>
                {item.label} ({formatCurrency(item.price)})
              </option>
            ))}
          </select>

          <input name="quantity" type="number" min={1} defaultValue={1} required />
          <input name="unitPrice" type="number" min={0} step="0.01" placeholder={t("pages.sales.unitPriceOverride")} />
          <select name="clientId" defaultValue="">
            <option value="">{t("pages.sales.clientRequiredForPackage")}</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>

          <input name="customPrice" type="number" min={0} step="0.01" placeholder={t("pages.sales.customPackagePrice")} />
          <input name="expirationDate" type="date" />

          <button className="md:col-span-3" type="submit">{t("pages.sales.createSaleButton")}</button>
        </form>
      </Section>

      <Section title={t("pages.sales.recentSales")}>
        {sales.length === 0 ? (
          <p className="text-sm text-[var(--bc-muted)]">{t("pages.sales.noSales")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--bc-border)] text-[var(--bc-muted)]">
                  <th className="px-2 py-2 font-medium">{t("common.date")}</th>
                  <th className="px-2 py-2 font-medium">{t("pages.sales.employee")}</th>
                  <th className="px-2 py-2 font-medium">{t("pages.sales.payment")}</th>
                  <th className="px-2 py-2 font-medium">{t("pages.sales.items")}</th>
                  <th className="px-2 py-2 font-medium">{t("pages.sales.total")}</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} className="border-b border-[#efe3d4] align-top">
                    <td className="px-2 py-2">{sale.createdAt.toLocaleString()}</td>
                    <td className="px-2 py-2">{sale.employee.name ?? sale.employee.email}</td>
                    <td className="px-2 py-2">{paymentLabel[sale.paymentMethod] ?? sale.paymentMethod}</td>
                    <td className="px-2 py-2">
                      <ul className="grid gap-1">
                        {sale.items.map((item) => (
                          <li key={item.id}>{item.type} x{item.quantity} ({formatCurrency(Number(item.total))})</li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-2 py-2">{formatCurrency(Number(sale.totalAmount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </main>
  );
}
