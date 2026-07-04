type Mode = "login" | "register";

export async function parseApiResponse(res: Response): Promise<{
  ok: boolean;
  data: Record<string, unknown>;
  message: string;
}> {
  const text = await res.text();
  let data: Record<string, unknown> = {};

  if (text) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      if (res.status >= 500) {
        return {
          ok: false,
          data: {},
          message: "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        };
      }
      return {
        ok: false,
        data: {},
        message: "서버 응답을 처리하지 못했습니다.",
      };
    }
  }

  if (!res.ok) {
    const message =
      typeof data.error === "string"
        ? data.error
        : res.status === 409
          ? "이미 가입된 이메일입니다."
          : "요청에 실패했습니다.";
    return { ok: false, data, message };
  }

  return { ok: true, data, message: "" };
}

export function buildAuthRedirect(
  nextPath: string,
  mode: Mode,
  displayName: string
): string {
  const path = nextPath.startsWith("/") ? nextPath.split("?")[0]! : "/dashboard";
  if (mode !== "register") return nextPath.startsWith("/") ? nextPath : "/dashboard";

  const params = new URLSearchParams({ welcome: "1" });
  if (displayName) params.set("name", displayName);
  return `${path}?${params.toString()}`;
}
