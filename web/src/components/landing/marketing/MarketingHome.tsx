"use client";

import { useEffect, useRef } from "react";
import { MARKETING_HOME_HTML } from "./marketing-markup";
import { useLoggedIn, useNavSession } from "@/components/layout/NavSessionProvider";
import { landingDemoHref, landingStartHref } from "@/lib/landing/hrefs";
import "@/styles/marketing/homepage.css";

const FOOTER_PRODUCT_HREFS = [
  "/discover",
  "/resume-review",
  "/auth/register?next=/interview/setup",
  "/practice/swipe",
  "/dashboard",
  "/diagnosis",
];

const FOOTER_FOR_HREFS = ["/auth/register", "/org/setup", "/org/setup", "/diagnosis"];

export function MarketingHome() {
  const rootRef = useRef<HTMLDivElement>(null);
  const loggedIn = useLoggedIn();
  const nav = useNavSession();
  const trialOnly = nav?.trialOnly ?? false;
  const startHref = landingStartHref(loggedIn, trialOnly);
  const demoHref = landingDemoHref(loggedIn);

  useEffect(() => {
    document.body.classList.add("ax-home-page", "ax-home-product-luxe");
    return () => {
      document.body.classList.remove("ax-home-page", "ax-home-product-luxe", "luxe-ready");
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let disconnectReveal = () => {};
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!reducedMotion) {
      requestAnimationFrame(() => {
        document.body.classList.add("luxe-ready");
        root.querySelector(".luxe-reveal-hero")?.classList.add("luxe-in");
      });

      const revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("luxe-in");
            revealObserver.unobserve(entry.target);
          });
        },
        { threshold: 0.14, rootMargin: "0px 0px -6% 0px" },
      );

      root.querySelectorAll<HTMLElement>(".luxe-reveal").forEach((el) => {
        if (!el.classList.contains("luxe-reveal-hero")) {
          revealObserver.observe(el);
        }
      });
      disconnectReveal = () => revealObserver.disconnect();
    } else {
      root.querySelectorAll<HTMLElement>(".luxe-reveal").forEach((el) => {
        el.classList.add("luxe-in");
      });
      document.body.classList.add("luxe-ready");
    }

    root.querySelectorAll<HTMLAnchorElement>('[data-cta="start"]').forEach((a) => {
      a.href = startHref;
    });

    root.querySelectorAll<HTMLAnchorElement>('[data-cta="demo"]').forEach((a) => {
      a.href = demoHref;
    });

    root.querySelectorAll<HTMLAnchorElement>('a.btn-primary, a.btn.on-dark.btn-lg').forEach((a) => {
      if (a.dataset.cta) return;
      if (a.textContent?.includes("시작") || a.textContent?.includes("무료")) {
        a.href = startHref;
      }
    });

    root.querySelectorAll<HTMLAnchorElement>('a.btn.on-dark-ghost').forEach((a) => {
      if (!a.dataset.cta) a.href = "/org/setup";
    });

    const productCol = root.querySelector(".foot-col");
    if (productCol) {
      const links = productCol.querySelectorAll<HTMLAnchorElement>("a");
      links.forEach((a, i) => {
        if (FOOTER_PRODUCT_HREFS[i]) a.href = FOOTER_PRODUCT_HREFS[i];
      });
    }

    const forCol = root.querySelectorAll(".foot-col")[1];
    if (forCol) {
      const links = forCol.querySelectorAll<HTMLAnchorElement>("a");
      links.forEach((a, i) => {
        if (FOOTER_FOR_HREFS[i]) a.href = FOOTER_FOR_HREFS[i];
      });
    }

    const onTabClick = (event: Event) => {
      const btn = (event.target as HTMLElement).closest<HTMLButtonElement>(".aud-tab");
      if (!btn || !root.contains(btn)) return;
      const key = btn.dataset.aud;
      if (!key) return;
      root.querySelectorAll(".aud-tab").forEach((b) => {
        b.classList.toggle("active", b === btn);
      });
      root.querySelectorAll(".aud-panel").forEach((p) => {
        p.classList.toggle("active", p.getAttribute("data-panel") === key);
      });
    };

    const onAnchorClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>(
        'a[href^="#"]',
      );
      if (!anchor || !root.contains(anchor)) return;
      const href = anchor.getAttribute("href");
      if (!href || href === "#" || href.length < 2) return;
      const el = document.querySelector(href);
      if (!el) return;
      event.preventDefault();
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: "smooth" });
    };

    root.addEventListener("click", onTabClick);
    root.addEventListener("click", onAnchorClick);
    return () => {
      root.removeEventListener("click", onTabClick);
      root.removeEventListener("click", onAnchorClick);
      disconnectReveal();
    };
  }, [startHref, demoHref]);

  return (
    <div
      ref={rootRef}
      className="marketing-home"
      dangerouslySetInnerHTML={{ __html: MARKETING_HOME_HTML }}
    />
  );
}
