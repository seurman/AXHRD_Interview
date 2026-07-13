import { readFileSync } from "fs";

const path = process.argv[2];
if (!path) {
  console.error("Usage: npx tsx scripts/extract-docx.ts <file.docx>");
  process.exit(1);
}

async function main() {
  const { default: JSZip } = await import("jszip");
  const buf = readFileSync(path);
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file("word/document.xml")!.async("string");
  const paras = xml
    .split(/<w:p[\s>]/)
    .slice(1)
    .map((chunk) => {
      const parts = [...chunk.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]);
      return parts.join("");
    })
    .filter((p) => p.trim());

  console.log("PARAS", paras.length);
  for (let i = 0; i < paras.length; i++) {
    console.log(`${String(i + 1).padStart(3, "0")}|${paras[i]}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
