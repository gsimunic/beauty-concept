import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";

export async function getInventoryOverview() {
  const [products, suppliers, movements] = await Promise.all([
    prisma.product.findMany({
      orderBy: [{ name: "asc" }]
    }),
    prisma.supplier.findMany({
      orderBy: [{ name: "asc" }]
    }),
    prisma.stockMovement.findMany({
      include: {
        product: { select: { name: true } },
        supplier: { select: { name: true } }
      },
      orderBy: [{ createdAt: "desc" }],
      take: 25
    })
  ]);

  const totalInventoryValue = products.reduce(
    (sum, product) => sum + product.currentStock * toNumber(product.averagePurchasePrice),
    0
  );

  const lowStockProducts = products.filter((product) => product.currentStock <= product.minimumStockLevel);

  return {
    products,
    suppliers,
    movements,
    totalInventoryValue,
    lowStockProducts
  };
}
