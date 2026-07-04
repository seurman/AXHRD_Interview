/**
 * 비밀번호 해싱 — 로그인/회원가입 API 전용 (페이지 번들에서 분리)
 */
import { compareSync, hashSync } from "bcryptjs";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizePassword(password: string) {
  return password.trim();
}

export function hashPassword(password: string) {
  return hashSync(normalizePassword(password), 12);
}

export function verifyPassword(password: string, hash: string) {
  return compareSync(normalizePassword(password), hash);
}
