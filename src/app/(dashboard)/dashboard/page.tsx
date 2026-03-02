import { getServerSession } from "next-auth";

import { StatCard } from "@/components/ui/card";
import { Section } from "@/components/ui/section";
import { authOptions } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { createTranslator, getUserLocale } from "@/lib/i18n";
import { getDashboardMetrics } from "@/lib/services/dashboard";

export default async function DashboardPage() {
  const [metrics, session] = await Promise.all([getDashboardMetrics(), getServerSession(authOptions)]);
  const locale = await getUserLocale(session?.user.id);
  const t = createTranslator(locale);

  return (
    <main className="grid gap-6">
      <h1 className="text-2xl font-semibold text-[var(--bc-text)]">{t("pages.dashboard.title")}</h1>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
        <StatCard title={t("pages.dashboard.inventoryValue")} value={formatCurrency(metrics.totalInventoryValue)} />
        <StatCard title={t("pages.dashboard.monthlyRevenue")} value={formatCurrency(metrics.monthlyRevenue)} />
        <StatCard title={t("pages.dashboard.monthlyExpenses")} value={formatCurrency(metrics.monthlyExpenses)} />
        <StatCard title={t("pages.dashboard.netProfit")} value={formatCurrency(metrics.netProfit)} />
        <StatCard title={t("pages.dashboard.lowStockProducts")} value={String(metrics.lowStockProducts.length)} />
        <StatCard title={t("pages.dashboard.activeClientPackages")} value={String(metrics.activeClientPackages)} />
        <StatCard title={t("pages.dashboard.serviceRevenue")} value={formatCurrency(metrics.revenueBreakdown.services)} />
        <StatCard title={t("pages.dashboard.productRevenue")} value={formatCurrency(metrics.revenueBreakdown.products)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title={t("pages.dashboard.revenueBreakdown")}>
          <div className="grid gap-2 text-sm text-[var(--bc-text)]">
            <p>{t("pages.dashboard.products")}: {formatCurrency(metrics.revenueBreakdown.products)}</p>
            <p>{t("pages.dashboard.services")}: {formatCurrency(metrics.revenueBreakdown.services)}</p>
            <p>{t("pages.dashboard.packages")}: {formatCurrency(metrics.revenueBreakdown.packages)}</p>
          </div>
        </Section>

        <Section title={t("pages.dashboard.lowStockAlerts")}>
          {metrics.lowStockProducts.length === 0 ? (
            <p className="text-sm text-[var(--bc-muted)]">{t("pages.dashboard.noLowStock")}</p>
          ) : (
            <ul className="grid gap-2 text-sm">
              {metrics.lowStockProducts.map((product) => (
                <li key={product.id} className="rounded-md border border-[#d7b9b0] bg-[#fff1ef] px-3 py-2">
                  {product.name}: {product.currentStock} ({t("pages.dashboard.min")} {product.minimumStockLevel})
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title={t("pages.dashboard.topServices")}>
          {metrics.topServices.length === 0 ? (
            <p className="text-sm text-[var(--bc-muted)]">{t("pages.dashboard.noServiceSales")}</p>
          ) : (
            <ul className="grid gap-2 text-sm">
              {metrics.topServices.map((service) => (
                <li key={service.name} className="flex items-center justify-between rounded-md border border-[var(--bc-border)] bg-[#fffdf9] px-3 py-2">
                  <span>{service.name} ({service.count})</span>
                  <span>{formatCurrency(service.revenue)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title={t("pages.dashboard.topProducts")}>
          {metrics.topProducts.length === 0 ? (
            <p className="text-sm text-[var(--bc-muted)]">{t("pages.dashboard.noProductSales")}</p>
          ) : (
            <ul className="grid gap-2 text-sm">
              {metrics.topProducts.map((product) => (
                <li key={product.name} className="flex items-center justify-between rounded-md border border-[var(--bc-border)] bg-[#fffdf9] px-3 py-2">
                  <span>{product.name} ({product.count})</span>
                  <span>{formatCurrency(product.revenue)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section title={t("pages.dashboard.revenuePerEmployee")}>
        {metrics.employeeStats.length === 0 ? (
          <p className="text-sm text-[var(--bc-muted)]">{t("pages.dashboard.noEmployeeRevenue")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--bc-border)] text-[var(--bc-muted)]">
                  <th className="px-2 py-2 font-medium">{t("pages.dashboard.employee")}</th>
                  <th className="px-2 py-2 font-medium">{t("pages.dashboard.revenue")}</th>
                  <th className="px-2 py-2 font-medium">{t("pages.dashboard.sales")}</th>
                  <th className="px-2 py-2 font-medium">{t("pages.dashboard.servicesPerformed")}</th>
                </tr>
              </thead>
              <tbody>
                {metrics.employeeStats.map((employee) => (
                  <tr key={employee.employeeId} className="border-b border-[#efe3d4]">
                    <td className="px-2 py-2">{employee.employee}</td>
                    <td className="px-2 py-2">{formatCurrency(employee.revenue)}</td>
                    <td className="px-2 py-2">{employee.salesCount}</td>
                    <td className="px-2 py-2">{employee.servicesPerformed}</td>
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
