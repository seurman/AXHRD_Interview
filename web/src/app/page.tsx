import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BarChart3, Mic, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div className="space-y-16">
      <section className="grid items-center gap-10 py-6 md:grid-cols-2 md:py-12">
        <div className="text-center md:text-left">
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-primary">
            IRT Adaptive Learning
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
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="card-luxe p-6">
            <Icon className="mb-4 h-8 w-8 text-primary" />
            <h3 className="mb-2 font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted">{desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
