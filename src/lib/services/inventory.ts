import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";

export async function getInventoryOverview() {
  const [products, suppliers, movements] = await Promise.all([
    prisma.product.findMany({
      include: {
        inventory: true
      },
      orderBy: [{ name: "asc" }]
    }),
    prisma.supplier.findMany({
      orderBy: [{ name: "asc" }]
    }),
    prisma.stockMovement.findMany({
      include: {
        product: {
          select: {
            name: true,
            inventory: {
              select: {
                currentStock: true
              }
            }
          }
        },
        supplier: { select: { name: true } }
      },
      orderBy: [{ createdAt: "desc" }],
      take: 25
    })
  ]);

  const totalInventoryValue = products.reduce((sum, product) => {
    const currentStock = product.inventory?.currentStock ?? 0;
    return sum + currentStock * toNumber(product.averagePurchasePrice);
  }, 0);

  const lowStockProducts = products.filter((product) => {
    if (!product.inventory) return false;
    return product.inventory.currentStock <= product.inventory.minimumStockLevel;
  });

  return {
    products,
    suppliers,
    movements,
    totalInventoryValue,
    lowStockProducts
  };
}
