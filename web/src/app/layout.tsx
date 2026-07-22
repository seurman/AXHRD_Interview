import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n";
import { getTheme } from "@/lib/theme/get-theme";
import { fontVariables } from "@/lib/fonts";
import "./globals.css";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppHeaderGate } from "@/components/layout/AppHeaderGate";
import { AppShell } from "@/components/layout/AppShell";
import { NavSessionProvider } from "@/components/layout/NavSessionProvider";
import { RouteTransitionProvider } from "@/components/layout/RouteTransitionProvider";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { PwaRegister } from "@/components/PwaRegister";
import { Toaster } from "@/components/ui/sonner";

const themeInitScript = `(function(){try{var m=document.cookie.match(/(?:^|;\\s*)hr_in_theme=(\\w+)/);var t=m?m[1]:'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

/** Kill legacy SW before React — old workers intercepted `/` and broke soft-nav */
const swKillScript = `(function(){try{if(!('serviceWorker' in navigator))return;navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){r.unregister();});});if('caches' in window){caches.keys().then(function(ks){ks.forEach(function(k){caches.delete(k);});});}}catch(e){}})();`;

/** Paint homepage chrome before React hydrates — avoids late header/hero flash */
const homeBodyInitScript = `(function(){try{var p=location.pathname;if(p==='/'||p===''){document.body.classList.add('ax-home-page','ax-home-product-luxe','luxe-ready');}}catch(e){}})();`;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  return {
    title: dict.meta.title,
    description: dict.meta.description,
    icons: {
      icon: [{ url: "/brand/logo/axhrd-favicon.svg", type: "image/svg+xml" }],
      apple: [{ url: "/brand/logo/axhrd-app-icon.svg", type: "image/svg+xml" }],
    },
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
        <script dangerouslySetInnerHTML={{ __html: swKillScript }} />
        <meta name="theme-color" content="#0066FF" />
      </head>
      <body className={`${fontVariables} antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: homeBodyInitScript }} />
        <I18nProvider locale={locale}>
          <RouteTransitionProvider>
            <NavSessionProvider>
              <PwaRegister />
              <AppHeaderGate>
                <AppHeader />
              </AppHeaderGate>
              <main className="min-w-0">
                <AppShell>{children}</AppShell>
              </main>
              <Toaster richColors closeButton position="top-center" />
            </NavSessionProvider>
          </RouteTransitionProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
