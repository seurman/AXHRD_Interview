import { randomInt } from "crypto";

// 혼동하기 쉬운 문자(0/O, 1/I/L) 제외 — 학생이 手입력할 때 오타 줄이기 위함
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** 기관 가입 코드 생성 (예: "7QK3-N2XP") */
export function generateJoinCode(): string {
  const chars = Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}
