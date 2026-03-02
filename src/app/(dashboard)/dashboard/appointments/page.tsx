import { AppointmentStatus } from "@prisma/client";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { createTranslator, getUserLocale } from "@/lib/i18n";
import { Section } from "@/components/ui/section";
import { prisma } from "@/lib/prisma";

import { createAppointmentAction, updateAppointmentStatusAction } from "./actions";

export default async function AppointmentsPage() {
  const [appointments, clients, services, employees, session] = await Promise.all([
    prisma.appointment.findMany({
      include: { client: true, service: true, employee: true },
      orderBy: { startTime: "desc" },
      take: 100
    }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.service.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ orderBy: { email: "asc" } }),
    getServerSession(authOptions)
  ]);
  const locale = await getUserLocale(session?.user.id);
  const t = createTranslator(locale);

  return (
    <main className="grid gap-6">
      <h1 className="text-2xl font-semibold text-[var(--bc-text)]">{t("pages.appointments.title")}</h1>

      <Section title={t("pages.appointments.createAppointment")}>
        <form action={createAppointmentAction} className="grid gap-3 md:grid-cols-2">
          <select name="clientId" required>
            <option value="">{t("pages.appointments.selectClient")}</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>

          <select name="serviceId" required>
            <option value="">{t("pages.appointments.selectService")}</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>{service.name}</option>
            ))}
          </select>

          <select name="employeeId" required>
            <option value="">{t("pages.appointments.selectEmployee")}</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>{employee.name ?? employee.email}</option>
            ))}
          </select>

          <input name="startTime" type="datetime-local" required />
          <textarea name="notes" className="md:col-span-2" rows={2} placeholder={t("common.notes")} />
          <button className="md:col-span-2" type="submit">{t("pages.appointments.createAppointmentButton")}</button>
        </form>
      </Section>

      <Section title={t("pages.appointments.appointmentList")}>
        {appointments.length === 0 ? (
          <p className="text-sm text-[var(--bc-muted)]">{t("pages.appointments.noAppointments")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--bc-border)] text-[var(--bc-muted)]">
                  <th className="px-2 py-2 font-medium">{t("common.date")}</th>
                  <th className="px-2 py-2 font-medium">{t("pages.clients.title")}</th>
                  <th className="px-2 py-2 font-medium">{t("pages.services.title")}</th>
                  <th className="px-2 py-2 font-medium">{t("pages.appointments.employee")}</th>
                  <th className="px-2 py-2 font-medium">{t("common.status")}</th>
                  <th className="px-2 py-2 font-medium">{t("pages.appointments.action")}</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => (
                  <tr key={appointment.id} className="border-b border-[#efe3d4]">
                    <td className="px-2 py-2">{appointment.startTime.toLocaleString()}</td>
                    <td className="px-2 py-2">{appointment.client.name}</td>
                    <td className="px-2 py-2">{appointment.service.name}</td>
                    <td className="px-2 py-2">{appointment.employee.name ?? appointment.employee.email}</td>
                    <td className="px-2 py-2">{appointment.status}</td>
                    <td className="px-2 py-2">
                      <form action={updateAppointmentStatusAction} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={appointment.id} />
                        <select name="status" defaultValue={appointment.status}>
                          {Object.values(AppointmentStatus).map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                        <button type="submit">{t("pages.appointments.update")}</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </main>
  );
}
