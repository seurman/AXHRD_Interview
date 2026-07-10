import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const html = readFileSync("tmp-saramin-view.html", "utf8");
const start = html.indexOf('<div class="wrap_jv_cont">');
const end = html.indexOf('<div class="jview_wing"');
if (start < 0 || end <= start) throw new Error("fixture anchors not found");

const dir = join("src", "lib", "company", "fixtures");
mkdirSync(dir, { recursive: true });
const snippet = `<html><head><title>[(주)켐트로닉스] 반도체 채용</title><meta name="description" content="반도체소재 신입 경력 채용" /></head><body><div class="major recruit"><span>지역별</span><span>직업별</span><span>역세권별</span></div>${html.slice(start, end)}</body></html>`;
writeFileSync(join(dir, "saramin-view-snippet.html"), snippet);
console.log("wrote", snippet.length, "bytes");
