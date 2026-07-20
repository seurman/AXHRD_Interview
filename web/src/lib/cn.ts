import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** className 병합 — clsx + tailwind-merge (shadcn aliases.utils = @/lib/cn) */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
