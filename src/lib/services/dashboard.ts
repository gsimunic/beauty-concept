import { ClientPackageStatus, SaleItemType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";

function monthBounds(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export async function getDashboardMetrics() {
  const { start, end } = monthBounds();

  const [products, sales, expenses, activePackages, serviceAgg, productAgg, staffAgg] = await Promise.all([
    prisma.product.findMany({
      select: {
        id: true,
        name: true,
        averagePurchasePrice: true,
        inventory: {
          select: {
            currentStock: true,
            minimumStockLevel: true
          }
        }
      }
    }),
    prisma.sale.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: { items: true, staff: { select: { id: true, name: true, type: true } } }
    }),
    prisma.expense.findMany({
      where: { date: { gte: start, lte: end } },
      select: { amount: true }
    }),
    prisma.clientPackage.count({
      where: { status: ClientPackageStatus.ACTIVE }
    }),
    prisma.saleItem.groupBy({
      by: ["referenceId"],
      where: {
        type: SaleItemType.SERVICE,
        sale: { createdAt: { gte: start, lte: end } }
      },
      _sum: { total: true },
      _count: { _all: true },
      orderBy: { _sum: { total: "desc" } },
      take: 5
    }),
    prisma.saleItem.groupBy({
      by: ["referenceId"],
      where: {
        type: SaleItemType.PRODUCT,
        sale: { createdAt: { gte: start, lte: end } }
      },
      _sum: { total: true },
      _count: { _all: true },
      orderBy: { _sum: { total: "desc" } },
      take: 5
    }),
    prisma.sale.groupBy({
      by: ["staffId"],
      where: { createdAt: { gte: start, lte: end } },
      _sum: { totalAmount: true },
      _count: { _all: true }
    })
  ]);

  const serviceIds = serviceAgg.map((item) => item.referenceId);
  const productIds = productAgg.map((item) => item.referenceId);
  const staffIds = staffAgg.map((item) => item.staffId);

  const [services, productsForTop, staff] = await Promise.all([
    prisma.service.findMany({ where: { id: { in: serviceIds } }, select: { id: true, name: true } }),
    prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } }),
    prisma.staff.findMany({ where: { id: { in: staffIds } }, select: { id: true, name: true } })
  ]);

  const serviceMap = new Map(services.map((s) => [s.id, s.name]));
  const productMap = new Map(productsForTop.map((p) => [p.id, p.name]));
  const staffMap = new Map(staff.map((item) => [item.id, item.name]));

  const revenueBreakdown = { products: 0, services: 0, packages: 0 };
  for (const sale of sales) {
    for (const item of sale.items) {
      const amount = toNumber(item.total);
      if (item.type === SaleItemType.PRODUCT) revenueBreakdown.products += amount;
      if (item.type === SaleItemType.SERVICE) revenueBreakdown.services += amount;
      if (item.type === SaleItemType.PACKAGE) revenueBreakdown.packages += amount;
    }
  }

  const monthlyRevenue = sales.reduce((sum, sale) => sum + toNumber(sale.totalAmount), 0);
  const monthlyExpenses = expenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0);
  const netProfit = monthlyRevenue - monthlyExpenses;

  const totalInventoryValue = products.reduce((sum, product) => {
    const stock = product.inventory?.currentStock ?? 0;
    return sum + stock * toNumber(product.averagePurchasePrice);
  }, 0);

  const lowStockProducts = products
    .filter((p) => p.inventory && p.inventory.currentStock <= p.inventory.minimumStockLevel)
    .map((p) => ({
      id: p.id,
      name: p.name,
      currentStock: p.inventory?.currentStock ?? 0,
      minimumStockLevel: p.inventory?.minimumStockLevel ?? 0
    }));

  const topServices = serviceAgg.map((item) => ({
    name: serviceMap.get(item.referenceId) ?? "Unknown service",
    revenue: toNumber(item._sum.total),
    count: item._count._all
  }));

  const topProducts = productAgg.map((item) => ({
    name: productMap.get(item.referenceId) ?? "Unknown product",
    revenue: toNumber(item._sum.total),
    count: item._count._all
  }));

  const serviceCountByStaff = new Map<string, number>();
  for (const sale of sales) {
    const count = sale.items
      .filter((item) => item.type === SaleItemType.SERVICE)
      .reduce((sum, item) => sum + item.quantity, 0);
    serviceCountByStaff.set(sale.staffId, (serviceCountByStaff.get(sale.staffId) ?? 0) + count);
  }

  const employeeStats = staffAgg.map((item) => ({
    employeeId: item.staffId,
    employee: staffMap.get(item.staffId) ?? "Unknown",
    revenue: toNumber(item._sum.totalAmount),
    salesCount: item._count._all,
    servicesPerformed: serviceCountByStaff.get(item.staffId) ?? 0
  }));

  return {
    totalInventoryValue,
    lowStockProducts,
    activeClientPackages: activePackages,
    monthlyRevenue,
    monthlyExpenses,
    netProfit,
    revenueBreakdown,
    topServices,
    topProducts,
    employeeStats
  };
}
