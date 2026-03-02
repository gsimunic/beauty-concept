"use server";

import { ClientPackageStatus, SaleItemType, StockMovementType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";

const saleSchema = z.object({
  paymentMethod: z.enum(["CASH", "CARD", "TRANSFER"]),
  type: z.nativeEnum(SaleItemType),
  referenceId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().nonnegative().optional(),
  clientId: z.string().optional().or(z.literal("")),
  customPrice: z.coerce.number().nonnegative().optional(),
  expirationDate: z.coerce.date().optional()
});

export async function createSaleAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = saleSchema.safeParse({
    paymentMethod: formData.get("paymentMethod"),
    type: formData.get("type"),
    referenceId: formData.get("referenceId"),
    quantity: formData.get("quantity"),
    unitPrice: formData.get("unitPrice") || undefined,
    clientId: formData.get("clientId"),
    customPrice: formData.get("customPrice") || undefined,
    expirationDate: formData.get("expirationDate") || undefined
  });

  if (!parsed.success) throw new Error("Invalid sale payload");

  await prisma.$transaction(async (tx) => {
    let resolvedUnitPrice = parsed.data.unitPrice ?? 0;
    const referenceId = parsed.data.referenceId;
    const quantity = parsed.data.quantity;

    if (parsed.data.type === SaleItemType.PRODUCT) {
      const product = await tx.product.findUnique({ where: { id: referenceId } });
      if (!product) throw new Error("Product not found");

      if (product.currentStock < quantity) {
        throw new Error("Insufficient stock");
      }

      resolvedUnitPrice = parsed.data.unitPrice ?? toNumber(product.sellingPrice);
      await tx.product.update({
        where: { id: product.id },
        data: { currentStock: { decrement: quantity } }
      });

      await tx.stockMovement.create({
        data: {
          productId: product.id,
          quantity: -quantity,
          type: StockMovementType.SALE
        }
      });
    }

    if (parsed.data.type === SaleItemType.SERVICE) {
      const service = await tx.service.findUnique({ where: { id: referenceId } });
      if (!service) throw new Error("Service not found");
      resolvedUnitPrice = parsed.data.unitPrice ?? toNumber(service.basePrice);
    }

    if (parsed.data.type === SaleItemType.PACKAGE) {
      const template = await tx.packageTemplate.findUnique({
        where: { id: referenceId },
        include: { items: true }
      });
      if (!template) throw new Error("Package template not found");
      if (!parsed.data.clientId) throw new Error("Client is required for package sale");

      const totalSessions = template.items.reduce((sum, item) => sum + item.quantity, 0);
      if (totalSessions <= 0) throw new Error("Package has no sessions");

      resolvedUnitPrice = parsed.data.customPrice ?? parsed.data.unitPrice ?? toNumber(template.totalPrice);

      await tx.clientPackage.create({
        data: {
          clientId: parsed.data.clientId,
          packageTemplateId: template.id,
          customPrice: parsed.data.customPrice,
          purchaseDate: new Date(),
          totalSessions,
          remainingSessions: totalSessions,
          expirationDate: parsed.data.expirationDate,
          status: ClientPackageStatus.ACTIVE
        }
      });
    }

    const totalAmount = resolvedUnitPrice * quantity;

    const sale = await tx.sale.create({
      data: {
        totalAmount,
        paymentMethod: parsed.data.paymentMethod,
        employeeId: session.user.id
      }
    });

    await tx.saleItem.create({
      data: {
        saleId: sale.id,
        type: parsed.data.type,
        referenceId,
        quantity,
        unitPrice: resolvedUnitPrice,
        total: totalAmount
      }
    });
  });

  revalidatePath("/dashboard/sales");
  revalidatePath("/dashboard/inventory");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/clients");
}
