import { prisma } from "@/lib/prisma";

import en from "@/locales/en.json";
import hr from "@/locales/hr.json";

export type Locale = "hr" | "en";

type Dictionary = typeof hr;

const dictionaries: Record<Locale, Dictionary> = {
  hr,
  en
};

export const DEFAULT_LOCALE: Locale = "hr";

function isLocale(value: string | null | undefined): value is Locale {
  return value === "hr" || value === "en";
}

function getValueByPath(obj: unknown, path: string): string | undefined {
  const value = path.split(".").reduce<unknown>((current, part) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    return (current as Record<string, unknown>)[part];
  }, obj);

  return typeof value === "string" ? value : undefined;
}

export async function getUserLocale(userId?: string): Promise<Locale> {
  if (!userId) {
    return DEFAULT_LOCALE;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { language: true }
  });

  return isLocale(user?.language) ? user.language : DEFAULT_LOCALE;
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

export function createTranslator(locale: Locale) {
  const dictionary = getDictionary(locale);

  return function t(key: string): string {
    return (
      getValueByPath(dictionary, key) ??
      getValueByPath(dictionaries[DEFAULT_LOCALE], key) ??
      key
    );
  };
}

export async function getTranslator(userId?: string) {
  const locale = await getUserLocale(userId);
  return {
    locale,
    t: createTranslator(locale)
  };
}
