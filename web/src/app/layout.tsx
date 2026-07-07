import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n";
import "./globals.css";
import { AppHeader } from "@/components/layout/AppHeader";
import { I18nProvider } from "@/lib/i18n/I18nProvider";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  return {
    title: dict.meta.title,
    description: dict.meta.description,
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={locale === "ko" ? "locale-ko" : "locale-en"}>
      <body className="antialiased">
        <I18nProvider locale={locale}>
          <AppHeader />
          <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</main>
        </I18nProvider>
      </body>
    </html>
  );
}
