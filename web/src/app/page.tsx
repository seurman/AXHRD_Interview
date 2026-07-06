import Link from "next/link";
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
import { Reveal } from "@/components/ui/Reveal";

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
    q: "제 답변이나 개인정보는 어떻게 쓰이나요?",
    a: "자기소개서·답변 내용은 질문 생성과 채점에만 사용되고, 기관 대시보드에는 개인 답변 원문 없이 점수·완료 현황만 집계됩니다.",
  },
];

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div className="space-y-24">
      <section className="mesh-bg -mx-4 rounded-[2rem] px-6 py-20 text-center sm:-mx-6 sm:px-10 md:py-28">
        <div className="relative">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.3em] text-primary">
            AXHRD Interview
          </p>
          <h1 className="mx-auto max-w-4xl text-5xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            채용 AI 시대,
            <br />
            <span className="text-primary">정직하게 준비하는 면접</span>
          </h1>
          <p className="mx-auto mt-8 max-w-xl text-lg text-muted">
            모의면접부터 역량 성장 트래킹, 대학·기관 코호트 관리까지 — NCS
            직업기초능력 기준으로 준비하는 하나의 플랫폼
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link href="/demo" className="btn-primary px-8 py-4 text-base">
              데모 체험하기
              <ArrowRight className="h-4 w-4" />
            </Link>
            {user ? (
              <Link href="/dashboard" className="btn-secondary px-8 py-4 text-base">
                내 역량 보기
              </Link>
            ) : (
              <Link href="/auth/register" className="btn-secondary px-8 py-4 text-base">
                지금 시작하기
              </Link>
            )}
          </div>

          <div className="mx-auto mt-14 flex max-w-lg flex-wrap justify-center gap-3">
            {["IRT 적응형 난이도", "NCS 6개 역량", "대학·기관 코호트"].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-card-border bg-white/80 px-4 py-2 text-xs font-medium text-muted shadow-luxe backdrop-blur"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section>
        <Reveal className="text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">
            하나의 플랫폼, 취업 준비 전 과정
          </p>
          <h2 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">
            면접 연습부터 성장 기록까지
          </h2>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:auto-rows-[160px]">
          <Reveal delay={0.05} className="lg:col-span-2 lg:row-span-2">
            <div className="card-luxe flex h-full flex-col justify-between p-8">
              <Mic className="h-9 w-9 text-primary" />
              <div>
                <h3 className="mb-2 text-xl font-semibold text-foreground">
                  AI 모의면접
                </h3>
                <p className="text-sm text-muted">
                  IRT(문항반응이론) 기반으로 내 실력에 맞춰 난이도가 자동
                  조정되는 음성 면접. 자소서·JD를 반영해 첫 질문부터
                  개인화됩니다.
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="card-luxe flex h-full flex-col justify-between p-6">
              <BarChart3 className="h-7 w-7 text-accent" />
              <div>
                <h3 className="mb-1 font-semibold text-foreground">역량 성장 트래킹</h3>
                <p className="text-sm text-muted">6개 역량 θ를 차수별로 기록</p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="card-luxe flex h-full flex-col justify-between p-6">
              <FileText className="h-7 w-7 text-accent" />
              <div>
                <h3 className="mb-1 font-semibold text-foreground">자소서 · JD 맞춤</h3>
                <p className="text-sm text-muted">회사·직무에 맞는 질문 톤</p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="card-luxe flex h-full flex-col justify-between p-6">
              <Wand2 className="h-7 w-7 text-accent" />
              <div>
                <h3 className="mb-1 font-semibold text-foreground">지원자 페르소나</h3>
                <p className="text-sm text-muted">롤모델 페르소나 매칭</p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.25}>
            <div className="card-luxe flex h-full flex-col justify-between p-6">
              <Repeat className="h-7 w-7 text-accent" />
              <div>
                <h3 className="mb-1 font-semibold text-foreground">스와이프 연습</h3>
                <p className="text-sm text-muted">실전 기출 카드 반복 연습</p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.3} className="lg:col-span-2">
            <div className="card-luxe flex h-full items-center gap-5 p-6">
              <Users className="h-9 w-9 shrink-0 text-primary" />
              <div>
                <h3 className="mb-1 font-semibold text-foreground">
                  대학·기관 코호트 대시보드
                </h3>
                <p className="text-sm text-muted">
                  취업센터 담당자용 — 소속 학생 현황과 역량별 평균을 개인정보
                  없이 집계
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <Reveal>
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
      </Reveal>

      <section className="mx-auto max-w-2xl">
        <Reveal className="text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">
            자주 묻는 질문
          </p>
          <h2 className="mt-2 mb-8 text-3xl font-bold text-foreground">
            궁금하신 점이 있으신가요?
          </h2>
        </Reveal>
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

      <Reveal>
        <section className="mesh-bg -mx-4 rounded-[2rem] px-6 py-20 text-center sm:-mx-6 sm:px-10">
          <h2 className="mx-auto max-w-2xl text-4xl font-extrabold leading-tight text-foreground sm:text-5xl">
            직접 체험해보세요
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm text-muted">
            역량별 2~3문항, 5분이면 첫 피드백을 받아볼 수 있어요.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/demo" className="btn-primary px-8 py-4 text-base">
              데모 체험하기
              <ArrowRight className="h-4 w-4" />
            </Link>
            {!user && (
              <Link href="/auth/register" className="btn-secondary px-8 py-4 text-base">
                지금 시작하기
              </Link>
            )}
          </div>
        </section>
      </Reveal>
    </div>
  );
}
