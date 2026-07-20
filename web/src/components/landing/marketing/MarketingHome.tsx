"use client";

import { useEffect, useRef } from "react";
import { buildMarketingHomeHtml } from "./marketing-markup";
import { useLoggedIn, useNavSession } from "@/components/layout/NavSessionProvider";
import { landingDemoHref, landingStartHref } from "@/lib/landing/hrefs";
import "@/styles/marketing/homepage.css";

export function MarketingHome() {
  const rootRef = useRef<HTMLDivElement>(null);
  const loggedIn = useLoggedIn();
  const nav = useNavSession();
  const trialOnly = nav?.trialOnly ?? false;
  const startHref = landingStartHref(loggedIn, trialOnly);
  const demoHref = landingDemoHref(loggedIn);
  const html = buildMarketingHomeHtml(startHref, demoHref);

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
      root.querySelector<HTMLElement>("section.cta")?.classList.add("luxe-in");
      disconnectReveal = () => revealObserver.disconnect();
    } else {
      root.querySelectorAll<HTMLElement>(".luxe-reveal").forEach((el) => {
        el.classList.add("luxe-in");
      });
      document.body.classList.add("luxe-ready");
    }

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

    root.addEventListener("click", onAnchorClick);
    return () => {
      root.removeEventListener("click", onAnchorClick);
      disconnectReveal();
    };
  }, [html]);

  return (
    <div
      ref={rootRef}
      className="marketing-home"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
