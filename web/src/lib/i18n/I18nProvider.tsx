"use client";

import { createContext, useContext, useMemo } from "react";
import type { Dictionary, Locale } from "./types";
import { getDictionary, formatMessage } from "./index";

type I18nContextValue = {
  locale: Locale;
  dict: Dictionary;
  t: {
    format: typeof formatMessage;
  } & Dictionary;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const value = useMemo(() => {
    const dict = getDictionary(locale);
    return {
      locale,
      dict,
      t: { ...dict, format: formatMessage },
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
