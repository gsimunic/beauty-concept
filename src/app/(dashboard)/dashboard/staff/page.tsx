import { StaffType } from "@prisma/client";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { createTranslator, getUserLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

import { createStaffAction, toggleStaffActiveAction, updateStaffAction } from "./actions";

export default async function StaffPage() {
  const [session, staffList] = await Promise.all([
    getServerSession(authOptions),
    prisma.staff.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] })
  ]);
  const locale = await getUserLocale(session?.user.id);
  const t = createTranslator(locale);

  return (
    <main className="grid gap-6">
      <h1 className="text-2xl font-semibold text-[var(--bc-text)]">{t("pages.staff.title")}</h1>

      <section className="rounded-xl border border-[var(--bc-border)] bg-[var(--bc-surface)] p-5 shadow-sm shadow-[#d5c8b5]/30">
        <h2 className="mb-4 text-lg font-semibold text-[var(--bc-text)]">{t("pages.staff.addStaff")}</h2>
        <form action={createStaffAction} className="grid gap-3 md:grid-cols-3">
          <input name="name" required placeholder={t("pages.staff.name")} />
          <select defaultValue={StaffType.INTERNAL} name="type" required>
            <option value={StaffType.INTERNAL}>{t("pages.staff.internal")}</option>
            <option value={StaffType.EXTERNAL}>{t("pages.staff.external")}</option>
          </select>
          <select defaultValue="true" name="active">
            <option value="true">{t("pages.staff.active")}</option>
            <option value="false">{t("pages.staff.inactive")}</option>
          </select>

          <input min={0} name="baseSalary" placeholder={t("pages.staff.baseSalary")} step="0.01" type="number" />
          <input
            min={0}
            max={100}
            name="commissionPercentage"
            placeholder={t("pages.staff.commissionPercentage")}
            step="0.01"
            type="number"
          />
          <input
            min={0}
            max={100}
            name="profitSharePercentage"
            placeholder={t("pages.staff.profitSharePercentage")}
            step="0.01"
            type="number"
          />

          <button className="md:col-span-3" type="submit">{t("pages.staff.addStaffButton")}</button>
        </form>
      </section>

      <section className="rounded-xl border border-[var(--bc-border)] bg-[var(--bc-surface)] p-5 shadow-sm shadow-[#d5c8b5]/30">
        <h2 className="mb-4 text-lg font-semibold text-[var(--bc-text)]">{t("pages.staff.staffList")}</h2>

        {staffList.length === 0 ? (
          <p className="text-sm text-[var(--bc-muted)]">{t("pages.staff.noStaff")}</p>
        ) : (
          <div className="grid gap-3">
            {staffList.map((staff) => (
              <div className="rounded-lg border border-[#eee3d7] bg-[#fffdf9] p-4" key={staff.id}>
                <form action={updateStaffAction} className="grid gap-3 md:grid-cols-4">
                  <input name="id" type="hidden" value={staff.id} />
                  <input defaultValue={staff.name} name="name" required />
                  <select defaultValue={staff.type} name="type" required>
                    <option value={StaffType.INTERNAL}>{t("pages.staff.internal")}</option>
                    <option value={StaffType.EXTERNAL}>{t("pages.staff.external")}</option>
                  </select>
                  <input
                    defaultValue={staff.baseSalary ? Number(staff.baseSalary) : ""}
                    min={0}
                    name="baseSalary"
                    placeholder={t("pages.staff.baseSalary")}
                    step="0.01"
                    type="number"
                  />
                  <input
                    defaultValue={staff.commissionPercentage ? Number(staff.commissionPercentage) : ""}
                    max={100}
                    min={0}
                    name="commissionPercentage"
                    placeholder={t("pages.staff.commissionPercentage")}
                    step="0.01"
                    type="number"
                  />
                  <input
                    defaultValue={staff.profitSharePercentage ? Number(staff.profitSharePercentage) : ""}
                    max={100}
                    min={0}
                    name="profitSharePercentage"
                    placeholder={t("pages.staff.profitSharePercentage")}
                    step="0.01"
                    type="number"
                  />
                  <select defaultValue={String(staff.active)} name="active">
                    <option value="true">{t("pages.staff.active")}</option>
                    <option value="false">{t("pages.staff.inactive")}</option>
                  </select>
                  <button type="submit">{t("common.save")}</button>
                </form>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--bc-muted)]">
                  <div className="flex flex-wrap gap-3">
                    <span>
                      {t("pages.staff.baseSalary")}: {staff.baseSalary ? formatCurrency(Number(staff.baseSalary)) : t("common.none")}
                    </span>
                    <span>
                      {t("pages.staff.commissionPercentage")}: {staff.commissionPercentage ? `${Number(staff.commissionPercentage)}%` : t("common.none")}
                    </span>
                    <span>
                      {t("pages.staff.profitSharePercentage")}: {staff.profitSharePercentage ? `${Number(staff.profitSharePercentage)}%` : t("common.none")}
                    </span>
                  </div>

                  <form action={toggleStaffActiveAction} className="flex items-center gap-2">
                    <input name="id" type="hidden" value={staff.id} />
                    <input name="active" type="hidden" value={String(!staff.active)} />
                    <button className="bg-[#7f3b34] text-white hover:bg-[#6d322c]" type="submit">
                      {staff.active ? t("pages.staff.deactivate") : t("pages.staff.activate")}
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
