import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { createTranslator, getUserLocale } from "@/lib/i18n";
import { Section } from "@/components/ui/section";
import { prisma } from "@/lib/prisma";

import {
  addPackageTemplateItemAction,
  createPackageTemplateAction,
  deletePackageTemplateAction,
  deletePackageTemplateItemAction,
  updatePackageTemplateAction
} from "./actions";

export default async function PackagesPage() {
  const [templates, services, nearingExpiration, session] = await Promise.all([
    prisma.packageTemplate.findMany({
      include: {
        items: { include: { service: true }, orderBy: { createdAt: "asc" } }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.service.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.clientPackage.findMany({
      where: {
        status: "ACTIVE",
        expirationDate: {
          lte: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
          gte: new Date()
        }
      },
      include: {
        client: { select: { name: true } },
        packageTemplate: { select: { name: true } }
      },
      orderBy: { expirationDate: "asc" },
      take: 20
    }),
    getServerSession(authOptions)
  ]);
  const locale = await getUserLocale(session?.user.id);
  const t = createTranslator(locale);

  return (
    <main className="grid gap-6">
      <h1 className="text-2xl font-semibold text-[var(--bc-text)]">{t("pages.packages.title")}</h1>

      <Section title={t("pages.packages.createTemplate")}>
        <form action={createPackageTemplateAction} className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-xs text-[var(--bc-muted)]">
            {t("pages.packages.templateName")}
            <input name="name" required />
          </label>
          <label className="grid gap-1 text-xs text-[var(--bc-muted)]">
            {t("pages.packages.totalPrice")}
            <input name="totalPrice" type="number" min={0} step="0.01" required />
          </label>
          <label className="grid gap-1 text-xs text-[var(--bc-muted)] md:col-span-2">
            {t("pages.packages.description")}
            <textarea name="description" className="md:col-span-2" rows={2} />
          </label>
          <label className="grid gap-1 text-xs text-[var(--bc-muted)]">
            {t("common.status")}
            <select name="active" defaultValue="true">
              <option value="true">{t("pages.services.active")}</option>
              <option value="false">{t("pages.services.inactive")}</option>
            </select>
          </label>
          <button className="md:col-span-2" type="submit">{t("pages.packages.createTemplateButton")}</button>
        </form>
      </Section>

      <Section title={t("pages.packages.templateList")}>
        {templates.length === 0 ? (
          <p className="text-sm text-[var(--bc-muted)]">{t("pages.packages.noTemplates")}</p>
        ) : (
          <div className="grid gap-3">
            {templates.map((template) => (
              <div key={template.id} className="rounded-lg border border-[var(--bc-border)] bg-[#fffdf9] p-4">
                <form action={updatePackageTemplateAction} className="grid gap-3 md:grid-cols-2">
                  <input type="hidden" name="id" value={template.id} />
                  <input name="name" defaultValue={template.name} required />
                  <input name="totalPrice" type="number" step="0.01" min={0} defaultValue={Number(template.totalPrice)} required />
                  <textarea name="description" defaultValue={template.description ?? ""} className="md:col-span-2" rows={2} />
                  <select name="active" defaultValue={String(template.active)}>
                    <option value="true">{t("pages.services.active")}</option>
                    <option value="false">{t("pages.services.inactive")}</option>
                  </select>
                  <div className="md:col-span-2 flex justify-between">
                    <span className="text-xs text-[var(--bc-muted)]">{t("pages.packages.totalPrice")}: {formatCurrency(Number(template.totalPrice))}</span>
                    <button type="submit">{t("pages.packages.saveTemplate")}</button>
                  </div>
                </form>

                <form action={deletePackageTemplateAction} className="mt-2 flex justify-end">
                  <input type="hidden" name="id" value={template.id} />
                  <button type="submit" className="bg-[#7f3b34] hover:bg-[#6d322c]">{t("pages.packages.deleteTemplate")}</button>
                </form>

                <div className="mt-3 rounded-md border border-[#e8dccf] bg-[#fefaf5] p-3">
                  <h3 className="mb-2 text-sm font-medium text-[var(--bc-text)]">{t("pages.packages.templateItems")}</h3>
                  <form action={addPackageTemplateItemAction} className="grid gap-2 md:grid-cols-4">
                    <input type="hidden" name="packageTemplateId" value={template.id} />
                    <label className="grid gap-1 text-xs text-[var(--bc-muted)]">
                      {t("pages.services.selectService")}
                      <select name="serviceId" required>
                        <option value="">{t("pages.services.selectService")}</option>
                        {services.map((service) => (
                          <option key={service.id} value={service.id}>{service.name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1 text-xs text-[var(--bc-muted)]">
                      {t("pages.packages.quantity")}
                      <input name="quantity" type="number" min={1} required />
                    </label>
                    <button className="md:col-span-2" type="submit">{t("pages.packages.addItem")}</button>
                  </form>

                  <ul className="mt-3 grid gap-1 text-sm">
                    {template.items.map((item) => (
                      <li key={item.id} className="flex items-center justify-between rounded border border-[var(--bc-border)] bg-[#fffdf9] px-2 py-1">
                        <span>{item.service.name} x {item.quantity}</span>
                        <form action={deletePackageTemplateItemAction}>
                          <input type="hidden" name="id" value={item.id} />
                          <button type="submit" className="bg-[#7f3b34] hover:bg-[#6d322c]">{t("common.delete")}</button>
                        </form>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title={t("pages.packages.expiringSoon")}>
        {nearingExpiration.length === 0 ? (
          <p className="text-sm text-[var(--bc-muted)]">{t("pages.packages.noExpiring")}</p>
        ) : (
          <ul className="grid gap-2 text-sm">
            {nearingExpiration.map((item) => (
              <li key={item.id} className="rounded-md border border-[#d9c3a8] bg-[#fff3e6] px-3 py-2">
                {item.client.name} - {item.packageTemplate.name} - {t("pages.packages.remaining")} {item.remainingSessions} - {t("pages.packages.expires")} {item.expirationDate?.toLocaleDateString()}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </main>
  );
}
