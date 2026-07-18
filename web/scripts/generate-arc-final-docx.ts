/**
 * ARC Index 최종본 Word 문서 생성
 * Usage: npx tsx scripts/generate-arc-final-docx.ts
 */
import fs from "fs";
import path from "path";
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  LevelFormat,
} from "docx";
import { ARC_INDEX_SEED, type SeedItem, type SeedSection } from "../prisma/seed/arc-index-data";

const OUT = path.resolve(
  __dirname,
  "../../docs/arc-index/ARC_Index_최종본_설문_및_분석매뉴얼_2026-07-15.docx",
);

function p(text: string, opts: { bold?: boolean; size?: number; color?: string } = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({
        text,
        bold: opts.bold,
        size: opts.size ?? 20,
        font: "맑은 고딕",
        color: opts.color,
      }),
    ],
  });
}

function h1(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200 },
    children: [new TextRun({ text, bold: true, size: 28, font: "맑은 고딕" })],
  });
}

function h2(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 140 },
    children: [new TextRun({ text, bold: true, size: 24, font: "맑은 고딕" })],
  });
}

function h3(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, bold: true, size: 22, font: "맑은 고딕" })],
  });
}

function bullet(text: string) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 80 },
    children: [new TextRun({ text, size: 20, font: "맑은 고딕" })],
  });
}

function cell(text: string, opts: { bold?: boolean; width?: number; shade?: string } = {}) {
  return new TableCell({
    width: { size: opts.width ?? 2400, type: WidthType.DXA },
    shading: opts.shade ? { type: "clear", fill: opts.shade } : undefined,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
    },
    children: [
      new Paragraph({
        children: [
          new TextRun({ text, bold: opts.bold, size: 18, font: "맑은 고딕" }),
        ],
      }),
    ],
  });
}

function scaleLabel(item: SeedItem): string {
  if (item.isDemographic) return `선택형 (${(item.choiceOptions ?? []).join(" / ")})`;
  if (item.scaleType === "OPEN_TEXT") return "주관식";
  if (item.scaleType === "RETRO_CHANGE_5") return "5점 후향변화";
  if (item.scaleType === "SPEED_5") return "5점 속도";
  const dual = item.hasImportanceAxis ? " · 현재+중요도" : " · 현재만";
  const rev = item.isReversed ? " · 역문항" : "";
  return `5점 동의${dual}${rev}`;
}

function countItems(seed: typeof ARC_INDEX_SEED) {
  let dm = 0;
  let likert = 0;
  let imp = 0;
  let oe = 0;
  for (const sec of seed.sections as SeedSection[]) {
    for (const it of sec.directItems ?? []) {
      if (it.isDemographic) dm++;
      else if (it.scaleType === "OPEN_TEXT") oe++;
      else {
        likert++;
        if (it.hasImportanceAxis) imp++;
      }
    }
    for (const sub of sec.subscales) {
      for (const it of sub.items) {
        if (it.scaleType === "OPEN_TEXT") oe++;
        else {
          likert++;
          if (it.hasImportanceAxis) imp++;
        }
      }
    }
  }
  return { dm, likert, imp, oe, total: dm + likert + oe };
}

function surveySection(sec: SeedSection): Paragraph[] {
  const out: Paragraph[] = [h2(`${sec.code}. ${sec.nameKo}`)];
  if (sec.directItems?.length) {
    for (const it of sec.directItems) {
      out.push(
        p(`${it.itemCode}  ${it.textKo}`, { bold: true }),
        p(`응답: ${scaleLabel(it)}`),
      );
    }
  }
  for (const sub of sec.subscales) {
    const tag = sub.isDriver ? " [드라이버·중요도]" : "";
    out.push(h3(`${sub.code} — ${sub.nameKo}${tag}`));
    for (const it of sub.items) {
      out.push(
        p(`${it.itemCode}  ${it.textKo}`, { bold: true }),
        p(`응답: ${scaleLabel(it)}`),
      );
    }
  }
  return out;
}

async function main() {
  const c = countItems(ARC_INDEX_SEED);
  const children: Array<Paragraph | Table> = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "ARC Index",
          bold: true,
          size: 40,
          font: "맑은 고딕",
          color: "1a365d",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: "조직진단 최종본 설문지 및 분석 화면 활용 매뉴얼",
          bold: true,
          size: 28,
          font: "맑은 고딕",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: `버전 ${ARC_INDEX_SEED.instrument.version} · 예상 ${ARC_INDEX_SEED.instrument.estimatedMinutes}분 · 작성일 2026-07-15`,
          size: 20,
          font: "맑은 고딕",
          color: "666666",
        }),
      ],
    }),

    h1("0. 문서 안내"),
    p(
      "본 문서는 ARC Index 통합 조직진단의 최종 설문 문항과, 분석 화면을 조직개발(OD)·조직변화 관점에서 어떻게 읽고 개입에 쓰는지를 정리한 실무 매뉴얼입니다.",
    ),
    p("목적: 조직개발. 개인 평가·인사 처분에 사용하지 않습니다."),
    p("익명: 완전 익명. 집단(팀 등) N < 5이면 결과를 공개하지 않습니다."),
    p(
      `문항 구성(중요도 이중응답도 1문항으로 집계): Likert ${c.likert}(그중 중요도 ${c.imp}) + 주관식 ${c.oe} + DM ${c.dm} = 총 ${c.total}문항.`,
    ),

    h1("1. 왜 4축인가 — OD·변화 연계"),
    p(
      "ARC는 ‘만족도 설문’이 아니라 변화 개입을 설계하기 위한 진단입니다. 네 축은 서로 다른 OD 질문에 답합니다.",
    ),
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [1400, 2800, 5160],
      rows: [
        new TableRow({
          children: [
            cell("축", { bold: true, shade: "E8EEF7", width: 1400 }),
            cell("OD 질문", { bold: true, shade: "E8EEF7", width: 2800 }),
            cell("이론·개입 함의", { bold: true, shade: "E8EEF7", width: 5160 }),
          ],
        }),
        new TableRow({
          children: [
            cell("OHI", { bold: true, width: 1400 }),
            cell("지금 건강한가?", { width: 2800 }),
            cell("UWES 몰입 · 심리안전 · Burke-Litwin 실천 → IPA로 레버 선택", { width: 5160 }),
          ],
        }),
        new TableRow({
          children: [
            cell("ORI", { bold: true, width: 1400 }),
            cell("미래에 준비됐나?", { width: 2800 }),
            cell("Lewin 해빙 · ADKAR · AI 거버넌스/역량 → 전환 선행조건", { width: 5160 }),
          ],
        }),
        new TableRow({
          children: [
            cell("OVI", { bold: true, width: 1400 }),
            cell("실제로 얼마나 빨리 가나?", { width: 2800 }),
            cell("6개월 속도(유량) · Kotter 단기성과 · Dynamic Congruence", { width: 5160 }),
          ],
        }),
        new TableRow({
          children: [
            cell("OAI", { bold: true, width: 1400 }),
            cell("올바른 방향인가?", { width: 2800 }),
            cell("전략정렬 · 에너지 방향 · 결과 수렴 · 이중루프 학습", { width: 5160 }),
          ],
        }),
      ],
    }),
    p(
      "OVI와 OAI는 합치지 않습니다. ‘빠르다’와 ‘맞다’는 다른 문제이며, 빠른 오류(건강·빠른데 방향 어긋남)를 잡으려면 두 축이 모두 필요합니다.",
    ),

    h1("2. 설문 응답 안내 (응답자용)"),
    bullet("5점 동의: ①전혀 그렇지 않다 ~ ⑤매우 그렇다"),
    bullet("드라이버 문항만 [현재 수준]과 [중요도(기대)]를 함께 응답합니다. 갭 = 중요도 − 현재."),
    bullet("후향변화(OVI 일부): 지난 6개월과 비교한 개선·악화."),
    bullet("★ 역문항: 낮은 점수가 더 건강한 상태(문서에 표시된 경우)."),
    bullet("주관식: 테마 분석(LDA/요악)에 사용. 개인 식별 정보는 적지 마세요."),

    h1("3. 최종 설문 문항"),
  ];

  for (const sec of ARC_INDEX_SEED.sections) {
    children.push(...surveySection(sec));
  }

  children.push(
    h1("4. 분석 화면 활용 매뉴얼 — 조직진단·변화 관점"),
    p(
      "이 장의 목적은 ‘숫자 화면이 왜 있는지’를 OD 언어로 설명하는 것입니다. 각 화면은 진단 → 해석 → 개입 우선순위 → 추적의 루프에 대응하는 장치가 있습니다.",
    ),

    h2("4-1. 종합 대시보드 (4축 타일 · 핵심 발견 · 처방)"),
    h3("화면에 나오는 것"),
    bullet("OHI / ORI / OVI / OAI 종합 점수와 밴드(탁월·양호·보통·주의 등)"),
    bullet("Risk Index · 고위험 패턴 · IPA 상위 드라이버 · 처방 Top N"),
    h3("왜 필요한가 (OD)"),
    p(
      "변화 착수 전 ‘한 페이지 진단’이 없으면, 경영진·TF가 서로 다른 문제(번아웃 vs 준비부족 vs 속도 vs 방향)를 동시에 주장하며 의제가 분산됩니다. 4축 타일은 ‘어느 병이 우선인가’를 공통화합니다.",
    ),
    h3("어떻게 쓰는가"),
    bullet("1) 밴드가 ‘주의’인 축을 먼저 적시한다."),
    bullet("2) Risk가 높으면(SEC03·활력·HV) 인력·심리 안전 개입을 속도 프로젝트보다 앞에 둔다."),
    bullet("3) 처방 카드는 ‘다음 90일 실험 1~3개’로 번역한다. 보고용 문구로만 끝내지 않는다."),
    bullet("4) Wave 2 목표를 처방에서 뽑은 지표(예: PS 향상, Opp 갭 축소)로 고정한다."),

    h2("4-2. OHI 화면 — 현재 건강 · 드라이버 · IPA"),
    h3("화면에 나오는 것"),
    bullet("SE(활력·헌신·몰두), BO(행동), TL(팀 리더십 3축)"),
    bullet("9개 드라이버 현재·중요도 · IPA FOCUS/MAINTAIN"),
    bullet("Risk Index, (조건부) LPA·ICC"),
    h3("왜 필요한가"),
    p(
      "OD의 핵심은 ‘무엇을 고칠지’입니다. 드라이버 없이 SE만 보면 ‘몰입이 낮다’로 끝나 교육만 양산됩니다. IPA는 SE를 끌어올리는 실천 영역(심리안전·상사·공정성 등)을 데이터로 좁혀, 자원 배분 우선순위를 만듭니다.",
    ),
    h3("변화 개입 연결"),
    bullet("FOCUS + 현재 낮음 → 팀 단위 워크숍·리더 코칭·제도 파일럿 대상."),
    bullet("MAINTAIN → 이미 강점. 과투자하지 말고 유지·전파."),
    bullet("TL 낮고 ICC 높음 → 문제는 개인이 아니라 ‘팀 기후’. 팀장 계발·팀 세션이 우선."),
    bullet("중요도≫현재 갭 → 구성원이 ‘기대한 만큼 안 되고 있다’는 불일치. 커뮤니케이션만으로 메우기 어렵다."),

    h2("4-3. ORI 화면 — 변화·AX 준비 · Opportunity"),
    h3("화면에 나오는 것"),
    bullet("CD·LA·AXS·AXC, Opportunity(AXA−AXG), AX 성숙도, CD02×CD04 해빙 인사이트"),
    h3("왜 필요한가"),
    p(
      "많은 AI·디지털 전환이 ‘도구 배포’로 시작하다 실패합니다. ORI는 ‘의지·역량·거버넌스·변화긴장’을 분리합니다. Opportunity가 양수면(쓰고 싶은데 구조가 막음) 교육보다 가이드라인·책임구조가 ROI입니다.",
    ),
    h3("변화 개입 연결"),
    bullet("CD02↑ & CD04↑ → 불안만 있는 해빙. 방향(CD01)·지도부 신뢰(CD05)부터."),
    bullet("Opp ≥ +1 → AXG(책임·가이드) 해소 액션."),
    bullet("Opp 음수 → AXA(필요성·가치) 인식부터. 도구 강제 배포 금지."),

    h2("4-4. OVI 화면 — 속도 · 동적 정합성"),
    h3("화면에 나오는 것"),
    bullet("HV·CV·AV, CV01 실행속도, AV−HV 갭, 6개월 체감 주관식"),
    h3("왜 필요한가"),
    p(
      "준비(ORI)가 있어도 실행이 느리면 신뢰가 무너집니다. OVI는 ‘말이 현장이 되는 속도’입니다. AV만 빠르고 HV가 낮으면(동정합 +) 번아웃·과속 위험이므로 건강 회복과 AX 확산을 동시에 조절해야 합니다.",
    ),
    h3("변화 개입 연결"),
    bullet("CV01 낮음 → 의사결정·승인 병목 지도(어디서 멈추는가)."),
    bullet("AV−HV 큰 양수 → 속도 조절·심리안전·업무량(WE) 병행."),
    bullet("AV−HV 큰 음수 → 역량은 있는데 전환 느림 → 파일럿·인정체계."),

    h2("4-5. OAI 화면 — 방향 정렬 · 4축 패턴"),
    h3("화면에 나오는 것"),
    bullet("SA·EA·OA(가중 40/35/25), 전략–시간 괴리(SA02), 4축 패턴 메시지"),
    h3("왜 필요한가"),
    p(
      "열심히·빠른데 결과가 어긋나면 ‘변화 피로’만 남습니다. OAI는 전략–에너지–측정KPI 정렬을 봅니다. ‘빠른 오류’ 패턴(OHI·OVI↑ OAI↓)은 활동량 축소를 요구하는 신호입니다.",
    ),
    h3("변화 개입 연결"),
    bullet("SA02 낮음 → 우선순위 재선언·회의/KPI 정리(일 줄이기)."),
    bullet("EA 낮음 → 행정·보고 누수 점검(에너지를 전략으로 돌리기)."),
    bullet("OA06 낮음 → 지표가 잘못된 행동을 유도 중. KPI 재설계."),

    h2("4-6. 조직 BI · 드릴다운 · Gap 매트릭스"),
    h3("화면에 나오는 것"),
    bullet("사업본부→사업부→팀 롤업, 벤치(전사/상위/동급) 대비 Δ"),
    bullet("팀 Gap(ORI×OVI 사분면), 드라이버 팀간 σ"),
    h3("왜 필요한가"),
    p(
      "전사 평균은 ‘어디에 개입할지’를 숨깁니다. 위기 사분면 팀만 집중해야 OD 자원이 납니다. N<5 비공개는 익명·보복 공포를 막는 OD 윤리 장치입니다.",
    ),
    h3("변화 개입 연결"),
    bullet("CRISIS(준비↓ 속도↓) → 안정·심리안전 우선, 대형 전환 보류."),
    bullet("NEGATIVE_GAP(준비↑ 속도↓) → 실행 병목 집중."),
    bullet("POSITIVE_GAP(준비↓ 속도↑) → 과속·번아웃 경계."),
    bullet("드라이버 σ 큼 → 표준 제도 하나로 해결 불가. 팀별 처방전."),

    h2("4-7. 세그먼트(DM) · 주관식 테마"),
    h3("DM(인구통계)이 왜 있나"),
    p(
      "점수가 누구에게서 낮은지 모르면 개입이 빗나갑니다. 직급·재직·부서·연령·AI빈도는 개인 식별이 아니라 집단 비교용입니다. ‘중간관리만 SEC03 낮음’이면 승진·역할 설계 이슈일 수 있습니다.",
    ),
    h3("주관식 테마"),
    p(
      "Likert는 ‘얼마큼’을, 주관식은 ‘무엇 때문에’를 줍니다. FOCUS 드라이버와 테마가 일치하면 개입 가설이 강화되고, 어긋나면 문항으로 못 잡은 현장 이슈를 보완합니다.",
    ),

    h2("4-8. 권장 운영 루프 (90일)"),
    bullet("Day 0–14: 설문 → 종합 대시보드로 우선 축 확정 → 경영진 합의."),
    bullet("Day 14–30: OHI IPA·조직 BI로 대상 팀·레버 확정. N≥5만 공유."),
    bullet("Day 30–60: 파일럿 개입(리더 세션·가이드라인·병목 제거 중 1~2개)."),
    bullet("Day 60–90: Summary 또는 반기 Full로 Risk·FOCUS·Opp·CV01 재측정."),
    bullet("연 1회: ORI·OAI 풀로 준비·정렬 재진단(캐던스)."),

    h1("5. 지표 체크리스트 (화면별)"),
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [2200, 3580, 3580],
      rows: [
        new TableRow({
          children: [
            cell("화면", { bold: true, shade: "E8EEF7", width: 2200 }),
            cell("반드시 볼 지표", { bold: true, shade: "E8EEF7", width: 3580 }),
            cell("바로 묻는 OD 질문", { bold: true, shade: "E8EEF7", width: 3580 }),
          ],
        }),
        new TableRow({
          children: [
            cell("종합", { width: 2200 }),
            cell("4축 · Risk · 처방 Top3", { width: 3580 }),
            cell("우리 조직의 첫 과제는?", { width: 3580 }),
          ],
        }),
        new TableRow({
          children: [
            cell("OHI", { width: 2200 }),
            cell("SE · IPA FOCUS · TL · 갭", { width: 3580 }),
            cell("어디에 돈을·시간을 쓸까?", { width: 3580 }),
          ],
        }),
        new TableRow({
          children: [
            cell("ORI", { width: 2200 }),
            cell("Opp · CD장력 · AX성숙", { width: 3580 }),
            cell("전환을 막을 구조인가 의지인가?", { width: 3580 }),
          ],
        }),
        new TableRow({
          children: [
            cell("OVI", { width: 2200 }),
            cell("CV01 · AV−HV", { width: 3580 }),
            cell("실행이 느린가, 과속인가?", { width: 3580 }),
          ],
        }),
        new TableRow({
          children: [
            cell("OAI", { width: 2200 }),
            cell("SA02 · EA · OA · 4축패턴", { width: 3580 }),
            cell("열심히인데 방향이 맞는가?", { width: 3580 }),
          ],
        }),
        new TableRow({
          children: [
            cell("조직 BI", { width: 2200 }),
            cell("위기 팀 · σ · 벤치 Δ", { width: 3580 }),
            cell("어느 팀에 먼저 들어갈까?", { width: 3580 }),
          ],
        }),
      ],
    }),

    h1("6. 금지·주의 (OD 윤리)"),
    bullet("개인 순위·저성과자 색출에 사용 금지."),
    bullet("N<5 집단 결과 공개 금지."),
    bullet("네트워크(실명) 진단과 이 익명 Index를 병합해 재식별하지 말 것."),
    bullet("리더십 TL은 ‘팀이 경험하는 조건’이지 개인 평가 점수가 아님."),

    h1("7. 변경 요약 (v260715)"),
    bullet("OHI·OVI·OAI 중복·저레버리지 문항 축소 후, 안정성용 약 10문항 복원(TL 짝·단문항 드라이버·F02)."),
    bullet("중요도 이중응답: OHI 드라이버만."),
    bullet("PM04(AI 검증이 성과로 인정) 포함 · CD04 역문항 복원."),
    bullet("주관식은 축 핵심만 유지."),

    p("— 끝 —", { color: "666666" }),
  );

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 420, hanging: 240 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        children,
      },
    ],
  });

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync(OUT, buf);
  console.log("Wrote", OUT, "bytes", buf.length, "items", c);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
