import { AppointmentStatus, ClientPackageStatus, SaleItemType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";

function monthBounds(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export async function getDashboardMetrics() {
  const { start, end } = monthBounds();

  const [products, sales, expenses, activePackages, serviceAgg, productAgg, employeeAgg] = await Promise.all([
    prisma.product.findMany({
      select: {
        id: true,
        name: true,
        currentStock: true,
        minimumStockLevel: true,
        averagePurchasePrice: true
      }
    }),
    prisma.sale.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: { items: true, employee: { select: { id: true, email: true, name: true } } }
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
      by: ["employeeId"],
      where: { createdAt: { gte: start, lte: end } },
      _sum: { totalAmount: true },
      _count: { _all: true }
    })
  ]);

  const serviceIds = serviceAgg.map((item) => item.referenceId);
  const productIds = productAgg.map((item) => item.referenceId);
  const employeeIds = employeeAgg.map((item) => item.employeeId);

  const [services, productsForTop, employees, completedAppointments] = await Promise.all([
    prisma.service.findMany({ where: { id: { in: serviceIds } }, select: { id: true, name: true } }),
    prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } }),
    prisma.user.findMany({ where: { id: { in: employeeIds } }, select: { id: true, email: true, name: true } }),
    prisma.appointment.findMany({
      where: {
        status: AppointmentStatus.COMPLETED,
        startTime: { gte: start, lte: end }
      },
      select: { serviceId: true, employeeId: true }
    })
  ]);

  const serviceMap = new Map(services.map((s) => [s.id, s.name]));
  const productMap = new Map(productsForTop.map((p) => [p.id, p.name]));
  const employeeMap = new Map(employees.map((e) => [e.id, e.name ?? e.email]));

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

  const totalInventoryValue = products.reduce(
    (sum, product) => sum + product.currentStock * toNumber(product.averagePurchasePrice),
    0
  );
  const lowStockProducts = products.filter((p) => p.currentStock <= p.minimumStockLevel);

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

  const serviceCountByEmployee = new Map<string, number>();
  for (const appointment of completedAppointments) {
    serviceCountByEmployee.set(
      appointment.employeeId,
      (serviceCountByEmployee.get(appointment.employeeId) ?? 0) + 1
    );
  }

  const employeeStats = employeeAgg.map((item) => ({
    employeeId: item.employeeId,
    employee: employeeMap.get(item.employeeId) ?? "Unknown",
    revenue: toNumber(item._sum.totalAmount),
    salesCount: item._count._all,
    servicesPerformed: serviceCountByEmployee.get(item.employeeId) ?? 0
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
