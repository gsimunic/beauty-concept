import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@beautyconcept.local";
  const employeeEmail = process.env.EMPLOYEE_EMAIL ?? "employee@beautyconcept.local";

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: Role.ADMIN, name: "Admin User" },
    create: { email: adminEmail, name: "Admin User", role: Role.ADMIN }
  });

  await prisma.user.upsert({
    where: { email: employeeEmail },
    update: { role: Role.EMPLOYEE, name: "Salon Employee" },
    create: { email: employeeEmail, name: "Salon Employee", role: Role.EMPLOYEE }
  });

  const services = [
    { name: "Luxury Facial", basePrice: 90, durationMinutes: 60, active: true },
    { name: "Body Massage", basePrice: 110, durationMinutes: 75, active: true },
    { name: "Brow Styling", basePrice: 35, durationMinutes: 30, active: true }
  ];

  for (const service of services) {
    const existing = await prisma.service.findFirst({ where: { name: service.name } });
    if (!existing) {
      await prisma.service.create({ data: service });
    }
  }

  const suppliers = [
    { name: "Dermalab Supply", contactName: "Anna Petrovic", phone: "+3851111111" },
    { name: "Salon Pro Depot", contactName: "Marko Horvat", phone: "+3852222222" }
  ];

  for (const supplier of suppliers) {
    const existing = await prisma.supplier.findFirst({ where: { name: supplier.name } });
    if (!existing) {
      await prisma.supplier.create({ data: supplier });
    }
  }

  const products = [
    {
      name: "Hydrating Serum",
      sku: "HS-001",
      sellingPrice: 42,
      averagePurchasePrice: 18,
      currentStock: 20,
      minimumStockLevel: 5
    },
    {
      name: "Peptide Cream",
      sku: "PC-002",
      sellingPrice: 55,
      averagePurchasePrice: 24,
      currentStock: 12,
      minimumStockLevel: 4
    }
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: product,
      create: product
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
