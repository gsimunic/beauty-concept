"use server";

import { AppointmentStatus, StockMovementType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";

const appointmentSchema = z.object({
  clientId: z.string().min(1),
  serviceId: z.string().min(1),
  employeeId: z.string().min(1),
  startTime: z.coerce.date(),
  notes: z.string().trim().optional().or(z.literal(""))
});

const updateStatusSchema = z.object({
  id: z.string().min(1),
  status: z.nativeEnum(AppointmentStatus)
});

async function requireAuthenticated() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
}

export async function createAppointmentAction(formData: FormData) {
  await requireAuthenticated();

  const parsed = appointmentSchema.safeParse({
    clientId: formData.get("clientId"),
    serviceId: formData.get("serviceId"),
    employeeId: formData.get("employeeId"),
    startTime: formData.get("startTime"),
    notes: formData.get("notes")
  });

  if (!parsed.success) throw new Error("Invalid appointment input");

  const service = await prisma.service.findUnique({ where: { id: parsed.data.serviceId } });
  if (!service) throw new Error("Service not found");

  const duration = service.durationMinutes ?? 60;
  const endTime = new Date(parsed.data.startTime.getTime() + duration * 60000);

  await prisma.appointment.create({
    data: {
      clientId: parsed.data.clientId,
      serviceId: parsed.data.serviceId,
      employeeId: parsed.data.employeeId,
      startTime: parsed.data.startTime,
      endTime,
      notes: parsed.data.notes || null
    }
  });

  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard");
}

export async function updateAppointmentStatusAction(formData: FormData) {
  await requireAuthenticated();
  const parsed = updateStatusSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status")
  });
  if (!parsed.success) throw new Error("Invalid status input");

  await prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.findUnique({
      where: { id: parsed.data.id },
      include: {
        service: {
          include: {
            consumptions: true
          }
        }
      }
    });

    if (!appointment) throw new Error("Appointment not found");

    const isCompleting =
      appointment.status !== AppointmentStatus.COMPLETED &&
      parsed.data.status === AppointmentStatus.COMPLETED;

    if (isCompleting) {
      for (const mapping of appointment.service.consumptions) {
        const requiredQty = Math.ceil(toNumber(mapping.quantityUsed));
        if (requiredQty <= 0) continue;

        const product = await tx.product.findUnique({ where: { id: mapping.productId } });
        if (!product) throw new Error("Mapped product not found");
        if (product.currentStock < requiredQty) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }

        await tx.product.update({
          where: { id: product.id },
          data: { currentStock: { decrement: requiredQty } }
        });

        await tx.stockMovement.create({
          data: {
            productId: product.id,
            quantity: -requiredQty,
            type: StockMovementType.CONSUMPTION
          }
        });
      }
    }

    await tx.appointment.update({
      where: { id: parsed.data.id },
      data: { status: parsed.data.status }
    });
  });

  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/inventory");
}
