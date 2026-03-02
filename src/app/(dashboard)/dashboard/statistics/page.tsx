import { getServerSession } from "next-auth";

import { StatCard } from "@/components/ui/card";
import { Section } from "@/components/ui/section";
import { authOptions } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { createTranslator, getUserLocale } from "@/lib/i18n";
import { getMonthlyStatistics } from "@/lib/services/statistics";

type PageProps = {
  searchParams?: {
    month?: string;
  };
};

function buildMonthOptions(locale: "hr" | "en", selectedMonth: string) {
  const options: Array<{ value: string; label: string; selected: boolean }> = [];
  const selectedDate = new Date(`${selectedMonth}-01T00:00:00`);

  for (let i = 0; i < 12; i += 1) {
    const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = new Intl.DateTimeFormat(locale === "hr" ? "hr-HR" : "en-US", {
      month: "long",
      year: "numeric"
    }).format(date);

    options.push({ value, label, selected: value === selectedMonth });
  }

  return options;
}

function BarList({
  items,
  formatter
}: {
  items: Array<{ id: string; name: string; revenue: number }>;
  formatter: (value: number) => string;
}) {
  const maxValue = Math.max(...items.map((item) => item.revenue), 0);

  return (
    <div className="grid gap-2">
      {items.map((item) => {
        const widthPercent = maxValue > 0 ? (item.revenue / maxValue) * 100 : 0;

        return (
          <div key={item.id} className="rounded-md border border-[var(--bc-border)] bg-[#fffdf9] p-2">
            <div className="mb-1 flex items-center justify-between text-sm">
              <span>{item.name}</span>
              <span>{formatter(item.revenue)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded bg-[#eee3d5]">
              <div className="h-full rounded bg-[#a98061]" style={{ width: `${widthPercent}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default async function StatisticsPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  const locale = await getUserLocale(session?.user.id);
  const t = createTranslator(locale);

  const monthParam = searchParams?.month;
  const stats = await getMonthlyStatistics(monthParam);
  const monthOptions = buildMonthOptions(locale, stats.selectedMonth);
  const staffTypeLabel: Record<string, string> = {
    INTERNAL: t("pages.staff.internal"),
    EXTERNAL: t("pages.staff.external")
  };

  return (
    <main className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-[var(--bc-text)]">{t("pages.statistics.title")}</h1>

        <form className="flex items-center gap-2" method="GET">
          <label className="text-sm text-[var(--bc-muted)]" htmlFor="month">
            {t("pages.statistics.month")}
          </label>
          <select defaultValue={stats.selectedMonth} id="month" name="month">
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button type="submit">{t("pages.statistics.apply")}</button>
        </form>
      </div>

      <Section title={t("pages.statistics.financial")}> 
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard title={t("pages.statistics.totalRevenue")} value={formatCurrency(stats.financial.totalRevenue)} />
          <StatCard title={t("pages.statistics.productsRevenue")} value={formatCurrency(stats.financial.revenueBreakdown.products)} />
          <StatCard title={t("pages.statistics.servicesRevenue")} value={formatCurrency(stats.financial.revenueBreakdown.services)} />
          <StatCard title={t("pages.statistics.packagesRevenue")} value={formatCurrency(stats.financial.revenueBreakdown.packages)} />
          <StatCard title={t("pages.statistics.salonRetainedRevenue")} value={formatCurrency(stats.financial.salonRetainedRevenue)} />
          <StatCard title={t("pages.statistics.externalPayoutObligations")} value={formatCurrency(stats.financial.externalPayoutObligations)} />
          <StatCard title={t("pages.statistics.totalExpenses")} value={formatCurrency(stats.financial.totalExpenses)} />
          <StatCard title={t("pages.statistics.internalSalaryCost")} value={formatCurrency(stats.financial.internalSalaryCost)} />
          <StatCard title={t("pages.statistics.internalCommissionCost")} value={formatCurrency(stats.financial.internalCommissionCost)} />
          <StatCard title={t("pages.statistics.netProfit")} value={formatCurrency(stats.financial.netProfit)} />
          <StatCard title={t("pages.statistics.realNetProfitToSalon")} value={formatCurrency(stats.financial.realNetProfitToSalon)} />
          <StatCard title={t("pages.statistics.grossMargin")} value={`${stats.financial.grossMarginPercent.toFixed(2)}%`} />
        </div>
      </Section>

      <Section title={t("pages.statistics.operations")}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title={t("pages.statistics.totalServicesPerformed")} value={String(stats.operations.totalServicesPerformed)} />
          <StatCard title={t("pages.statistics.totalProductsSold")} value={String(stats.operations.totalProductsSold)} />
          <StatCard title={t("pages.statistics.totalPackagesSold")} value={String(stats.operations.totalPackagesSold)} />
          <StatCard title={t("pages.statistics.newClients")} value={String(stats.operations.newClientsCount)} />
        </div>
      </Section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title={t("pages.statistics.topServices")}> 
          {stats.topPerformers.topServices.length === 0 ? (
            <p className="text-sm text-[var(--bc-muted)]">{t("pages.statistics.noData")}</p>
          ) : (
            <BarList items={stats.topPerformers.topServices} formatter={formatCurrency} />
          )}
        </Section>

        <Section title={t("pages.statistics.topProducts")}> 
          {stats.topPerformers.topProducts.length === 0 ? (
            <p className="text-sm text-[var(--bc-muted)]">{t("pages.statistics.noData")}</p>
          ) : (
            <BarList items={stats.topPerformers.topProducts} formatter={formatCurrency} />
          )}
        </Section>
      </div>

      <Section title={t("pages.statistics.revenuePerEmployee")}>
        {stats.topPerformers.revenuePerEmployee.length === 0 ? (
          <p className="text-sm text-[var(--bc-muted)]">{t("pages.statistics.noData")}</p>
        ) : (
          <BarList
            items={stats.topPerformers.revenuePerEmployee.map((item) => ({
              id: item.employeeId,
              name: item.employee,
              revenue: item.revenue
            }))}
            formatter={formatCurrency}
          />
        )}
      </Section>

      <Section title={t("pages.statistics.employeePerformance")}>
        {stats.topPerformers.employeePerformance.length === 0 ? (
          <p className="text-sm text-[var(--bc-muted)]">{t("pages.statistics.noData")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--bc-border)] text-[var(--bc-muted)]">
                  <th className="px-2 py-2 font-medium">{t("pages.statistics.employee")}</th>
                  <th className="px-2 py-2 font-medium">{t("pages.statistics.staffType")}</th>
                  <th className="px-2 py-2 font-medium">{t("pages.statistics.revenue")}</th>
                  <th className="px-2 py-2 font-medium">{t("pages.statistics.servicesPerformed")}</th>
                  <th className="px-2 py-2 font-medium">{t("pages.statistics.productsSold")}</th>
                  <th className="px-2 py-2 font-medium">{t("pages.statistics.packagesSold")}</th>
                  <th className="px-2 py-2 font-medium">{t("pages.statistics.commissionEarned")}</th>
                  <th className="px-2 py-2 font-medium">{t("pages.statistics.salaryCost")}</th>
                  <th className="px-2 py-2 font-medium">{t("pages.statistics.externalPayout")}</th>
                  <th className="px-2 py-2 font-medium">{t("pages.statistics.salonRevenue")}</th>
                  <th className="px-2 py-2 font-medium">{t("pages.statistics.netContribution")}</th>
                </tr>
              </thead>
              <tbody>
                {stats.topPerformers.employeePerformance.map((item) => (
                  <tr key={item.staffId} className="border-b border-[#efe3d4]">
                    <td className="px-2 py-2">{item.staff}</td>
                    <td className="px-2 py-2">{staffTypeLabel[item.type] ?? item.type}</td>
                    <td className="px-2 py-2">{formatCurrency(item.revenue)}</td>
                    <td className="px-2 py-2">{item.servicesPerformed}</td>
                    <td className="px-2 py-2">{item.productsSold}</td>
                    <td className="px-2 py-2">{item.packagesSold}</td>
                    <td className="px-2 py-2">{formatCurrency(item.commissionEarned)}</td>
                    <td className="px-2 py-2">{formatCurrency(item.estimatedSalaryCost)}</td>
                    <td className="px-2 py-2">{formatCurrency(item.externalPayout)}</td>
                    <td className="px-2 py-2">{formatCurrency(item.salonRevenue)}</td>
                    <td className="px-2 py-2">{formatCurrency(item.netContribution)}</td>
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
