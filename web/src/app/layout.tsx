import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n";
import { getTheme } from "@/lib/theme/get-theme";
import "./globals.css";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppShell } from "@/components/layout/AppShell";
import { I18nProvider } from "@/lib/i18n/I18nProvider";

/** 로그인·기관 역할에 따라 헤더(SaaS 메뉴 등)가 달라지므로 항상 동적 렌더 */
export const dynamic = "force-dynamic";

const themeInitScript = `(function(){try{var m=document.cookie.match(/(?:^|;\\s*)hr_in_theme=(\\w+)/);var t=m?m[1]:'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

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
  const theme = await getTheme();
  const htmlClass = [
    locale === "ko" ? "locale-ko" : "locale-en",
    theme === "dark" ? "dark" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <html lang={locale} className={htmlClass} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&family=Outfit:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
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
