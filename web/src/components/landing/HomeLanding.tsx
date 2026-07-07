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
  Zap,
  Target,
  TrendingUp,
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
    chips: ["적응형", "STT", "JD 매핑"],
  },
  {
    icon: Sparkles,
    title: "나를 발견하기",
    desc: "강점 카드 수집 · 역량 브릿지 · 면접 활용 조언",
    href: "/discover",
    chips: ["강점 카드", "VIA", "코칭"],
  },
  {
    icon: BarChart3,
    title: "역량 트래킹",
    desc: "θ 성장 곡선 · Career Quest · 스킬 트리",
    href: "/dashboard",
    chips: ["θ 곡선", "Quest", "스킬 트리"],
  },
  {
    icon: Layers,
    title: "질문 카드",
    desc: "산업군·직무별 실전 질문 · 스와이프 습관 루프",
    href: "/practice/swipe",
    chips: ["스와이프", "44+ 질문", "저장·연습"],
  },
];

const VALUES = [
  {
    icon: Shield,
    title: "투명한 채점",
    desc: "감정 AI 없음 · 채점 기준 불변 · 세션 간 비교 가능",
  },
  {
    icon: Target,
    title: "정밀한 적응",
    desc: "IRT 2PL로 실력에 맞는 난이도 · 왜 이 질문인지 공개",
  },
  {
    icon: TrendingUp,
    title: "성장 증명",
    desc: "역량별 θ 추적 · 코호트 집계로 기관 성과 보고",
  },
];

export function HomeLanding({ loggedIn }: { loggedIn: boolean }) {
  return (
    <div className="space-y-0">
      {/* Hero — caesarsholding 다크 프리미엄 */}
      <section className="hero-premium relative px-6 py-20 sm:px-12 md:py-28">
        <div className="relative mx-auto max-w-4xl text-center">
          <p className="section-eyebrow">Career Intelligence Platform</p>

          <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.4rem]">
            데이터가 난이도를 맞추고,
            <br />
            <span className="bg-gradient-to-r from-gold via-gold-light to-gold bg-clip-text text-transparent">
              당신의 성장이 증명됩니다
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/65 sm:text-lg">
            모의면접 · 자기발견 · 역량 트래킹 · 코호트 관리 — 취업 준비의 전 과정을 하나의 Career OS에서.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link href={loggedIn ? "/interview/setup" : "/auth/register"} className="btn-gold">
              {loggedIn ? "면접 시작" : "무료로 시작"}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/demo" className="btn-outline-gold">
              5분 데모 체험
            </Link>
          </div>

          <div className="mx-auto mt-14 grid max-w-lg grid-cols-3 gap-3">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-white/10 bg-white/5 px-3 py-4 backdrop-blur"
              >
                <p className="text-2xl font-bold text-gold">{s.value}</p>
                <p className="mt-0.5 text-[0.65rem] font-medium tracking-wide text-white/50">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product lines */}
      <section className="py-20">
        <Reveal className="text-center">
          <p className="section-eyebrow">Our Product Lines</p>
          <h2 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
            상용급 취업 준비 스택
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted">
            NCS·IRT에 최적화된 4가지 핵심 모듈로 면접 준비 전 과정을 커버합니다.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.05}>
              <Link href={f.href} className="feature-card-premium group flex h-full flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gold/20 bg-gold/8">
                    <f.icon className="h-6 w-6 text-gold" />
                  </div>
                  <span className="flex items-center gap-1 text-xs font-semibold text-primary opacity-0 transition group-hover:opacity-100">
                    Learn More <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>
                <h3 className="mt-5 text-xl font-bold text-foreground">{f.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{f.desc}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {f.chips.map((chip) => (
                    <span key={chip} className="stat-chip">
                      {chip}
                    </span>
                  ))}
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Core values */}
      <Reveal>
        <section className="rounded-[1.75rem] border border-card-border bg-gradient-to-br from-[#0c1222] to-[#141d32] px-8 py-14 text-white sm:px-12">
          <div className="text-center">
            <p className="section-eyebrow">Core Values</p>
            <h2 className="mt-3 text-2xl font-bold sm:text-3xl">왜 HR_IN인가</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/60">
              채용 AI 규제 시대에 신뢰할 수 있는 면접 준비 플랫폼
            </p>
          </div>
          <div className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-3">
            {VALUES.map((v) => (
              <div
                key={v.title}
                className="rounded-2xl border border-white/8 bg-white/4 p-6 text-center transition hover:border-gold/25"
              >
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-gold/30 bg-gold/10">
                  <v.icon className="h-5 w-5 text-gold" />
                </div>
                <h3 className="mt-4 font-semibold">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{v.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      {/* B2B */}
      <section className="py-20">
        <Reveal>
          <div className="feature-card-premium flex flex-col items-center gap-8 p-10 sm:flex-row sm:p-12">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-gold/20 bg-gold/8">
              <Users className="h-8 w-8 text-gold" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <p className="section-eyebrow text-left sm:text-left">Enterprise</p>
              <h3 className="mt-2 text-2xl font-bold text-foreground">대학·기관 코호트</h3>
              <p className="mt-2 text-muted">
                취업센터 담당자용 — 학생 완료율·역량 평균 집계, 개인 답변 원문 비노출
              </p>
            </div>
            <Link href="/org/setup" className="btn-gold shrink-0">
              기관 연결
              <Zap className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>
      </section>

      {/* CTA */}
      <Reveal>
        <section className="hero-premium mb-8 px-6 py-16 text-center sm:px-10">
          <h2 className="text-3xl font-extrabold sm:text-4xl">오늘 첫 면접을 시작하세요</h2>
          <p className="mx-auto mt-3 max-w-md text-white/60">
            역량별 2~3문항 · 5분이면 첫 피드백
          </p>
          <Link
            href={loggedIn ? "/dashboard" : "/auth/register"}
            className="btn-gold mt-8 px-10"
          >
            {loggedIn ? "내 역량 보기" : "지금 시작하기"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </Reveal>
    </div>
  );
}
