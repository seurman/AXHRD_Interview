import { cookies } from "next/headers";
import { DEFAULT_THEME, THEME_COOKIE, type Theme } from "./types";

export async function getTheme(): Promise<Theme> {
  const jar = await cookies();
  const value = jar.get(THEME_COOKIE)?.value;
  if (value === "light" || value === "dark" || value === "system") return value;
  return DEFAULT_THEME;
}
