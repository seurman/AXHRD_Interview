import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowLeft,
  BarChart3,
  Mic,
  Sparkles,
  Upload,
  Layers,
  PlayCircle,
  MessageCircle,
  Lightbulb,
  Briefcase,
  Users,
  Flag,
  TrendingUp,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { competencyLabel } from "@/lib/labels";
import { COMPETENCY_CODES } from "@/types";

const COMPETENCY_ICONS: Record<string, typeof MessageCircle> = {
  COMMUNICATION: MessageCircle,
  PROBLEM_SOLVING: Lightbulb,
  JOB_FIT: Briefcase,
  ORG_FIT: Users,
  LEADERSHIP: Flag,
  GROWTH: TrendingUp,
};

const COMPETENCY_DESC: Record<string, string> = {
  COMMUNICATION: "생각을 명료하게 전달하고 상대 의도를 정확히 파악하는지",
  PROBLEM_SOLVING: "문제의 본질을 파고들어 논리적으로 해법을 제시하는지",
  JOB_FIT: "지원 직무에 필요한 실무 이해도와 준비도가 있는지",
  ORG_FIT: "조직 문화·협업 방식에 잘 어울릴 수 있는지",
  LEADERSHIP: "책임감 있게 상황을 이끌고 영향력을 발휘하는지",
  GROWTH: "실패와 피드백을 통해 스스로 성장해온 궤적이 있는지",
};

const FAQS = [
  {
    q: "AI 모의면접, 실제 면접에 도움이 될까요?",
    a: "IRT(문항반응이론) 기반으로 내 역량 수준에 맞춰 난이도가 자동 조정되고, 자기소개서 내용을 반영한 맞춤 질문이 나옵니다. 반복할수록 역량별 θ(추정 실력)가 쌓여 어디가 약한지 구체적으로 알 수 있어요.",
  },
  {
    q: "표정이나 목소리 톤으로 감정을 분석하나요?",
    a: "아니요. 영상·음성으로 감정을 추론하는 기능은 의도적으로 넣지 않았습니다. 답변 내용(STT 텍스트)과 루브릭 기준으로만 채점해 편향 논란을 피했습니다.",
  },
  {
    q: "역량은 제가 직접 골라야 하나요?",
    a: "네, 자유롭게 고를 수 있어요. 다만 산업·직무를 먼저 선택하면 그 직무에서 특히 중요하게 보는 역량에 ⭐ 추천 표시가 붙어요. NCS 직업기초능력은 직무와 무관하게 공통 평가 대상이라 특정 역량만 강제하지 않습니다.",
  },
  {
    q: "제 답변이나 개인정보는 어떻게 쓰이나요?",
    a: "자기소개서·답변 내용은 질문 생성과 채점에만 사용되고, 기관 대시보드에는 개인 답변 원문 없이 점수·완료 현황만 집계됩니다.",
  },
];

export default async function DemoPage() {
  const user = await getCurrentUser();

  return (
    <div className="space-y-16">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        홈으로
      </Link>

      <section className="grid items-center gap-10 py-2 md:grid-cols-2 md:py-8">
        <div className="text-center md:text-left">
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-primary">
            지금 바로 체험해보세요
          </p>
          <h1 className="mb-6 text-4xl font-bold leading-tight text-foreground md:text-5xl">
            역량별로 성장하는
            <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              AI 모의 면접
            </span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted md:mx-0">
            문항 반응 이론(IRT) 기반 적응형 난이도 · 자소서 맞춤 질문 ·
            역량 θ 장기 트래킹
          </p>
          <div className="flex flex-wrap justify-center gap-4 md:justify-start">
            {user ? (
              <Link href="/interview/setup" className="btn-primary">
                면접 시작하기
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link href="/auth/register" className="btn-primary">
                무료로 시작하기
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            <Link href={user ? "/dashboard" : "/auth/login"} className="btn-secondary">
              <BarChart3 className="h-4 w-4" />
              {user ? "내 역량 보기" : "로그인"}
            </Link>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md md:max-w-none">
          <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/20 via-accent/10 to-transparent blur-2xl" />
          <div className="relative overflow-hidden rounded-[1.5rem] border border-card-border shadow-luxe">
            <Image
              src="https://images.unsplash.com/photo-1568992688065-536aad8a12f6?auto=format&fit=crop&w=1200&q=80"
              alt="면접을 준비하는 사람들"
              width={1200}
              height={800}
              priority
              className="h-64 w-full object-cover md:h-96"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/40 via-transparent to-transparent" />
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {[
          {
            icon: Mic,
            title: "음성 면접",
            desc: "AI가 질문하고, 답변은 음성으로. 실전과 동일한 흐름",
          },
          {
            icon: Sparkles,
            title: "자소서 맞춤 질문",
            desc: "업로드한 자기소개서를 바탕으로 질문이 개인화됩니다",
          },
          {
            icon: BarChart3,
            title: "역량 트래킹",
            desc: "6개 역량 θ를 차수별로 기록. 성장 곡선을 한눈에",
          },
        ].map(({ icon: Icon, title, desc }, i) => (
          <div key={title} className="card-luxe p-6">
            <div className="mb-4 flex items-center gap-3">
              <span className="badge-step">{i + 1}</span>
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted">{desc}</p>
          </div>
        ))}
      </section>

      <section>
        <p className="text-center text-sm font-medium uppercase tracking-widest text-primary">
          이용 방법
        </p>
        <h2 className="mt-2 text-center text-2xl font-bold text-foreground sm:text-3xl">
          세 단계, 5분이면 충분해요
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {[
            {
              icon: Upload,
              title: "산업·직무 선택 (+자소서 선택)",
              desc: "산업군과 지원 직무를 고르면 질문 톤이 맞춰지고, 자소서를 올리면 첫 질문이 내 이야기에 맞춰 개인화돼요.",
            },
            {
              icon: Layers,
              title: "역량 하나 골라 집중 연습",
              desc: "6개 역량 중 하나씩, 문항 2~3개로 짧게 연습해요. 직무별 추천 역량도 표시돼요.",
            },
            {
              icon: PlayCircle,
              title: "음성으로 답하고 리포트 받기",
              desc: "실시간으로 난이도가 조정되고, 끝나면 강점·개선점·다시 써보는 예시까지 담긴 피드백이 나와요.",
            },
          ].map(({ icon: Icon, title, desc }, i) => (
            <div key={title} className="card-luxe p-6 text-center">
              <div className="mx-auto mb-4 flex items-center justify-center gap-2">
                <span className="badge-step">{i + 1}</span>
              </div>
              <Icon className="mx-auto mb-3 h-7 w-7 text-primary" />
              <h3 className="mb-2 font-semibold text-foreground">{title}</h3>
              <p className="text-sm text-muted">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <p className="text-center text-sm font-medium uppercase tracking-widest text-primary">
          NCS 직업기초능력 기반
        </p>
        <h2 className="mt-2 text-center text-2xl font-bold text-foreground sm:text-3xl">
          역량 6개, 전부 다뤄요
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted">
          어떤 산업·직무를 고르든 모든 역량이 공통 평가 대상이에요. 산업·직무에 따라
          특히 중요한 역량은 화면에서 추천으로만 표시돼요.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {COMPETENCY_CODES.map((code) => {
            const Icon = COMPETENCY_ICONS[code] ?? Sparkles;
            return (
              <div key={code} className="card-luxe p-5">
                <Icon className="mb-3 h-6 w-6 text-accent" />
                <h3 className="mb-1 font-semibold text-foreground">
                  {competencyLabel(code)}
                </h3>
                <p className="text-sm text-muted">{COMPETENCY_DESC[code]}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-2xl">
        <p className="text-center text-sm font-medium uppercase tracking-widest text-primary">
          자주 묻는 질문
        </p>
        <h2 className="mt-2 mb-8 text-center text-2xl font-bold text-foreground sm:text-3xl">
          궁금하신 점이 있으신가요?
        </h2>
        <div className="space-y-3">
          {FAQS.map(({ q, a }) => (
            <details key={q} className="card-luxe group p-5 open:pb-5">
              <summary className="cursor-pointer list-none font-medium text-foreground marker:content-none">
                <span className="flex items-center justify-between gap-3">
                  {q}
                  <span className="shrink-0 text-primary transition group-open:rotate-45">
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="band-periwinkle px-6 py-14 text-center sm:px-10">
        <h2 className="text-2xl font-bold sm:text-3xl">다음 면접, 미리 겪어보세요</h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-white/90">
          역량별 2~3문항, 5분이면 첫 피드백을 받아볼 수 있어요.
        </p>
        <div className="mt-6">
          {user ? (
            <Link
              href="/interview/setup"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-primary transition hover:bg-white/90"
            >
              면접 시작하기
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-primary transition hover:bg-white/90"
            >
              무료로 시작하기
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
