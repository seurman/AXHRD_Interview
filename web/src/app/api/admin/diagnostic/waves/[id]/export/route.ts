import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { requireDiagnosticSuperadmin } from "@/lib/diagnostic/admin-access";
import {
  DEFAULT_DEMOGRAPHIC_CODES,
  filterDemographicItems,
  parseEnabledDemographicItemCodes,
} from "@/lib/diagnostic/section-filter";
import { waveStatusLabel } from "@/lib/diagnostic/wave-status";
import {
  computeCollectionRatePercent,
  countInviteLinks,
} from "@/lib/diagnostic/collection-rate";

type Ctx = { params: Promise<{ id: string }> };

type HierarchyRow = {
  id: string;
  name: string;
  department: string | null;
  slug: string;
  level: "DIVISION" | "UNIT" | "TEAM";
  parentId: string | null;
};

function indentLabel(level: HierarchyRow["level"], name: string) {
  if (level === "DIVISION") return name;
  if (level === "UNIT") return `  └ ${name}`;
  return `    └ ${name}`;
}

function levelLabel(level: HierarchyRow["level"]) {
  if (level === "DIVISION") return "사업본부";
  if (level === "UNIT") return "사업부";
  return "팀";
}

/** 부모→자식 순으로 트리 펼침 (DIVISION → UNIT → TEAM) */
function flattenHierarchy(nodes: HierarchyRow[]): HierarchyRow[] {
  const byParent = new Map<string | null, HierarchyRow[]>();
  for (const n of nodes) {
    const key = n.parentId ?? null;
    const list = byParent.get(key) ?? [];
    list.push(n);
    byParent.set(key, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }
  const out: HierarchyRow[] = [];
  const walk = (parentId: string | null) => {
    for (const n of byParent.get(parentId) ?? []) {
      out.push(n);
      walk(n.id);
    }
  };
  walk(null);
  return out;
}

function choiceOptionsText(raw: unknown): string {
  if (Array.isArray(raw)) return raw.map(String).join(" / ");
  if (raw && typeof raw === "object") return Object.values(raw as Record<string, string>).join(" / ");
  return "";
}

/**
 * 조직 구조·설정 엑셀 내보내기.
 * 개인 응답 원자료·인구통계 조합 응답은 포함하지 않음(익명·5인 미만 원칙).
 */
export async function GET(req: Request, ctx: Ctx) {
  const auth = await requireDiagnosticSuperadmin();
  if ("error" in auth && auth.error) return auth.error;

  const { id } = await ctx.params;

  const wave = await prisma.diagnosticWave.findUnique({
    where: { id },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          joinCode: true,
          validFrom: true,
          validUntil: true,
          diagnosticEnabled: true,
          subscriptions: {
            where: { status: { in: ["ACTIVE", "TRIALING"] } },
            orderBy: { updatedAt: "desc" },
            take: 1,
            select: {
              planTier: true,
              status: true,
              currentPeriodStart: true,
              currentPeriodEnd: true,
            },
          },
        },
      },
      instrument: {
        include: {
          sections: {
            where: { code: "DM" },
            include: {
              items: {
                where: { isDemographic: true, subscaleId: null },
                orderBy: { order: "asc" },
              },
            },
          },
        },
      },
      teams: { orderBy: [{ level: "asc" }, { name: "asc" }] },
      _count: { select: { responses: { where: { submittedAt: { not: null } } } } },
    },
  });

  if (!wave) {
    return NextResponse.json({ error: "캠페인을 찾을 수 없습니다." }, { status: 404 });
  }

  const leafTeams = wave.teams.filter((t) => t.level === "TEAM");
  const inviteLinkCount = countInviteLinks(leafTeams.length);
  const collectionRate = computeCollectionRatePercent(
    wave._count.responses,
    inviteLinkCount,
  );

  const teamResponseGroups = await prisma.diagnosticResponse.groupBy({
    by: ["teamId"],
    where: { waveId: wave.id, submittedAt: { not: null }, teamId: { not: null } },
    _count: { _all: true },
  });
  const responseCountByTeam = new Map(
    teamResponseGroups.map((g) => [g.teamId as string, g._count._all]),
  );

  const enabledDemo = parseEnabledDemographicItemCodes(wave.enabledDemographicItemCodes);
  const dmSection = wave.instrument.sections[0];
  const demoItems = filterDemographicItems(
    (dmSection?.items ?? []).map((i) => ({
      itemCode: i.itemCode,
      textKo: i.textKo,
      choiceOptions: i.choiceOptions,
      isDemographic: i.isDemographic,
      order: i.order,
    })),
    enabledDemo,
  );

  const sub = wave.organization.subscriptions[0] ?? null;
  const hierarchy = flattenHierarchy(
    wave.teams.map((t) => ({
      id: t.id,
      name: t.name,
      department: t.department,
      slug: t.slug,
      level: t.level,
      parentId: t.parentId,
    })),
  );

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AXHRD ARC Index";
  workbook.created = new Date();

  // ① 조직 정보
  const orgSheet = workbook.addWorksheet("조직 정보");
  orgSheet.columns = [
    { header: "항목", key: "key", width: 22 },
    { header: "값", key: "value", width: 48 },
  ];
  orgSheet.addRows([
    { key: "기관명", value: wave.organization.name },
    { key: "가입코드", value: wave.organization.joinCode },
    { key: "진단 SKU", value: wave.organization.diagnosticEnabled ? "활성" : "비활성" },
    { key: "플랜", value: sub?.planTier ?? "—" },
    { key: "구독 상태", value: sub?.status ?? "—" },
    {
      key: "구독 기간",
      value: sub
        ? `${sub.currentPeriodStart.toISOString().slice(0, 10)} ~ ${sub.currentPeriodEnd.toISOString().slice(0, 10)}`
        : "—",
    },
    {
      key: "계약·이용 기간",
      value:
        wave.organization.validFrom || wave.organization.validUntil
          ? `${wave.organization.validFrom?.toISOString().slice(0, 10) ?? "—"} ~ ${wave.organization.validUntil?.toISOString().slice(0, 10) ?? "—"}`
          : "기간 제한 없음",
    },
  ]);

  // ② 사업부·팀 구조
  const structSheet = workbook.addWorksheet("사업부·팀 구조");
  structSheet.columns = [
    { header: "표시", key: "display", width: 40 },
    { header: "레벨", key: "level", width: 12 },
    { header: "이름", key: "name", width: 24 },
    { header: "부서태그", key: "department", width: 16 },
    { header: "응답수(제출)", key: "responses", width: 14 },
    { header: "비고", key: "note", width: 28 },
  ];
  for (const node of hierarchy) {
    const isLeaf = node.level === "TEAM";
    structSheet.addRow({
      display: indentLabel(node.level, node.name),
      level: levelLabel(node.level),
      name: node.name,
      department: node.department ?? "",
      responses: isLeaf ? (responseCountByTeam.get(node.id) ?? 0) : "",
      note: isLeaf ? "응답 링크 대상(리프)" : "중간 노드(링크 없음)",
    });
  }
  if (hierarchy.length === 0) {
    structSheet.addRow({
      display: "(구조 없음)",
      level: "",
      name: "",
      department: "",
      responses: "",
      note: "팀 미등록 — 조직 전체 링크로만 수집 가능",
    });
  }

  // ③ 데모그래픽 문항 설정
  const demoSheet = workbook.addWorksheet("데모그래픽 문항 설정");
  demoSheet.columns = [
    { header: "코드", key: "code", width: 10 },
    { header: "문항", key: "text", width: 28 },
    { header: "선택지", key: "choices", width: 56 },
    { header: "활성근거", key: "source", width: 36 },
  ];
  const sourceNote =
    enabledDemo == null
      ? `하위호환 기본(${DEFAULT_DEMOGRAPHIC_CODES.join(",")})`
      : `웨이브 enabledDemographicItemCodes`;
  for (const item of demoItems) {
    demoSheet.addRow({
      code: item.itemCode,
      text: item.textKo,
      choices: choiceOptionsText(item.choiceOptions),
      source: sourceNote,
    });
  }

  // ④ 웨이브 요약
  const summarySheet = workbook.addWorksheet("웨이브 요약");
  summarySheet.columns = [
    { header: "항목", key: "key", width: 22 },
    { header: "값", key: "value", width: 48 },
  ];
  summarySheet.addRows([
    { key: "웨이브 번호", value: wave.waveNumber },
    { key: "진단명", value: wave.label ?? `Wave ${wave.waveNumber}` },
    { key: "상태", value: waveStatusLabel(wave.status) },
    {
      key: "시작일",
      value: wave.opensAt ? wave.opensAt.toISOString().slice(0, 10) : "—",
    },
    {
      key: "종료일",
      value: wave.closesAt ? wave.closesAt.toISOString().slice(0, 10) : "수동 마감",
    },
    { key: "제출 응답 수", value: wave._count.responses },
    { key: "팀(리프) 수", value: leafTeams.length },
    { key: "초대 링크 수", value: inviteLinkCount },
    {
      key: "수집률",
      value: collectionRate != null ? `${collectionRate}%` : "—",
    },
    {
      key: "안내",
      value:
        "이 파일은 조직 구조·설정 정보만 포함합니다. 개인 응답 원자료는 포함되지 않습니다.",
    },
  ]);

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `arc-wave-${wave.slug}-structure.xlsx`;
  const body = Buffer.from(buffer);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
