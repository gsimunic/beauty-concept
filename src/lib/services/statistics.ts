import { SaleItemType, StaffType, StockMovementType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";

function parseMonthInput(month?: string) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    const now = new Date();
    return {
      year: now.getFullYear(),
      monthIndex: now.getMonth()
    };
  }

  const [yearRaw, monthRaw] = month.split("-");
  const year = Number(yearRaw);
  const monthNumber = Number(monthRaw);

  if (!Number.isInteger(year) || !Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) {
    const now = new Date();
    return {
      year: now.getFullYear(),
      monthIndex: now.getMonth()
    };
  }

  return { year, monthIndex: monthNumber - 1 };
}

function monthBounds(month?: string) {
  const { year, monthIndex } = parseMonthInput(month);
  const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const end = new Date(year, monthIndex + 1, 1, 0, 0, 0, 0);

  return {
    start,
    end,
    monthValue: `${year}-${String(monthIndex + 1).padStart(2, "0")}`
  };
}

type StaffAccumulator = {
  staffId: string;
  staff: string;
  type: StaffType;
  revenue: number;
  servicesPerformed: number;
  productsSold: number;
  packagesSold: number;
  baseSalary: number;
  externalPayout: number;
  salonRevenue: number;
};

export async function getMonthlyStatistics(month?: string) {
  const { start, end, monthValue } = monthBounds(month);

  const [
    revenueAgg,
    expensesAgg,
    saleSums,
    breakdownRows,
    packageUsageRows,
    productsSoldAgg,
    packagesSoldAgg,
    newClientsCount,
    topServicesRows,
    topProductsRows,
    sales,
    staffList
  ] = await Promise.all([
    prisma.sale.aggregate({
      where: { createdAt: { gte: start, lt: end } },
      _sum: { totalAmount: true }
    }),
    prisma.expense.aggregate({
      where: { date: { gte: start, lt: end } },
      _sum: { amount: true }
    }),
    prisma.sale.aggregate({
      where: { createdAt: { gte: start, lt: end } },
      _sum: { externalAmount: true, salonAmount: true }
    }),
    prisma.saleItem.groupBy({
      by: ["type"],
      where: { sale: { createdAt: { gte: start, lt: end } } },
      _sum: { total: true }
    }),
    prisma.clientPackageUsage.groupBy({
      by: ["staffId"],
      where: { datePerformed: { gte: start, lt: end } },
      _count: { _all: true }
    }),
    prisma.stockMovement.aggregate({
      where: { type: StockMovementType.SALE, createdAt: { gte: start, lt: end } },
      _sum: { quantity: true }
    }),
    prisma.saleItem.aggregate({
      where: { type: SaleItemType.PACKAGE, sale: { createdAt: { gte: start, lt: end } } },
      _sum: { quantity: true }
    }),
    prisma.client.count({
      where: { createdAt: { gte: start, lt: end } }
    }),
    prisma.saleItem.groupBy({
      by: ["referenceId"],
      where: { type: SaleItemType.SERVICE, sale: { createdAt: { gte: start, lt: end } } },
      _sum: { total: true },
      orderBy: { _sum: { total: "desc" } },
      take: 5
    }),
    prisma.saleItem.groupBy({
      by: ["referenceId"],
      where: { type: SaleItemType.PRODUCT, sale: { createdAt: { gte: start, lt: end } } },
      _sum: { total: true },
      orderBy: { _sum: { total: "desc" } },
      take: 5
    }),
    prisma.sale.findMany({
      where: { createdAt: { gte: start, lt: end } },
      select: {
        staffId: true,
        totalAmount: true,
        externalAmount: true,
        salonAmount: true,
        items: { select: { type: true, quantity: true } }
      }
    }),
    prisma.staff.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        type: true,
        baseSalary: true
      }
    })
  ]);

  const totalRevenue = toNumber(revenueAgg._sum.totalAmount);
  const totalExpenses = toNumber(expensesAgg._sum.amount);
  const externalPayoutObligations = toNumber(saleSums._sum.externalAmount);
  const salonRetainedRevenue = toNumber(saleSums._sum.salonAmount);

  const revenueBreakdown = {
    products: 0,
    services: 0,
    packages: 0
  };

  for (const row of breakdownRows) {
    const value = toNumber(row._sum.total);
    if (row.type === SaleItemType.PRODUCT) revenueBreakdown.products = value;
    if (row.type === SaleItemType.SERVICE) revenueBreakdown.services = value;
    if (row.type === SaleItemType.PACKAGE) revenueBreakdown.packages = value;
  }

  const totalProductsSold = Math.abs(productsSoldAgg._sum.quantity ?? 0);
  const totalPackagesSold = packagesSoldAgg._sum.quantity ?? 0;
  const totalServiceSales = sales.reduce((sum, sale) => {
    return (
      sum +
      sale.items
        .filter((item) => item.type === SaleItemType.SERVICE)
        .reduce((itemSum, item) => itemSum + item.quantity, 0)
    );
  }, 0);
  const totalPackageUsages = packageUsageRows.reduce((sum, row) => sum + row._count._all, 0);

  const serviceIds = topServicesRows.map((row) => row.referenceId);
  const productIds = topProductsRows.map((row) => row.referenceId);

  const [services, products] = await Promise.all([
    prisma.service.findMany({ where: { id: { in: serviceIds } }, select: { id: true, name: true } }),
    prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } })
  ]);

  const serviceMap = new Map(services.map((item) => [item.id, item.name]));
  const productMap = new Map(products.map((item) => [item.id, item.name]));
  const usageMap = new Map(packageUsageRows.map((row) => [row.staffId, row._count._all]));

  const topServices = topServicesRows.map((row) => ({
    id: row.referenceId,
    name: serviceMap.get(row.referenceId) ?? "Unknown service",
    revenue: toNumber(row._sum.total)
  }));

  const topProducts = topProductsRows.map((row) => ({
    id: row.referenceId,
    name: productMap.get(row.referenceId) ?? "Unknown product",
    revenue: toNumber(row._sum.total)
  }));

  const staffAccumulator = new Map<string, StaffAccumulator>();

  for (const staff of staffList) {
    staffAccumulator.set(staff.id, {
      staffId: staff.id,
      staff: staff.name,
      type: staff.type,
      revenue: 0,
      servicesPerformed: usageMap.get(staff.id) ?? 0,
      productsSold: 0,
      packagesSold: 0,
      baseSalary: toNumber(staff.baseSalary),
      externalPayout: 0,
      salonRevenue: 0
    });
  }

  for (const sale of sales) {
    const existing = staffAccumulator.get(sale.staffId);
    const staffStats =
      existing ??
      ({
        staffId: sale.staffId,
        staff: "Unknown",
        type: "INTERNAL",
        revenue: 0,
        servicesPerformed: usageMap.get(sale.staffId) ?? 0,
        productsSold: 0,
        packagesSold: 0,
        baseSalary: 0,
        externalPayout: 0,
        salonRevenue: 0
      } satisfies StaffAccumulator);

    staffStats.revenue += toNumber(sale.totalAmount);
    staffStats.externalPayout += toNumber(sale.externalAmount);
    staffStats.salonRevenue += toNumber(sale.salonAmount);

    for (const item of sale.items) {
      if (item.type === SaleItemType.SERVICE) staffStats.servicesPerformed += item.quantity;
      if (item.type === SaleItemType.PRODUCT) staffStats.productsSold += item.quantity;
      if (item.type === SaleItemType.PACKAGE) staffStats.packagesSold += item.quantity;
    }

    staffAccumulator.set(sale.staffId, staffStats);
  }

  const staffPerformance = Array.from(staffAccumulator.values())
    .map((row) => {
      if (row.type === "EXTERNAL") {
        return {
          staffId: row.staffId,
          staff: row.staff,
          type: row.type,
          revenue: row.revenue,
          servicesPerformed: row.servicesPerformed,
          productsSold: row.productsSold,
          packagesSold: row.packagesSold,
          estimatedSalaryCost: 0,
          externalPayout: row.externalPayout,
          salonRevenue: row.salonRevenue,
          netContribution: row.salonRevenue
        };
      }

      const estimatedSalaryCost = row.baseSalary;
      const netContribution = row.revenue - estimatedSalaryCost;

      return {
        staffId: row.staffId,
        staff: row.staff,
        type: row.type,
        revenue: row.revenue,
        servicesPerformed: row.servicesPerformed,
        productsSold: row.productsSold,
        packagesSold: row.packagesSold,
        estimatedSalaryCost,
        externalPayout: 0,
        salonRevenue: row.revenue,
        netContribution
      };
    })
    .filter((row) => row.revenue > 0 || row.servicesPerformed > 0 || row.productsSold > 0 || row.packagesSold > 0)
    .sort((a, b) => b.revenue - a.revenue);

  const internalSalaryCost = staffPerformance
    .filter((row) => row.type === "INTERNAL")
    .reduce((sum, row) => sum + row.estimatedSalaryCost, 0);

  const realNetProfitToSalon = salonRetainedRevenue - totalExpenses - internalSalaryCost;
  const netProfit = totalRevenue - totalExpenses;
  const grossMarginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  return {
    selectedMonth: monthValue,
    financial: {
      totalRevenue,
      revenueBreakdown,
      totalExpenses,
      netProfit,
      grossMarginPercent,
      externalPayoutObligations,
      salonRetainedRevenue,
      internalSalaryCost,
      realNetProfitToSalon
    },
    operations: {
      totalServicesPerformed: totalServiceSales + totalPackageUsages,
      totalProductsSold,
      totalPackagesSold,
      newClientsCount
    },
    topPerformers: {
      topServices,
      topProducts,
      revenuePerEmployee: staffPerformance.map((item) => ({
        employeeId: item.staffId,
        employee: item.staff,
        revenue: item.revenue
      })),
      employeePerformance: staffPerformance
    }
  };
}
