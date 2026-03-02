"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import type { Locale } from "@/lib/i18n";

type Props = {
  locale: Locale;
  label: string;
  hrLabel: string;
  enLabel: string;
};

export function LanguageSwitcher({ locale, label, hrLabel, enLabel }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onChange(nextLocale: Locale) {
    startTransition(async () => {
      const response = await fetch("/api/user/language", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ language: nextLocale })
      });

      if (!response.ok) {
        return;
      }

      router.refresh();
    });
  }

  return (
    <label className="flex items-center gap-2 text-xs text-[var(--bc-muted)]">
      <span className="uppercase tracking-wide">{label}</span>
      <select
        className="!py-1"
        defaultValue={locale}
        disabled={isPending}
        onChange={(event) => onChange(event.target.value as Locale)}
      >
        <option value="hr">{hrLabel}</option>
        <option value="en">{enLabel}</option>
      </select>
    </label>
  );
}
