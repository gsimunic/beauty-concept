import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Sidebar } from "@/components/layout/sidebar";
import { LogoutButton } from "@/components/layout/logout-button";
import { authOptions } from "@/lib/auth";
import { createTranslator, getUserLocale } from "@/lib/i18n";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }
  const locale = await getUserLocale(session.user.id);
  const t = createTranslator(locale);

  return (
    <div className="min-h-screen md:flex">
      <Sidebar locale={locale} />
      <div className="flex-1 p-4 md:p-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--bc-border)] bg-[var(--bc-surface)] p-4 shadow-sm shadow-[#d8c7b4]/30">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-[var(--bc-muted)]">{t("topbar.loggedInUser")}</p>
            <p className="font-medium text-[var(--bc-text)]">{session.user.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher
              locale={locale}
              label={t("topbar.language")}
              hrLabel={t("language.hr")}
              enLabel={t("language.en")}
            />
            <span className="rounded-full border border-[var(--bc-border)] bg-[var(--bc-accent-soft)] px-3 py-1 text-xs font-semibold tracking-wide text-[#5c5044]">
              {session.user.role}
            </span>
            <LogoutButton label={t("common.logout")} />
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
