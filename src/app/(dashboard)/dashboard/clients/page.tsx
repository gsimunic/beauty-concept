import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { createTranslator, getUserLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

import {
  assignClientPackageAction,
  createClientAction,
  deleteClientAction,
  updateClientAction,
  useClientPackageAction
} from "./actions";

export default async function DashboardClientsPage() {
  const [session, clients, templates, services, staffList, clientPackages] = await Promise.all([
    getServerSession(authOptions),
    prisma.client.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.packageTemplate.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.service.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.staff.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.clientPackage.findMany({
      include: {
        client: { select: { name: true } },
        packageTemplate: { select: { name: true } },
        usages: { orderBy: { datePerformed: "desc" }, take: 5, include: { service: true } }
      },
      orderBy: { purchaseDate: "desc" }
    })
  ]);
  const isAdmin = session?.user.role === "ADMIN";
  const locale = await getUserLocale(session?.user.id);
  const t = createTranslator(locale);
  const staffTypeLabel: Record<string, string> = {
    INTERNAL: t("pages.staff.internal"),
    EXTERNAL: t("pages.staff.external")
  };

  return (
    <main className="grid gap-6">
      <h1 className="text-2xl font-semibold text-[var(--bc-text)]">{t("pages.clients.title")}</h1>

      <section className="rounded-xl border border-[var(--bc-border)] bg-[var(--bc-surface)] p-5 shadow-sm shadow-[#d5c8b5]/30">
        <h2 className="mb-4 text-lg font-semibold text-[var(--bc-text)]">{t("pages.clients.addClient")}</h2>
        <form action={createClientAction} className="grid gap-3 md:grid-cols-2">
          <input className="bg-[#fffdf9]" name="name" placeholder={t("pages.clients.fullName")} required />
          <input className="bg-[#fffdf9]" name="phone" placeholder={t("pages.clients.phone")} required />
          <input className="bg-[#fffdf9]" name="email" placeholder={t("pages.clients.email")} type="email" />
          <input className="bg-[#fffdf9]" name="notes" placeholder={t("pages.clients.notes")} />
          <button className="md:col-span-2" type="submit">{t("pages.clients.addClientButton")}</button>
        </form>
      </section>

      <section className="rounded-xl border border-[var(--bc-border)] bg-[var(--bc-surface)] p-5 shadow-sm shadow-[#d5c8b5]/30">
        <h2 className="mb-4 text-lg font-semibold text-[var(--bc-text)]">{t("pages.clients.clientList")}</h2>
        {clients.length === 0 ? (
          <p className="text-sm text-[var(--bc-muted)]">{t("pages.clients.noClients")}</p>
        ) : (
          <div className="grid gap-3">
            {clients.map((client) => (
              <div className="rounded-lg border border-[#eee3d7] bg-[#fffdf9] p-4" key={client.id}>
                <form action={updateClientAction} className="grid gap-3 md:grid-cols-5">
                  <input name="id" type="hidden" value={client.id} />
                  <input className="bg-white md:col-span-2" defaultValue={client.name} name="name" required />
                  <input className="bg-white" defaultValue={client.phone} name="phone" required />
                  <input className="bg-white" defaultValue={client.email ?? ""} name="email" type="email" />
                  <input className="bg-white md:col-span-4" defaultValue={client.notes ?? ""} name="notes" />
                  <div className="flex items-center gap-2 md:col-span-1 md:justify-end">
                    <button type="submit">{t("pages.clients.save")}</button>
                  </div>
                </form>

                {isAdmin ? (
                  <form action={deleteClientAction} className="mt-2 flex justify-end">
                    <input name="id" type="hidden" value={client.id} />
                    <button className="bg-[#7f3b34] text-white hover:bg-[#6d322c]" type="submit">{t("common.delete")}</button>
                  </form>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-[var(--bc-border)] bg-[var(--bc-surface)] p-5 shadow-sm shadow-[#d5c8b5]/30">
        <h2 className="mb-4 text-lg font-semibold text-[var(--bc-text)]">{t("pages.clients.assignPackage")}</h2>
        <form action={assignClientPackageAction} className="grid gap-3 md:grid-cols-4">
          <select name="clientId" required>
            <option value="">{t("pages.clients.selectClient")}</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
          <select name="packageTemplateId" required>
            <option value="">{t("pages.clients.selectPackageTemplate")}</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>{template.name}</option>
            ))}
          </select>
          <input name="customPrice" type="number" min={0} step="0.01" placeholder={t("pages.clients.customPriceOptional")} />
          <input name="expirationDate" type="date" />
          <button className="md:col-span-4" type="submit">{t("pages.clients.assignPackageButton")}</button>
        </form>
      </section>

      <section className="rounded-xl border border-[var(--bc-border)] bg-[var(--bc-surface)] p-5 shadow-sm shadow-[#d5c8b5]/30">
        <h2 className="mb-4 text-lg font-semibold text-[var(--bc-text)]">{t("pages.clients.clientPackageUsage")}</h2>
        <form action={useClientPackageAction} className="mb-4 grid gap-3 md:grid-cols-5">
          <select name="clientPackageId" required>
            <option value="">{t("pages.clients.selectActivePackage")}</option>
            {clientPackages
              .filter((pkg) => pkg.status === "ACTIVE")
              .map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.client.name} - {pkg.packageTemplate.name} ({pkg.remainingSessions}/{pkg.totalSessions})
                </option>
              ))}
          </select>
          <select name="serviceId" required>
            <option value="">{t("pages.clients.selectPerformedService")}</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>{service.name}</option>
            ))}
          </select>
          <select name="staffId" required>
            <option value="">{t("pages.clients.selectStaff")}</option>
            {staffList.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.name} ({staffTypeLabel[staff.type] ?? staff.type})
              </option>
            ))}
          </select>
          <input name="datePerformed" type="datetime-local" required />
          <input name="notes" placeholder={t("pages.clients.notes")} />
          <button className="md:col-span-5" type="submit">{t("pages.clients.registerUsage")}</button>
        </form>

        <div className="grid gap-3">
          {clientPackages.map((pkg) => (
            <div key={pkg.id} className="rounded-lg border border-[var(--bc-border)] bg-[#fffdf9] p-3">
              <p className="text-sm font-medium text-[var(--bc-text)]">
                {pkg.client.name} - {pkg.packageTemplate.name} - {pkg.status}
              </p>
              <p className="text-xs text-[var(--bc-muted)]">
                {t("pages.clients.remaining")}: {pkg.remainingSessions}/{pkg.totalSessions}
                {pkg.expirationDate ? ` | ${t("pages.clients.expires")}: ${pkg.expirationDate.toLocaleDateString()}` : ""}
              </p>
              {pkg.usages.length > 0 ? (
                <ul className="mt-2 grid gap-1 text-xs text-[var(--bc-muted)]">
                  {pkg.usages.map((usage) => (
                    <li key={usage.id}>
                      {usage.datePerformed.toLocaleDateString()} - {usage.service.name}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
