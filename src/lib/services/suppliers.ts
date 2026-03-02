import { prisma } from "@/lib/prisma";

export async function getSuppliersOverview() {
  const [suppliers, movementCountBySupplier] = await Promise.all([
    prisma.supplier.findMany({
      orderBy: [{ name: "asc" }]
    }),
    prisma.stockMovement.groupBy({
      by: ["supplierId"],
      where: {
        supplierId: {
          not: null
        }
      },
      _count: {
        _all: true
      }
    })
  ]);

  const usageMap = new Map<string, number>();
  for (const row of movementCountBySupplier) {
    if (row.supplierId) {
      usageMap.set(row.supplierId, row._count._all);
    }
  }

  return suppliers.map((supplier) => ({
    ...supplier,
    movementCount: usageMap.get(supplier.id) ?? 0
  }));
}
