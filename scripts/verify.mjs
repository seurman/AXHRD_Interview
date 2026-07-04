#!/usr/bin/env node
/**
 * HR_IN Solution — 자동 환경 검증
 * 사용: node scripts/verify.mjs
 *       node scripts/verify.mjs --start   (부족한 서비스 자동 기동)
 *       node scripts/verify.mjs --fix     (venv, npm install 등 자동 수리)
 */

import { execSync, spawn } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import http from "http";
import net from "net";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const WEB = join(ROOT, "web");
const IRT = join(ROOT, "services", "irt-engine");

const args = process.argv.slice(2);
const AUTO_START = args.includes("--start");
const AUTO_FIX = args.includes("--fix") || args.includes("--start");

const results = [];

function ok(name, detail = "") {
  results.push({ name, pass: true, detail });
  console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "", hint = "") {
  results.push({ name, pass: false, detail, hint });
  console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
  if (hint) console.log(`     💡 ${hint}`);
}

function warn(name, detail = "") {
  console.log(`  ⚠️  ${name}${detail ? ` — ${detail}` : ""}`);
}

function run(cmd, opts = {}) {
  return execSync(cmd, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    cwd: opts.cwd || ROOT,
    ...opts,
  }).trim();
}

function tryRun(cmd, opts = {}) {
  try {
    return run(cmd, opts);
  } catch {
    return null;
  }
}

function httpGet(url, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ ok: res.statusCode === 200, status: res.statusCode, body }));
    });
    req.on("error", () => resolve({ ok: false }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false });
    });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function checkPort(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const s = net.createConnection({ port, host });
    s.setTimeout(2000);
    s.on("connect", () => {
      s.end();
      resolve(true);
    });
    s.on("error", () => resolve(false));
    s.on("timeout", () => {
      s.destroy();
      resolve(false);
    });
  });
}

function startDetached(cmd, cwd) {
  if (process.platform === "win32") {
    // start 제목에 공백이 있으면 Windows가 명령으로 오인함 → 빈 제목 사용
    spawn("cmd", ["/c", "start", '""', "cmd", "/k", cmd], {
      cwd,
      detached: true,
      stdio: "ignore",
    }).unref();
  } else {
    spawn("sh", ["-c", cmd], { cwd, detached: true, stdio: "ignore" }).unref();
  }
}

// ── Checks ──

console.log("\n🔍 HR_IN Solution 환경 검증");
console.log(`   Root: ${ROOT}\n`);

// 1. Project structure
console.log("📁 프로젝트");
if (existsSync(join(WEB, "package.json"))) ok("web/package.json");
else fail("web/package.json", "없음", "프로젝트 경로 확인");

if (existsSync(join(IRT, "app", "main.py"))) ok("IRT 엔진 소스");
else fail("IRT 엔진", "services/irt-engine 없음");

if (existsSync(join(ROOT, "seed", "questions.json"))) ok("문항 시드");
else fail("seed/questions.json", "없음");

// 2. Env
console.log("\n🔐 환경 변수");
if (existsSync(join(WEB, ".env"))) ok("web/.env");
else {
  if (AUTO_FIX && existsSync(join(ROOT, ".env.example"))) {
    tryRun(`copy /Y "${join(ROOT, ".env.example")}" "${join(WEB, ".env")}"`, { shell: true });
    if (existsSync(join(WEB, ".env"))) ok("web/.env", "자동 생성됨");
    else fail("web/.env", "없음", "copy .env.example → web\\.env");
  } else fail("web/.env", "없음", "copy .env.example web\\.env");
}

// 3. Node
console.log("\n📦 Node.js");
const nodeVer = tryRun("node -v");
if (nodeVer) ok("Node.js", nodeVer);
else fail("Node.js", "미설치", "https://nodejs.org 설치");

if (existsSync(join(WEB, "node_modules"))) ok("node_modules");
else {
  if (AUTO_FIX && nodeVer) {
    warn("node_modules", "npm install 실행 중...");
    try {
      run("npm install", { cwd: WEB, stdio: "inherit" });
      ok("node_modules", "설치 완료");
    } catch {
      fail("node_modules", "npm install 실패");
    }
  } else fail("node_modules", "없음", "cd web && npm install");
}

if (existsSync(join(WEB, "node_modules", "mammoth"))) ok("mammoth (docx 파서)");
else if (existsSync(join(WEB, "package.json"))) {
  try {
    const pkg = JSON.parse(readFileSync(join(WEB, "package.json"), "utf8"));
    if (pkg.dependencies?.mammoth) ok("mammoth (docx 파서)", "package.json에 선언됨");
    else fail("mammoth", "미설치", "install-resume-parser.cmd 실행");
  } catch {
    fail("mammoth", "미설치", "install-resume-parser.cmd 실행");
  }
} else {
  if (AUTO_FIX && nodeVer) {
    warn("mammoth", "docx/pdf 파서 설치 중...");
    try {
      run("npm install mammoth pdf-parse word-extractor @types/pdf-parse", {
        cwd: WEB,
        stdio: "inherit",
      });
      if (existsSync(join(WEB, "node_modules", "mammoth"))) ok("mammoth", "설치 완료");
      else fail("mammoth", "설치 실패", "install-resume-parser.cmd 실행");
    } catch {
      fail("mammoth", "설치 실패", "D:\\HR_IN_Solution\\install-resume-parser.cmd");
    }
  } else fail("mammoth", "미설치", "install-resume-parser.cmd 실행");
}

// 4. Python + IRT venv
console.log("\n🐍 Python / IRT");
const pyVer = tryRun("py -3 --version") || tryRun("python --version");
if (pyVer) ok("Python", pyVer);
else fail("Python", "미설치", "https://python.org — py -3 또는 PATH 추가");

const venvPython = join(IRT, ".venv", "Scripts", "python.exe");
const venvReady =
  existsSync(venvPython) &&
  existsSync(join(IRT, ".venv", "Scripts", "uvicorn.exe"));

if (venvReady) ok("IRT 가상환경");
else {
  if (AUTO_FIX && pyVer) {
    if (existsSync(venvPython) && !venvReady) {
      warn("IRT venv", "패키지 미설치 — pip install 실행...");
    } else {
      warn("IRT venv", "생성 중...");
      try {
        run("py -3 -m venv .venv", { cwd: IRT, shell: true });
      } catch {
        try {
          run("python -m venv .venv", { cwd: IRT, shell: true });
        } catch {
          fail("IRT venv", "생성 실패", "start-irt.cmd 실행");
        }
      }
    }
    try {
      run(".venv\\Scripts\\pip install -r requirements.txt", { cwd: IRT, shell: true, stdio: "inherit" });
      if (existsSync(join(IRT, ".venv", "Scripts", "uvicorn.exe"))) ok("IRT 가상환경", "준비 완료");
      else fail("IRT venv", "pip install 실패", "start-irt.cmd 실행 — Python 3.14는 numpy 2.3.2+ 필요");
    } catch {
      fail("IRT venv", "pip install 실패", "start-irt.cmd 실행");
    }
  } else fail("IRT venv", "없음", "start-irt.cmd 실행");
}

// 5. Docker (optional)
console.log("\n🐳 Docker (선택 — DB용)");
const dockerClient = tryRun("docker version --format {{.Client.Version}}");
const dockerServer = tryRun("docker version --format {{.Server.Version}}");
if (dockerServer) {
  ok("Docker", `v${dockerServer}`);
  const pg = tryRun('docker ps --filter "name=hr-in-postgres" --format "{{.Status}}"');
  if (pg?.includes("Up")) ok("PostgreSQL 컨테이너", pg);
  else {
    warn("PostgreSQL", "컨테이너 미실행");
    if (AUTO_START) {
      warn("PostgreSQL", "docker compose up -d postgres 시도...");
      try {
        run("docker compose up -d postgres", { cwd: ROOT, stdio: "inherit" });
        await sleep(4000);
        const pg2 = tryRun('docker ps --filter "name=hr-in-postgres" --format "{{.Status}}"');
        if (pg2?.includes("Up")) ok("PostgreSQL", "시작됨");
        else fail("PostgreSQL", "시작 실패", "Docker Desktop 실행 확인");
      } catch {
        fail("PostgreSQL", "Docker 연결 실패", "Docker Desktop 켜기");
      }
    } else {
      fail("PostgreSQL", "미실행", "infra.cmd 또는 Docker Desktop 실행");
    }
  }
} else if (dockerClient) {
  warn("Docker", "설치됨 — Docker Desktop이 꺼져 있음");
  warn("PostgreSQL", "Docker Desktop 실행 후 verify.cmd --start");
} else {
  warn("Docker", "미사용/미설치 — IRT는 로컬 Python으로 실행");
  warn("PostgreSQL", "Docker 없으면 DB 기능 불가 — Docker Desktop 설치 권장");
}

// 6. IRT health
console.log("\n🧠 IRT Engine (8000)");
let irt = await httpGet("http://localhost:8000/api/v1/health");
if (irt.ok) {
  ok("IRT /health", irt.body?.slice(0, 60));
} else {
  fail("IRT /health", "응답 없음");
  if (AUTO_START && existsSync(join(IRT, ".venv", "Scripts", "python.exe"))) {
    warn("IRT", "로컬 IRT 새 창에서 시작...");
    startDetached(
      `cd /d "${IRT}" && .venv\\Scripts\\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000`,
      IRT
    );
    for (let i = 0; i < 20; i++) {
      await sleep(1500);
      irt = await httpGet("http://localhost:8000/api/v1/health");
      if (irt.ok) break;
    }
    if (irt.ok) ok("IRT /health", "자동 시작 성공");
    else fail("IRT", "자동 시작 후에도 실패", "start-irt.cmd 창의 에러 확인");
  } else {
    console.log("     💡 start-irt.cmd 실행 또는: node scripts/verify.mjs --start");
  }
}

// 7. Web (optional)
console.log("\n🌐 Web (3000)");
const web = await httpGet("http://localhost:3000");
if (web.ok) ok("Next.js", `HTTP ${web.status}`);
else warn("Web", "미실행 (dev.cmd 로 시작)");

// 8. Database
console.log("\n🗄️  Database");
if (existsSync(join(WEB, "prisma", "schema.prisma"))) ok("Prisma schema");
const hasMigrations = existsSync(join(WEB, "prisma", "migrations"));
if (hasMigrations) ok("DB migrations");
else warn("migrations", "없음");

const pgOpen = await checkPort(5432);
if (pgOpen) ok("PostgreSQL", "localhost:5432");
else {
  fail("PostgreSQL", "5432 포트 닫힘", "Docker Desktop 실행 후 verify.cmd --start");
}

if (AUTO_FIX && pgOpen && !hasMigrations) {
  warn("DB", "migrate + seed 실행 중...");
  try {
    run("npx prisma migrate dev --name init", { cwd: WEB, stdio: "inherit" });
    run("npm run db:seed", { cwd: WEB, stdio: "inherit" });
    ok("DB seed", "완료");
  } catch {
    fail("DB migrate/seed", "실패");
  }
}

// Summary
console.log("\n" + "═".repeat(50));
const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass);
console.log(`결과: ${passed}/${results.length} 통과`);

if (failed.length === 0) {
  console.log("\n🎉 모든 필수 검증 통과!");
  console.log("   → http://localhost:3000 (dev.cmd)");
  console.log("   → http://localhost:8000/api/v1/health (IRT)");
} else {
  console.log("\n❌ 실패 항목:");
  failed.forEach((f) => {
    console.log(`   • ${f.name}: ${f.detail}`);
    if (f.hint) console.log(`     → ${f.hint}`);
  });
  console.log("\n한 번에 수리+기동:");
  console.log("   verify.cmd --start");
  console.log("   start-all.cmd");
}

console.log("");
process.exit(failed.length > 0 ? 1 : 0);
