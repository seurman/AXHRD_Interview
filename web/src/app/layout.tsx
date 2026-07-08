import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n";
import "./globals.css";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppShell } from "@/components/layout/AppShell";
import { I18nProvider } from "@/lib/i18n/I18nProvider";

/** 로그인·기관 역할에 따라 헤더(SaaS 메뉴 등)가 달라지므로 항상 동적 렌더 */
export const dynamic = "force-dynamic";

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
          <main className="min-w-0">
            <AppShell>{children}</AppShell>
          </main>
        </I18nProvider>
      </body>
    </html>
  );
}
