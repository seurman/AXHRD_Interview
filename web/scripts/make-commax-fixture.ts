import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const html = readFileSync("tmp-commax.html", "utf8");
const start = html.indexOf('<div class="wrap_jv_cont">');
const end = html.indexOf('<div class="jview_wing"');
if (start < 0 || end <= start) throw new Error("fixture anchors not found");

const dir = join("src", "lib", "company", "fixtures");
mkdirSync(dir, { recursive: true });
const snippet = `<html><head><title>[(주)코맥스] 영업 채용</title><meta name="description" content="코맥스 영업 제조기술 채용" /></head><body>${html.slice(start, end)}</body></html>`;
writeFileSync(join(dir, "saramin-commax-snippet.html"), snippet);
console.log("wrote", snippet.length, "bytes");
