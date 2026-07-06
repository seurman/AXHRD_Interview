import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BarChart3,
  Mic,
  FileText,
  Wand2,
  Repeat,
  Users,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";

const TOOLKIT = [
  {
    icon: Mic,
    title: "AI 모의면접",
    desc: "IRT(문항반응이론) 기반으로 내 실력에 맞춰 난이도가 자동 조정되는 음성 면접",
  },
  {
    icon: BarChart3,
    title: "역량 성장 트래킹",
    desc: "NCS 직업기초능력 6개를 차수별 θ로 기록해 성장 곡선을 한눈에 확인",
  },
  {
    icon: FileText,
    title: "자소서 · JD 맞춤 질문",
    desc: "자기소개서와 채용공고를 반영해 이 회사·직무에 맞는 질문과 톤으로 조정",
  },
  {
    icon: Wand2,
    title: "지원자 페르소나",
    desc: "산업·직무를 고르면 내가 면접관에게 어떻게 보이고 싶은지 롤모델 페르소나로 매칭",
  },
  {
    icon: Repeat,
    title: "실전 질문 스와이프 연습",
    desc: "짧게, 자주 — 관심 산업·직무의 실제 기출 질문 카드를 넘기며 반복 연습",
  },
  {
    icon: Users,
    title: "대학·기관 코호트 대시보드",
    desc: "취업센터 담당자용 — 소속 학생 현황과 역량별 평균을 개인정보 없이 집계",
  },
];

const FAQS = [
  {
    q: "다른 취업/면접 준비 사이트와 뭐가 다른가요?",
    a: "감정·표정 AI로 사람을 평가하지 않고, 자체 개발 문항으로 법적 리스크 없이, 채점 기준은 어떤 상황에서도 흔들리지 않게 설계했어요. 감정분석·평판예측 같은 근거 부족한 지표는 의도적으로 넣지 않았습니다.",
  },
  {
    q: "대학교나 취업센터인데, 학생들에게 어떻게 도입하나요?",
    a: "기관 담당자가 가입 코드를 발급하면 학생들이 그 코드로 소속을 연결해요. 담당자는 개인 답변 원문 없이 완료 현황·역량별 평균만 볼 수 있어 프라이버시가 보장됩니다.",
  },
  {
    q: "무료인가요?",
    a: "네, 별도 유료 결제 없이 이용할 수 있습니다.",
  },
  {
    q: "제 답변이나 개인정보는 어떻게 쓰이나요?",
    a: "자기소개서·답변 내용은 질문 생성과 채점에만 사용되고, 기관 대시보드에는 개인 답변 원문 없이 점수·완료 현황만 집계됩니다.",
  },
];

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div className="space-y-16">
      <section className="grid items-center gap-10 py-6 md:grid-cols-2 md:py-12">
        <div className="text-center md:text-left">
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-primary">
            AXHRD Interview
          </p>
          <h1 className="mb-6 text-4xl font-bold leading-tight text-foreground md:text-5xl">
            채용 AI 시대,
            <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              정직하게 준비하는 면접
            </span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted md:mx-0">
            모의면접부터 역량 성장 트래킹, 대학·기관 코호트 관리까지 — NCS
            직업기초능력 기준으로 준비하는 하나의 플랫폼
          </p>
          <div className="flex flex-wrap justify-center gap-4 md:justify-start">
            <Link href="/demo" className="btn-primary">
              데모 체험하기
              <ArrowRight className="h-4 w-4" />
            </Link>
            {user ? (
              <Link href="/dashboard" className="btn-secondary">
                <BarChart3 className="h-4 w-4" />
                내 역량 보기
              </Link>
            ) : (
              <Link href="/auth/register" className="btn-secondary">
                무료로 시작하기
              </Link>
            )}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md md:max-w-none">
          <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/20 via-accent/10 to-transparent blur-2xl" />
          <div className="relative overflow-hidden rounded-[1.5rem] border border-card-border shadow-luxe">
            <Image
              src="https://images.unsplash.com/photo-1573497620053-ea5300f94f21?auto=format&fit=crop&w=1200&q=80"
              alt="취업을 준비하는 사람"
              width={1200}
              height={800}
              priority
              className="h-64 w-full object-cover md:h-96"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/40 via-transparent to-transparent" />
          </div>
        </div>
      </section>

      <section>
        <p className="text-center text-sm font-medium uppercase tracking-widest text-primary">
          하나의 플랫폼, 취업 준비 전 과정
        </p>
        <h2 className="mt-2 text-center text-2xl font-bold text-foreground sm:text-3xl">
          면접 연습부터 성장 기록까지
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLKIT.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card-luxe p-6">
              <Icon className="mb-4 h-7 w-7 text-primary" />
              <h3 className="mb-2 font-semibold text-foreground">{title}</h3>
              <p className="text-sm text-muted">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="band-periwinkle px-6 py-12 text-center sm:px-10">
        <p className="text-sm font-medium uppercase tracking-widest text-white/80">
          왜 AXHRD Interview인가
        </p>
        <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
          채용 AI 규제 시대에 맞는 정직한 면접 연습
        </h2>
        <div className="mt-8 grid gap-4 text-left sm:grid-cols-3">
          {[
            {
              title: "감정·표정 AI 미구현",
              desc: "영상·음성으로 감정을 추론하지 않습니다. 텍스트·음성 STT와 루브릭 채점만 사용해요.",
            },
            {
              title: "자체 문항 · 특허 리스크 회피",
              desc: "타사 문항 DB를 쓰지 않는 자체 개발 문항 + LLM 개인화로 법적 리스크를 피했어요.",
            },
            {
              title: "채점은 페르소나 영향 없음",
              desc: "압박 강도·말투가 달라져도 채점 기준은 절대 흔들리지 않아 세션 간 비교가 가능해요.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl bg-white/95 p-5 text-foreground shadow-luxe">
              <p className="font-semibold">{item.title}</p>
              <p className="mt-2 text-sm text-muted">{item.desc}</p>
            </div>
          ))}
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
        <h2 className="text-2xl font-bold sm:text-3xl">직접 체험해보세요</h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-white/90">
          역량별 2~3문항, 5분이면 첫 피드백을 받아볼 수 있어요.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-primary transition hover:bg-white/90"
          >
            데모 체험하기
            <ArrowRight className="h-4 w-4" />
          </Link>
          {!user && (
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 rounded-full border border-white/60 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              무료로 시작하기
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
