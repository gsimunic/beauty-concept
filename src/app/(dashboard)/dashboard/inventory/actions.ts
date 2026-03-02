"use server";

import { StockMovementType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { toNumber } from "@/lib/utils";

const createProductSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  sku: z.string().trim().optional().or(z.literal("")),
  sellingPrice: z.coerce.number().nonnegative(),
  averagePurchasePrice: z.coerce.number().nonnegative().default(0)
});

const updateInventorySettingsSchema = z.object({
  productId: z.string().min(1),
  minimumStockLevel: z.coerce.number().int().nonnegative()
});

const createMovementSchema = z.object({
  productId: z.string().min(1),
  supplierId: z.string().optional().or(z.literal("")),
  quantity: z.coerce.number().int(),
  purchasePrice: z.coerce.number().nonnegative().optional(),
  type: z.nativeEnum(StockMovementType)
});

async function requireAuthenticated() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session;
}

function toNullableString(value?: string) {
  return value && value.length > 0 ? value : null;
}

function validateMovementSign(type: StockMovementType, quantity: number) {
  if (quantity === 0) {
    throw new Error("Quantity cannot be zero");
  }

  if (type === StockMovementType.PURCHASE && quantity <= 0) {
    throw new Error("Purchase quantity must be positive");
  }

  if ((type === StockMovementType.SALE || type === StockMovementType.CONSUMPTION) && quantity >= 0) {
    throw new Error("Sale/Consumption quantity must be negative");
  }
}

export async function createProductAction(formData: FormData) {
  await requireAuthenticated();

  const parsed = createProductSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku"),
    sellingPrice: formData.get("sellingPrice"),
    averagePurchasePrice: formData.get("averagePurchasePrice")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid product input");
  }

  await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        name: parsed.data.name,
        sku: toNullableString(parsed.data.sku),
        sellingPrice: parsed.data.sellingPrice,
        averagePurchasePrice: parsed.data.averagePurchasePrice
      }
    });

    await tx.inventory.create({
      data: {
        productId: product.id,
        currentStock: 0,
        minimumStockLevel: 0
      }
    });
  });

  revalidatePath("/dashboard/inventory");
  revalidatePath("/dashboard");
}

export async function updateInventorySettingsAction(formData: FormData) {
  await requireAuthenticated();

  const parsed = updateInventorySettingsSchema.safeParse({
    productId: formData.get("productId"),
    minimumStockLevel: formData.get("minimumStockLevel")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid inventory settings input");
  }

  await prisma.inventory.update({
    where: { productId: parsed.data.productId },
    data: { minimumStockLevel: parsed.data.minimumStockLevel }
  });

  revalidatePath("/dashboard/inventory");
  revalidatePath("/dashboard");
}

export async function createStockMovementAction(formData: FormData) {
  await requireAuthenticated();

  const parsed = createMovementSchema.safeParse({
    productId: formData.get("productId"),
    supplierId: formData.get("supplierId"),
    quantity: formData.get("quantity"),
    purchasePrice: formData.get("purchasePrice") || undefined,
    type: formData.get("type")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid stock movement input");
  }

  validateMovementSign(parsed.data.type, parsed.data.quantity);

  await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: parsed.data.productId },
      include: {
        inventory: true
      }
    });

    if (!product || !product.inventory) {
      throw new Error("Product inventory not found");
    }

    const nextStock = product.inventory.currentStock + parsed.data.quantity;
    if (nextStock < 0) {
      throw new Error("Stock cannot go below zero");
    }

    let nextAveragePurchasePrice = toNumber(product.averagePurchasePrice);

    if (parsed.data.type === StockMovementType.PURCHASE) {
      if (parsed.data.purchasePrice === undefined) {
        throw new Error("Purchase price is required for PURCHASE movements");
      }

      const currentValue = toNumber(product.averagePurchasePrice) * product.inventory.currentStock;
      const incomingValue = parsed.data.purchasePrice * parsed.data.quantity;
      const denominator = product.inventory.currentStock + parsed.data.quantity;

      if (denominator > 0) {
        nextAveragePurchasePrice = (currentValue + incomingValue) / denominator;
      }
    }

    await tx.inventory.update({
      where: { productId: product.id },
      data: {
        currentStock: nextStock
      }
    });

    if (parsed.data.type === StockMovementType.PURCHASE) {
      await tx.product.update({
        where: { id: product.id },
        data: {
          averagePurchasePrice: nextAveragePurchasePrice
        }
      });
    }

    await tx.stockMovement.create({
      data: {
        productId: parsed.data.productId,
        supplierId: toNullableString(parsed.data.supplierId),
        quantity: parsed.data.quantity,
        purchasePrice:
          parsed.data.type === StockMovementType.PURCHASE ? parsed.data.purchasePrice : null,
        type: parsed.data.type
      }
    });
  });

  revalidatePath("/dashboard/inventory");
  revalidatePath("/dashboard");
}

export async function deleteProductAction(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Invalid product id");

  const [movementCount, consumptionCount] = await Promise.all([
    prisma.stockMovement.count({ where: { productId: id } }),
    prisma.serviceConsumption.count({ where: { productId: id } })
  ]);

  if (movementCount > 0 || consumptionCount > 0) {
    throw new Error("Cannot delete product with stock history or service mappings.");
  }

  await prisma.product.delete({ where: { id } });

  revalidatePath("/dashboard/inventory");
  revalidatePath("/dashboard");
}
