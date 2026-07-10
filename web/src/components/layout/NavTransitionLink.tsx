"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { useRouteTransition } from "@/components/layout/RouteTransitionProvider";

type Props = Omit<ComponentProps<typeof Link>, "href"> & { href: string };

/** 메뉴 링크 — hover prefetch + 클릭 즉시 전환 피드백 */
export function NavTransitionLink({
  href,
  onClick,
  children,
  ...props
}: Props) {
  const router = useRouter();
  const { startNavigation } = useRouteTransition();

  return (
    <Link
      href={href}
      prefetch
      onMouseEnter={() => router.prefetch(href)}
      onFocus={() => router.prefetch(href)}
      onClick={(e) => {
        startNavigation(href);
        onClick?.(e);
      }}
      {...props}
    >
      {children}
    </Link>
  );
}
