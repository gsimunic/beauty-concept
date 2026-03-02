import Link from "next/link";
import type { Route } from "next";

import { createTranslator, type Locale } from "@/lib/i18n";

const links = [
  { href: "/dashboard", key: "sidebar.dashboard" },
  { href: "/dashboard/statistics", key: "sidebar.statistics" },
  { href: "/dashboard/inventory", key: "sidebar.inventory" },
  { href: "/dashboard/services", key: "sidebar.services" },
  { href: "/dashboard/staff", key: "sidebar.staff" },
  { href: "/dashboard/packages", key: "sidebar.packages" },
  { href: "/dashboard/clients", key: "sidebar.clients" },
  { href: "/dashboard/sales", key: "sidebar.sales" },
  { href: "/dashboard/suppliers", key: "sidebar.suppliers" },
  { href: "/dashboard/expenses", key: "sidebar.expenses" }
];

export function Sidebar({ locale }: { locale: Locale }) {
  const t = createTranslator(locale);

  return (
    <aside className="w-full border-r border-[var(--bc-border)] bg-[#f3e8db] p-5 text-[#4a4037] md:h-screen md:w-72">
      <h1 className="mb-1 text-xl font-semibold tracking-tight text-[var(--bc-text)]">Beauty Concept by Petra</h1>
      <p className="mb-7 text-xs uppercase tracking-[0.14em] text-[var(--bc-muted)]">{t("sidebar.admin")}</p>
      <nav className="grid gap-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href as Route}
            className="rounded-lg px-3 py-2 text-sm font-medium text-[#4a4037] hover:bg-[#eadaca] hover:text-[var(--bc-text)]"
          >
            {t(link.key)}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
