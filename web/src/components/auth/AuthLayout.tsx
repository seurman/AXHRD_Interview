import Image from "next/image";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto grid max-w-4xl items-center gap-8 py-8 md:grid-cols-2 md:py-12">
      <div className="relative order-2 hidden overflow-hidden rounded-[1.5rem] border border-card-border shadow-luxe md:order-1 md:block">
        <Image
          src="https://images.unsplash.com/photo-1573497620053-ea5300f94f21?auto=format&fit=crop&w=1000&q=80"
          alt="면접을 준비하는 지원자"
          width={1000}
          height={1333}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-primary/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 text-white">
          <p className="text-lg font-semibold">실전처럼 준비하세요</p>
          <p className="mt-1 text-sm text-white/80">
            IRT 기반 적응형 질문으로 역량을 정확히 진단합니다
          </p>
        </div>
      </div>

      <div className="order-1 md:order-2">{children}</div>
    </div>
  );
}
