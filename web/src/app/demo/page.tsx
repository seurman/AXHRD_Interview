import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Upload,
  Layers,
  PlayCircle,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { Reveal } from "@/components/ui/Reveal";
import { TrialTeaser } from "@/components/trial/TrialTeaser";
import { ScrollToTrialHash } from "@/components/trial/ScrollToTrialHash";

const STEPS = [
  {
    icon: Upload,
    title: "산업·직무 선택",
    desc: "지원 직무에 맞는 질문 톤. 자소서를 올리면 질문이 개인화됩니다.",
  },
  {
    icon: Layers,
    title: "역량 하나 골라 연습",
    desc: "6개 역량 중 하나씩, 문항 2~3개로 짧게 연습합니다.",
  },
  {
    icon: PlayCircle,
    title: "음성 답변 → 리포트",
    desc: "꼬리질문·역량 점수·개선 코칭까지 한 번에 받습니다.",
  },
];

const FAQS = [
  {
    q: "맛보기와 가입 후 면접은 뭐가 다른가요?",
    a: "맛보기는 텍스트 1문항·6축 코칭 미리보기입니다. 가입 후에는 음성 답변, 꼬리질문, 자소서 연동, 역량 점수·리포트·월 3회 무료가 열립니다.",
  },
  {
    q: "표정이나 목소리 톤으로 감정을 분석하나요?",
    a: "아니요. 답변 내용과 루브릭 기준으로만 채점합니다.",
  },
  {
    q: "무료로 얼마나 쓸 수 있나요?",
    a: "회원가입 후 월 3회 모의면접을 무료로 이용할 수 있습니다.",
  },
];

export default async function DemoPage() {
  const user = await getCurrentUser();
  const registerHref = "/auth/register?next=/interview/setup";

  return (
    <div className="space-y-16">
      <ScrollToTrialHash />

      <a
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        홈으로
      </a>

      <header className="max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-widest text-primary">3분 체험</p>
        <h1 className="mt-2 text-3xl font-bold leading-tight text-foreground md:text-4xl">
          먼저 1문항,
          <br />
          <span className="text-primary">피드백까지 받아 보세요</span>
        </h1>
        <p className="mt-4 text-muted">
          계정 없이 시작합니다. 마음에 들면 가입하고 음성 면접으로 이어가면 됩니다.
        </p>
      </header>

      <Reveal>
        <TrialTeaser loggedIn={!!user} />
      </Reveal>

      <section>
        <Reveal className="text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">가입 후</p>
          <h2 className="mt-2 text-2xl font-bold text-foreground">이렇게 이어집니다</h2>
        </Reveal>
        <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, desc }, i) => (
            <Reveal key={title} delay={i * 0.06}>
              <div className="card-luxe h-full p-5">
                <Icon className="h-5 w-5 text-primary" />
                <h3 className="mt-3 font-semibold text-foreground">{title}</h3>
                <p className="mt-2 text-sm text-muted">{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-2xl">
        <h2 className="mb-6 text-center text-xl font-bold text-foreground">자주 묻는 질문</h2>
        <div className="space-y-3">
          {FAQS.map(({ q, a }) => (
            <details key={q} className="card-luxe group p-5 open:pb-5">
              <summary className="cursor-pointer list-none font-medium text-foreground marker:content-none">
                <span className="flex items-center justify-between gap-3">
                  {q}
                  <span className="shrink-0 text-primary transition group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <Reveal>
        <section className="band-periwinkle px-6 py-12 text-center sm:px-10">
          <h2 className="text-2xl font-bold sm:text-3xl">피드백이 괜찮았다면</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/90">
            가입하고 음성 면접을 시작하세요. 월 3회 무료 · 카드 등록 없음.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {user ? (
              <Link
                href="/interview/setup"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-primary transition hover:bg-white/90"
              >
                음성 면접 시작
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href={registerHref}
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-primary transition hover:bg-white/90"
              >
                무료로 가입하기
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            <Link
              href="/demo#trial"
              className="inline-flex items-center gap-2 rounded-full border border-white/40 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              맛보기 다시 하기
            </Link>
          </div>
        </section>
      </Reveal>
    </div>
  );
}
