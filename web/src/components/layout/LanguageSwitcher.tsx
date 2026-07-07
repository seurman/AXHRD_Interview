"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Globe } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { Locale } from "@/lib/i18n/types";

export function LanguageSwitcher({ compact }: { compact?: boolean }) {
  const { locale, dict } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const switchLocale = (next: Locale) => {
    if (next === locale || pending) return;
    startTransition(async () => {
      await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      });
      router.refresh();
    });
  };

  return (
    <div
      className={`lang-switch flex items-center gap-1 rounded-full border border-gold/25 bg-white/5 p-0.5 ${
        compact ? "scale-90" : ""
      }`}
      role="group"
      aria-label={dict.common.language.label}
    >
      {!compact && (
        <span className="hidden pl-2 pr-0.5 text-gold/70 lg:inline">
          <Globe className="h-3.5 w-3.5" />
        </span>
      )}
      {(["ko", "en"] as const).map((code) => (
        <button
          key={code}
          type="button"
          disabled={pending}
          onClick={() => switchLocale(code)}
          className={`rounded-full px-2.5 py-1 text-[0.65rem] font-semibold transition ${
            locale === code
              ? "bg-gold/20 text-gold-light"
              : "text-white/45 hover:text-white/75"
          }`}
          data-active={locale === code ? "true" : "false"}
        >
          {code === "ko" ? dict.common.language.ko : dict.common.language.en}
        </button>
      ))}
    </div>
  );
}
