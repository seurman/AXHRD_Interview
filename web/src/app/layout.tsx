import type { Metadata } from "next";
import "./globals.css";
import { AppHeader } from "@/components/layout/AppHeader";

export const metadata: Metadata = {
  title: "HR_IN — Adaptive Mock Interview",
  description: "IRT 기반 적응형 AI 모의 면접 플랫폼",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="antialiased">
        <AppHeader />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
