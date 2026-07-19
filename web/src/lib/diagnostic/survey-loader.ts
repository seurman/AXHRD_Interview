import { prisma } from "@/lib/prisma";
import { SCALE_LABELS } from "@/lib/diagnostic/constants";
import {
  filterDemographicItems,
  filterSectionsByEnabled,
  parseEnabledDemographicItemCodes,
  parseEnabledSectionCodes,
} from "@/lib/diagnostic/section-filter";

function mapItem(item: {
  id: string;
  itemCode: string;
  textKo: string;
  scaleType: string;
  scaleLabels: unknown;
  hasImportanceAxis: boolean;
  isDemographic: boolean;
  choiceOptions: unknown;
}) {
  return {
    id: item.id,
    itemCode: item.itemCode,
    textKo: item.textKo,
    scaleType: item.scaleType,
    scaleLabels:
      item.scaleLabels ??
      (item.scaleType !== "OPEN_TEXT"
        ? SCALE_LABELS[item.scaleType as keyof typeof SCALE_LABELS]
        : null),
    hasImportanceAxis: item.hasImportanceAxis,
    isDemographic: item.isDemographic,
    choiceOptions: item.choiceOptions,
  };
}

function mapSectionsWithDemographicFilter(
  filteredSections: Array<{
    code: string;
    nameKo: string;
    subscales: Array<{
      code: string;
      nameKo: string;
      isDriver: boolean;
      items: Parameters<typeof mapItem>[0][];
    }>;
    items: Parameters<typeof mapItem>[0][];
  }>,
  enabledDemographic: string[] | null,
) {
  return filteredSections.map((sec) => ({
    code: sec.code,
    nameKo: sec.nameKo,
    subscales: sec.subscales.map((sub) => ({
      code: sub.code,
      nameKo: sub.nameKo,
      isDriver: sub.isDriver,
      items: sub.items.map(mapItem),
    })),
    directItems: filterDemographicItems(sec.items.map(mapItem), enabledDemographic),
  }));
}

export function orgWideCookieKey(waveSlug: string) {
  return `dx_rsp_${waveSlug}__org__`;
}

export function teamCookieKey(waveSlug: string, teamSlug: string) {
  return `dx_rsp_${waveSlug}_${teamSlug}`;
}

/** API·페이지 공통으로 세션 쿠키가 전달되도록 path는 `/` */
export function diagnosticSessionCookieOptions(maxAge = 60 * 60 * 24 * 30) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function loadOrgWideSurvey(waveSlug: string, respondentToken?: string) {
  const wave = await prisma.diagnosticWave.findUnique({
    where: { slug: waveSlug },
    include: {
      instrument: {
        include: {
          sections: {
            orderBy: { order: "asc" },
            include: {
              subscales: {
                orderBy: { order: "asc" },
                include: { items: { orderBy: { order: "asc" } } },
              },
              items: {
                where: { subscaleId: null },
                orderBy: { order: "asc" },
              },
            },
          },
        },
      },
    },
  });
  if (!wave) return null;

  const enabled = parseEnabledSectionCodes(wave.enabledSectionCodes);
  const filteredSections = filterSectionsByEnabled(wave.instrument.sections, enabled);
  const enabledDemographic = parseEnabledDemographicItemCodes(wave.enabledDemographicItemCodes);

  let response = respondentToken
    ? await prisma.diagnosticResponse.findUnique({
        where: { respondentToken },
        include: { answers: true },
      })
    : null;

  if (response && (response.waveId !== wave.id || response.teamId != null)) {
    response = null;
  }

  const sections = mapSectionsWithDemographicFilter(filteredSections, enabledDemographic);

  const answerMap: Record<string, { current?: number; importance?: number; text?: string }> = {};
  if (response) {
    for (const a of response.answers) {
      if (!answerMap[a.itemId]) answerMap[a.itemId] = {};
      if (a.axis === "CURRENT") {
        if (a.numericValue != null) answerMap[a.itemId].current = a.numericValue;
        if (a.textValue) answerMap[a.itemId].text = a.textValue;
      } else if (a.numericValue != null) {
        answerMap[a.itemId].importance = a.numericValue;
      }
    }
  }

  return {
    wave: {
      id: wave.id,
      label: wave.label,
      status: wave.status,
      estimatedMinutes: wave.instrument.estimatedMinutes,
    },
    team: null as { id: string; name: string } | null,
    instrument: { nameKo: wave.instrument.nameKo, version: wave.instrument.version },
    sections,
    response: response
      ? {
          id: response.id,
          respondentToken: response.respondentToken,
          demographics: response.demographics,
          consentAt: response.consentAt?.toISOString() ?? null,
          submittedAt: response.submittedAt?.toISOString() ?? null,
          answers: answerMap,
        }
      : null,
  };
}

export async function loadTeamSurvey(waveSlug: string, teamSlug: string, respondentToken?: string) {
  const wave = await prisma.diagnosticWave.findUnique({
    where: { slug: waveSlug },
    include: {
      instrument: {
        include: {
          sections: {
            orderBy: { order: "asc" },
            include: {
              subscales: {
                orderBy: { order: "asc" },
                include: { items: { orderBy: { order: "asc" } } },
              },
              items: {
                where: { subscaleId: null },
                orderBy: { order: "asc" },
              },
            },
          },
        },
      },
      teams: { where: { slug: teamSlug, level: "TEAM" } },
    },
  });
  if (!wave || wave.teams.length === 0) return null;
  const team = wave.teams[0];

  const enabled = parseEnabledSectionCodes(wave.enabledSectionCodes);
  const filteredSections = filterSectionsByEnabled(wave.instrument.sections, enabled);
  const enabledDemographic = parseEnabledDemographicItemCodes(wave.enabledDemographicItemCodes);

  let response = respondentToken
    ? await prisma.diagnosticResponse.findUnique({
        where: { respondentToken },
        include: { answers: true },
      })
    : null;

  if (response && (response.waveId !== wave.id || response.teamId !== team.id)) {
    response = null;
  }

  const sections = mapSectionsWithDemographicFilter(filteredSections, enabledDemographic);

  const answerMap: Record<string, { current?: number; importance?: number; text?: string }> = {};
  if (response) {
    for (const a of response.answers) {
      if (!answerMap[a.itemId]) answerMap[a.itemId] = {};
      if (a.axis === "CURRENT") {
        if (a.numericValue != null) answerMap[a.itemId].current = a.numericValue;
        if (a.textValue) answerMap[a.itemId].text = a.textValue;
      } else if (a.numericValue != null) {
        answerMap[a.itemId].importance = a.numericValue;
      }
    }
  }

  return {
    wave: {
      id: wave.id,
      label: wave.label,
      status: wave.status,
      estimatedMinutes: wave.instrument.estimatedMinutes,
    },
    team: { id: team.id, name: team.name },
    instrument: { nameKo: wave.instrument.nameKo, version: wave.instrument.version },
    sections,
    response: response
      ? {
          id: response.id,
          respondentToken: response.respondentToken,
          demographics: response.demographics,
          consentAt: response.consentAt?.toISOString() ?? null,
          submittedAt: response.submittedAt?.toISOString() ?? null,
          answers: answerMap,
        }
      : null,
  };
}
