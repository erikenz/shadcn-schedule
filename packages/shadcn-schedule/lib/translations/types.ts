import type { defaultTranslations } from "@/lib/translations/default";

/** All translation keys, derived from the canonical English dictionary in `default.ts`. */
export type Translations = Record<keyof typeof defaultTranslations, string>;

export type TranslationKey = keyof Translations;

export type TranslatorFunction = (key: string) => string;
