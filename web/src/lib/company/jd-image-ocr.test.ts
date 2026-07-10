import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { htmlToPlainText } from "./fetch-jd-url";
import {
  applyOcrToDetailSection,
  extractRecruitImageUrls,
  isAllowedJdImageHost,
  resolveRecruitImageUrl,
  shouldOcrJdHtml,
} from "./jd-image-ocr";

const commaxFixturePath = join(__dirname, "fixtures", "saramin-commax-snippet.html");
const chemtronicsFixturePath = join(__dirname, "fixtures", "saramin-view-snippet.html");

describe("jd-image-ocr helpers", () => {
  it("resolves protocol-relative Saramin image URLs", () => {
    expect(resolveRecruitImageUrl("//www.saraminimage.co.kr/recruit/foo.png")).toBe(
      "https://www.saraminimage.co.kr/recruit/foo.png",
    );
  });

  it("allows only Saramin image hosts", () => {
    expect(isAllowedJdImageHost("www.saraminimage.co.kr")).toBe(true);
    expect(isAllowedJdImageHost("evil.example.com")).toBe(false);
    expect(isAllowedJdImageHost("127.0.0.1")).toBe(false);
  });

  it("extracts recruit image URLs from user_content and ranks them", () => {
    const html = readFileSync(commaxFixturePath, "utf8");
    const urls = extractRecruitImageUrls(html);
    expect(urls.length).toBeGreaterThan(0);
    expect(urls[0]).toMatch(/bbs_recruit26\/42_navienhouse_img/);
    expect(urls.some((u) => /ai_pass|graphic/i.test(u))).toBe(false);
  });

  it("should OCR image-only postings but not HTML-table postings", () => {
    const commaxHtml = readFileSync(commaxFixturePath, "utf8");
    const commaxText = htmlToPlainText(commaxHtml);
    const chemHtml = readFileSync(chemtronicsFixturePath, "utf8");
    const chemText = htmlToPlainText(chemHtml);

    const prev = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = "test-key";
    try {
      expect(shouldOcrJdHtml(commaxHtml, commaxText)).toBe(true);
      expect(shouldOcrJdHtml(chemHtml, chemText)).toBe(false);
    } finally {
      if (prev === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = prev;
    }
  });

  it("respects JD_IMAGE_OCR=0 opt-out", () => {
    const html = readFileSync(commaxFixturePath, "utf8");
    const text = htmlToPlainText(html);
    const prevKey = process.env.GEMINI_API_KEY;
    const prevOcr = process.env.JD_IMAGE_OCR;
    process.env.GEMINI_API_KEY = "test-key";
    process.env.JD_IMAGE_OCR = "0";
    try {
      expect(shouldOcrJdHtml(html, text)).toBe(false);
    } finally {
      if (prevKey === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = prevKey;
      if (prevOcr === undefined) delete process.env.JD_IMAGE_OCR;
      else process.env.JD_IMAGE_OCR = prevOcr;
    }
  });
});

describe("applyOcrToDetailSection", () => {
  it("replaces image-only 상세요강 section with OCR text", () => {
    const html = readFileSync(commaxFixturePath, "utf8");
    const text = htmlToPlainText(html);
    const ocrText = "모집분야: 신입·경력\n담당업무: 영업 및 마케팅\n자격요건: 대졸 이상\n근무조건: 정규직";

    const enriched = applyOcrToDetailSection(text, ocrText);
    expect(enriched).toContain("모집분야: 신입·경력");
    expect(enriched).toContain("담당업무: 영업 및 마케팅");
    expect(enriched).not.toMatch(/이미지 공고로 제공되어/);
    expect(enriched).toMatch(/## 접수기간 및 방법/);
  });
});
