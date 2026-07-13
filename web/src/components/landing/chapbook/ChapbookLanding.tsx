"use client";

import { useEffect, useRef, useState } from "react";
import { CHAPBOOK_LANDING_HTML } from "./chapbook-markup";
import "@/styles/chapbook/chapbook-home.css";

const INTENSITY_STORAGE_KEY = "axhrd-intensity";
/** 프로덕션 고정: editorial subtle (localStorage 키는 유지) */
const FIXED_INTENSITY = "subtle";

export function ChapbookLanding() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  useEffect(() => {
    document.body.classList.add("chapbook-page");
    document.body.setAttribute("data-intensity", FIXED_INTENSITY);
    localStorage.setItem(INTENSITY_STORAGE_KEY, FIXED_INTENSITY);

    return () => {
      document.body.classList.remove("chapbook-page");
      document.body.removeAttribute("data-intensity");
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const primaryCta = root.querySelector<HTMLAnchorElement>(".cta-btns .btn-primary");
    if (primaryCta) primaryCta.href = "/auth/register";

    const ghostCta = root.querySelector<HTMLAnchorElement>(".cta-btns .btn-ghost");
    if (ghostCta) ghostCta.href = "#cta";

    const catalogLink = root.querySelector<HTMLAnchorElement>(".arrow-link");
    if (catalogLink) catalogLink.href = "/discover";

    const onAnchorClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!anchor || !root.contains(anchor)) return;
      const id = anchor.getAttribute("href");
      if (!id || id === "#") return;
      const el = document.querySelector(id);
      if (!el) return;
      event.preventDefault();
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    root.addEventListener("click", onAnchorClick);
    return () => root.removeEventListener("click", onAnchorClick);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const form = root.querySelector<HTMLDivElement>(".cta-form");
    const submitBtn = form?.querySelector<HTMLButtonElement>(".submit");
    if (!form || !submitBtn) return;

    const onSubmit = async (event: Event) => {
      event.preventDefault();
      if (formSubmitting) return;

      const company =
        form.querySelector<HTMLInputElement>('input[type="text"]')?.value.trim() ??
        "";
      const nameRole =
        form.querySelectorAll<HTMLInputElement>("input[type=\"text\"]")[1]?.value.trim() ??
        "";
      const email =
        form.querySelector<HTMLInputElement>('input[type="email"]')?.value.trim() ??
        "";
      const solution =
        form.querySelector<HTMLSelectElement>("select")?.value ?? "";

      if (!company || !email) {
        setFormMessage("회사명과 업무 이메일을 입력해 주세요.");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setFormMessage("올바른 이메일 형식을 입력해 주세요.");
        return;
      }

      setFormSubmitting(true);
      setFormMessage(null);

      try {
        const res = await fetch("/api/demo-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company,
            nameRole,
            email,
            solution,
          }),
        });

        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(data?.error ?? "request failed");
        }

        const successMsg =
          "신청이 접수되었습니다. 보통 1영업일 이내 회신드립니다.";
        setFormMessage(successMsg);
        const footNote = form.querySelector<HTMLElement>(".foot-note");
        if (footNote) footNote.textContent = successMsg;
        form.querySelectorAll("input").forEach((input) => {
          input.value = "";
        });
        const select = form.querySelector("select");
        if (select) select.selectedIndex = 0;
      } catch (err) {
        const errMsg =
          err instanceof Error && err.message !== "request failed"
            ? err.message
            : "지금은 신청을 보내기 어렵습니다. 잠시 후 다시 시도하거나 영업팀에 문의해 주세요.";
        setFormMessage(errMsg);
        const footNote = form.querySelector<HTMLElement>(".foot-note");
        if (footNote) footNote.textContent = errMsg;
      } finally {
        setFormSubmitting(false);
      }
    };

    submitBtn.addEventListener("click", onSubmit);
    return () => submitBtn.removeEventListener("click", onSubmit);
  }, [formSubmitting]);

  return (
    <>
      <div
        ref={rootRef}
        className="chapbook-landing"
        dangerouslySetInnerHTML={{ __html: CHAPBOOK_LANDING_HTML }}
      />

      {formMessage ? (
        <div className="sr-only" role="status" aria-live="polite">
          {formMessage}
        </div>
      ) : null}
    </>
  );
}
