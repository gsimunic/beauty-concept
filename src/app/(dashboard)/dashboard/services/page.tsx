import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { createTranslator, getUserLocale } from "@/lib/i18n";
import { Section } from "@/components/ui/section";
import { prisma } from "@/lib/prisma";

import {
  createServiceAction,
  deleteServiceAction,
  upsertServiceConsumptionAction,
  updateServiceAction,
  deleteServiceConsumptionAction
} from "./actions";

export default async function ServicesPage() {
  const [session, services, products, consumptions] = await Promise.all([
    getServerSession(authOptions),
    prisma.service.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.product.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.serviceConsumption.findMany({
      include: {
        service: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: "desc" }
    })
  ]);
  const isAdmin = session?.user.role === "ADMIN";
  const locale = await getUserLocale(session?.user.id);
  const t = createTranslator(locale);

  return (
    <main className="grid gap-6">
      <h1 className="text-2xl font-semibold text-[var(--bc-text)]">{t("pages.services.title")}</h1>

      <Section title={t("pages.services.addService")}>
        <form action={createServiceAction} className="grid gap-3 md:grid-cols-2">
          <input name="name" placeholder={t("pages.services.serviceName")} required />
          <label className="grid gap-1 text-xs text-[var(--bc-muted)]">
            {t("pages.services.basePriceEur")}
            <div className="flex items-center rounded-md border border-[var(--bc-border)] bg-[#fffdf9]">
              <input className="flex-1 border-0 bg-transparent" name="basePrice" type="number" step="0.01" min={0} required />
              <span className="px-3 text-sm text-[var(--bc-muted)]">€</span>
            </div>
          </label>
          <label className="grid gap-1 text-xs text-[var(--bc-muted)]">
            {t("pages.services.durationMinutesMin")}
            <div className="flex items-center rounded-md border border-[var(--bc-border)] bg-[#fffdf9]">
              <input className="flex-1 border-0 bg-transparent" name="durationMinutes" type="number" min={1} />
              <span className="px-3 text-sm text-[var(--bc-muted)]">min</span>
            </div>
          </label>
          <select name="active" defaultValue="true">
            <option value="true">{t("pages.services.active")}</option>
            <option value="false">{t("pages.services.inactive")}</option>
          </select>
          <button className="md:col-span-2" type="submit">{t("pages.services.createService")}</button>
        </form>
      </Section>

      <Section title={t("pages.services.serviceList")}>
        <div className="grid gap-3">
          {services.map((service) => (
            <div key={service.id} className="rounded-lg border border-[var(--bc-border)] bg-[#fffdf9] p-4">
              <form action={updateServiceAction} className="grid gap-3 md:grid-cols-2">
                <input type="hidden" name="id" value={service.id} />
                <input name="name" defaultValue={service.name} required />
                <div className="flex items-center rounded-md border border-[var(--bc-border)] bg-[#fffdf9]">
                  <input
                    className="flex-1 border-0 bg-transparent"
                    name="basePrice"
                    type="number"
                    step="0.01"
                    min={0}
                    defaultValue={Number(service.basePrice)}
                    required
                  />
                  <span className="px-3 text-sm text-[var(--bc-muted)]">€</span>
                </div>
                <div className="flex items-center rounded-md border border-[var(--bc-border)] bg-[#fffdf9]">
                  <input
                    className="flex-1 border-0 bg-transparent"
                    name="durationMinutes"
                    type="number"
                    min={1}
                    defaultValue={service.durationMinutes ?? ""}
                  />
                  <span className="px-3 text-sm text-[var(--bc-muted)]">min</span>
                </div>
                <select name="active" defaultValue={String(service.active)}>
                  <option value="true">{t("pages.services.active")}</option>
                  <option value="false">{t("pages.services.inactive")}</option>
                </select>
                <div className="md:col-span-2 flex justify-end items-center">
                  <button type="submit">{t("pages.services.saveService")}</button>
                </div>
              </form>
              {isAdmin ? (
                <form action={deleteServiceAction} className="mt-2 flex justify-end">
                  <input type="hidden" name="id" value={service.id} />
                  <button className="bg-[#7f3b34] hover:bg-[#6d322c]" type="submit">{t("common.delete")}</button>
                </form>
              ) : null}
            </div>
          ))}
        </div>
      </Section>

      <Section title={t("pages.services.serviceConsumptionMapping")}>
        <form action={upsertServiceConsumptionAction} className="grid gap-3 md:grid-cols-4">
          <select name="serviceId" required>
            <option value="">{t("pages.services.selectService")}</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>{service.name}</option>
            ))}
          </select>
          <select name="productId" required>
            <option value="">{t("pages.services.selectProduct")}</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>{product.name}</option>
            ))}
          </select>
          <input name="quantityUsed" type="number" min={0.001} step="0.001" placeholder={t("pages.services.quantityUsed")} required />
          <button type="submit">{t("pages.services.saveMapping")}</button>
        </form>

        <div className="mt-4 grid gap-2">
          {consumptions.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-md border border-[var(--bc-border)] bg-[#fffdf9] px-3 py-2 text-sm">
              <span>{item.service.name} {"->"} {item.product.name} ({Number(item.quantityUsed).toFixed(3)})</span>
              {isAdmin ? (
                <form action={deleteServiceConsumptionAction}>
                  <input type="hidden" name="id" value={item.id} />
                  <button className="bg-[#7f3b34] hover:bg-[#6d322c]" type="submit">{t("common.delete")}</button>
                </form>
              ) : null}
            </div>
          ))}
        </div>
      </Section>
    </main>
  );
}
