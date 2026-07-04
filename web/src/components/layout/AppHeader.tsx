import Link from "next/link";
import { Mic2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { LogoutButton } from "./LogoutButton";

export async function AppHeader() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-card-border bg-card/90 backdrop-blur-md shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-primary">
          <Mic2 className="h-6 w-6 text-gold" />
          <span>HR_IN</span>
          <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-medium text-gold">
            Premium
          </span>
        </Link>
        <nav className="flex items-center gap-5 text-sm text-muted">
          {user ? (
            <>
              <span className="hidden text-foreground sm:inline">{user.name}님</span>
              <Link href="/dashboard" className="hover:text-primary">
                역량 트래킹
              </Link>
              <Link href="/interview/setup" className="hover:text-primary">
                면접 시작
              </Link>
              <Link href="/profile" className="hover:text-primary">
                프로필
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/auth/login" className="hover:text-primary">
                로그인
              </Link>
              <Link
                href="/auth/register"
                className="rounded-lg bg-primary px-3 py-1.5 text-white hover:opacity-90"
              >
                회원가입
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
