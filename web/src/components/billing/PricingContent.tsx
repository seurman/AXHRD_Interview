"use client";

import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { PLANS } from "@/lib/billing/plans";
import { PlanPrice, PlanSubscribeButton } from "@/components/billing/PlanSubscribeButton";
import { useNavSession } from "@/components/layout/NavSessionProvider";

export function PricingContent() {
  const nav = useNavSession();
  const loggedIn = nav?.loggedIn ?? false;
  const isOrgAdmin =
    loggedIn && nav?.orgRole === "ADMIN" && !!nav?.organizationId;

  const tiers = ["FREE", "INDIVIDUAL_PRO", "ORG_STANDARD", "ORG_ENTERPRISE"] as const;

  return (
    <div className="space-y-16 pb-12">
      <section className="hero-blue rounded-2xl px-6 py-12 sm:px-10 sm:py-14">
        <Reveal>
          <p className="hero-eyebrow">Pricing</p>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
            역량 면접 연습, <span className="hero-highlight">플랜에 맞게</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80">
            Free로 시작하고, 필요할 때 Pro 또는 기관 플랜으로 업그레이드하세요.
            카드 정보는 토스페이먼츠가 처리하며 HR_IN에는 빌링키만 저장됩니다.
          </p>
        </Reveal>
      </section>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {tiers.map((tier, i) => {
          const plan = PLANS[tier];
          const isPro = tier === "INDIVIDUAL_PRO";
          const isOrg = tier.startsWith("ORG_");
          const canSubscribe =
            tier === "FREE" ? false : isOrg ? isOrgAdmin : true;

          return (
            <Reveal key={tier} delay={i * 0.06}>
              <div
                className={`card-luxe flex h-full flex-col p-6 ${
                  isPro ? "ring-2 ring-accent/40" : ""
                }`}
              >
                <p className="text-xs font-medium uppercase tracking-widest text-gold">
                  {tier === "FREE" ? "Starter" : isOrg ? "Organization" : "Individual"}
                </p>
                <h2 className="mt-1 text-lg font-bold text-foreground">{plan.nameKo}</h2>
                <p className="mt-1 text-xs text-muted">{plan.description}</p>
                <PlanPrice tier={tier} />
                <ul className="mt-4 flex-1 space-y-2 text-sm text-muted">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-accent">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                {tier === "FREE" ? (
                  <Link
                    href={loggedIn ? "/interview/setup" : "/auth/register"}
                    className="btn-outline-primary mt-6 block w-full py-2.5 text-center text-sm"
                  >
                    {loggedIn ? "면접 시작" : "무료 가입"}
                  </Link>
                ) : (
                  <PlanSubscribeButton
                    tier={tier}
                    canSubscribe={canSubscribe}
                    loggedIn={loggedIn}
                    subscribeLabel={isOrg ? "기관 구독하기" : "Pro 구독하기"}
                  />
                )}
              </div>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={0.1}>
        <div className="band-periwinkle rounded-2xl px-6 py-8 text-center">
          <p className="text-sm text-muted">
            Enterprise는 세금계산서·계좌이체 계약입니다.{" "}
            <a href="mailto:support@axhrd.com" className="text-accent hover:underline">
              영업팀 문의
            </a>
          </p>
          {loggedIn && (
            <p className="mt-2 text-xs text-muted">
              구독 해지는{" "}
              <Link href="/profile" className="text-accent hover:underline">
                프로필
              </Link>
              에서 현재 주기 종료 시 해지 예약이 가능합니다.
            </p>
          )}
        </div>
      </Reveal>
    </div>
  );
}
