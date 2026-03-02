import { prisma } from "@/lib/prisma";

export async function listClients() {
  return prisma.client.findMany({
    orderBy: [{ createdAt: "desc" }]
  });
}
