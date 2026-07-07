import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Mic2,
  Sparkles,
  Shield,
  Layers,
  Users,
  ChevronRight,
} from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";

const STATS = [
  { value: "6", label: "NCS 핵심 역량" },
  { value: "IRT", label: "적응형 난이도" },
  { value: "24/7", label: "언제든 연습" },
];

const FEATURES = [
  {
    icon: Mic2,
    title: "AI 모의면접",
    desc: "IRT 기반 적응형 난이도 · 자소서·JD 맞춤 첫 질문 · 음성 STT",
    href: "/interview/setup",
    accent: "from-primary/10 to-primary/5",
  },
  {
    icon: Sparkles,
    title: "나를 발견하기",
    desc: "강점 카드 수집 · 역량 브릿지 · 면접 활용 조언",
    href: "/discover",
    accent: "from-gold/15 to-gold/5",
  },
  {
    icon: BarChart3,
    title: "역량 트래킹",
    desc: "θ 성장 곡선 · Career Quest · 스킬 트리",
    href: "/dashboard",
    accent: "from-accent/10 to-accent/5",
  },
  {
    icon: Layers,
    title: "질문 카드",
    desc: "산업군·직무별 실전 기출 · 스와이프 습관 루프",
    href: "/practice/swipe",
    accent: "from-emerald-500/10 to-emerald-500/5",
  },
];

export function HomeLanding({ loggedIn }: { loggedIn: boolean }) {
  return (
    <div className="space-y-0">
      {/* Hero */}
      <section className="hero-mesh relative overflow-hidden rounded-[2rem] px-6 py-20 sm:px-12 md:py-28">
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-gold/20 blur-3xl" />

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-1.5 text-xs font-semibold text-primary shadow-sm backdrop-blur">
            <Shield className="h-3.5 w-3.5" />
            채용 AI 규제 시대의 정직한 면접 플랫폼
          </div>

          <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            데이터가 난이도를 맞추고,
            <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              당신의 성장이 증명됩니다
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted">
            모의면접 · 자기발견 · 역량 트래킹 · 코호트 관리 — 취업 준비의 전 과정을 하나의 Career OS에서.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link href={loggedIn ? "/interview/setup" : "/auth/register"} className="btn-primary px-8 py-4 text-base">
              {loggedIn ? "면접 시작" : "무료로 시작"}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/demo" className="btn-secondary px-8 py-4 text-base bg-white/80 backdrop-blur">
              5분 데모 체험
            </Link>
          </div>

          <div className="mx-auto mt-14 grid max-w-lg grid-cols-3 gap-4">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/50 bg-white/60 px-3 py-4 backdrop-blur">
                <p className="text-2xl font-bold text-primary">{s.value}</p>
                <p className="mt-0.5 text-xs text-muted">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <Reveal className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Product</p>
          <h2 className="mt-2 text-3xl font-bold text-foreground">상용급 취업 준비 스택</h2>
          <p className="mx-auto mt-3 max-w-lg text-muted">
            Yoodli·Big Interview·LinkedIn Learning의 장점을 NCS·IRT에 맞게 재설계했습니다.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.05}>
              <Link
                href={f.href}
                className={`group flex h-full flex-col justify-between rounded-2xl border border-card-border bg-gradient-to-br ${f.accent} p-8 transition hover:-translate-y-1 hover:shadow-luxe`}
              >
                <f.icon className="h-8 w-8 text-primary" />
                <div className="mt-6">
                  <h3 className="text-xl font-semibold text-foreground">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{f.desc}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition group-hover:opacity-100">
                    바로가기 <ChevronRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Trust band */}
      <Reveal>
        <section className="band-periwinkle px-8 py-14 sm:px-12">
          <div className="mx-auto max-w-4xl">
            <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold sm:text-3xl">왜 AXHRD인가</h2>
                <p className="mt-2 max-w-md text-sm text-white/85">
                  감정 AI 없음 · 자체 문항 · 채점 기준 불변 — 세션 간 비교 가능한 신뢰도
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {["감정분석 미사용", "IRT 2PL", "B2B 코호트"].map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-white/20 px-4 py-2 text-sm font-medium backdrop-blur"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      {/* B2B */}
      <section className="py-20">
        <Reveal>
          <div className="card-luxe flex flex-col items-center gap-8 p-10 sm:flex-row sm:p-12">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-2xl font-bold text-foreground">대학·기관 코호트</h3>
              <p className="mt-2 text-muted">
                취업센터 담당자용 — 학생 완료율·역량 평균 집계, 개인 답변 원문 비노출
              </p>
            </div>
            <Link href="/org/setup" className="btn-primary shrink-0">
              기관 연결
            </Link>
          </div>
        </Reveal>
      </section>

      {/* CTA */}
      <Reveal>
        <section className="hero-mesh mb-8 rounded-[2rem] px-6 py-16 text-center sm:px-10">
          <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">
            오늘 첫 면접을 시작하세요
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted">
            역량별 2~3문항 · 5분이면 첫 피드백
          </p>
          <Link href={loggedIn ? "/dashboard" : "/auth/register"} className="btn-primary mt-8 px-10 py-4 text-base">
            {loggedIn ? "내 역량 보기" : "지금 시작하기"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </Reveal>
    </div>
  );
}
