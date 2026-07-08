"use client";

import { useEffect, useState, useTransition } from "react";
import { Moon, Sun } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

function readThemeCookie(): "light" | "dark" | "system" {
  if (typeof document === "undefined") return "system";
  const match = document.cookie.match(/(?:^|;\s*)hr_in_theme=(\w+)/);
  const value = match?.[1];
  if (value === "light" || value === "dark" || value === "system") return value;
  return "system";
}

function resolveDark(theme: "light" | "dark" | "system"): boolean {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(theme: "light" | "dark" | "system") {
  document.documentElement.classList.toggle("dark", resolveDark(theme));
}

export function ThemeSwitcher({ compact }: { compact?: boolean }) {
  const { dict } = useI18n();
  const [dark, setDark] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const initial = readThemeCookie();
    setDark(resolveDark(initial));

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const current = readThemeCookie();
      if (current === "system") {
        setDark(mq.matches);
        applyTheme("system");
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const toggle = () => {
    const next = dark ? "light" : "dark";
    startTransition(async () => {
      await fetch("/api/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: next }),
      });
      setDark(next === "dark");
      applyTheme(next);
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={`flex items-center justify-center rounded-full border border-gold/25 bg-white/5 text-gold/80 transition hover:bg-white/10 hover:text-gold ${
        compact ? "h-8 w-8" : "h-8 w-8"
      }`}
      aria-label={dict.common.theme.label}
      title={dark ? dict.common.theme.light : dict.common.theme.dark}
    >
      {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
    </button>
  );
}
