import { SaleItemType, StockMovementType } from "@prisma/client";

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

export async function getMonthlyStatistics(month?: string) {
  const { start, end, monthValue } = monthBounds(month);

  const [
    revenueAgg,
    expensesAgg,
    breakdownRows,
    servicesPerformed,
    productsSoldAgg,
    packagesSoldAgg,
    newClientsCount,
    topServicesRows,
    topProductsRows,
    employeeRevenueRows
  ] = await Promise.all([
    prisma.sale.aggregate({
      where: { createdAt: { gte: start, lt: end } },
      _sum: { totalAmount: true }
    }),
    prisma.expense.aggregate({
      where: { date: { gte: start, lt: end } },
      _sum: { amount: true }
    }),
    prisma.saleItem.groupBy({
      by: ["type"],
      where: { sale: { createdAt: { gte: start, lt: end } } },
      _sum: { total: true }
    }),
    prisma.clientPackageUsage.count({
      where: { datePerformed: { gte: start, lt: end } }
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
    prisma.sale.groupBy({
      by: ["employeeId"],
      where: { createdAt: { gte: start, lt: end } },
      _sum: { totalAmount: true },
      orderBy: { _sum: { totalAmount: "desc" } }
    })
  ]);

  const totalRevenue = toNumber(revenueAgg._sum.totalAmount);
  const totalExpenses = toNumber(expensesAgg._sum.amount);
  const netProfit = totalRevenue - totalExpenses;
  const grossMarginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

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

  const serviceIds = topServicesRows.map((row) => row.referenceId);
  const productIds = topProductsRows.map((row) => row.referenceId);
  const employeeIds = employeeRevenueRows.map((row) => row.employeeId);

  const [services, products, employees] = await Promise.all([
    prisma.service.findMany({ where: { id: { in: serviceIds } }, select: { id: true, name: true } }),
    prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } }),
    prisma.user.findMany({ where: { id: { in: employeeIds } }, select: { id: true, name: true, email: true } })
  ]);

  const serviceMap = new Map(services.map((item) => [item.id, item.name]));
  const productMap = new Map(products.map((item) => [item.id, item.name]));
  const employeeMap = new Map(employees.map((item) => [item.id, item.name ?? item.email]));

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

  const revenuePerEmployee = employeeRevenueRows.map((row) => ({
    employeeId: row.employeeId,
    employee: employeeMap.get(row.employeeId) ?? "Unknown",
    revenue: toNumber(row._sum.totalAmount)
  }));

  return {
    selectedMonth: monthValue,
    financial: {
      totalRevenue,
      revenueBreakdown,
      totalExpenses,
      netProfit,
      grossMarginPercent
    },
    operations: {
      totalServicesPerformed: servicesPerformed,
      totalProductsSold,
      totalPackagesSold,
      newClientsCount
    },
    topPerformers: {
      topServices,
      topProducts,
      revenuePerEmployee
    }
  };
}
