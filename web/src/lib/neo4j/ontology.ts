/**
 * HR_IN 온톨로지 — Neo4j 그래프 동기화
 *
 * 노드: Candidate, Competency, Question, InterviewPlan, Resume, Claim
 * 관계: HAS_PLAN, MEASURES, PROGRESS_ON, COMPLETED, REQUIRES,
 *       HAS_RESUME, HAS_CLAIM, SUPPORTS, DEMONSTRATED
 */

import { runCypher } from "./client";
import { COMPETENCY_CODES } from "@/types";

const ONTOLOGY_EDGES: Array<[string, string]> = [
  ["COMMUNICATION", "PROBLEM_SOLVING"],
  ["PROBLEM_SOLVING", "JOB_FIT"],
  ["ORG_FIT", "LEADERSHIP"],
  ["GROWTH", "COMMUNICATION"],
];

export async function ensureOntologySchema(): Promise<void> {
  await runCypher(`
    MERGE (o:Ontology {name: 'HR_IN_Competency_v1'})
    SET o.updatedAt = datetime()
  `);

  for (const code of COMPETENCY_CODES) {
    await runCypher(
      `MERGE (c:Competency {code: $code}) SET c.updatedAt = datetime()`,
      { code }
    );
  }

  for (const [from, to] of ONTOLOGY_EDGES) {
    await runCypher(
      `
      MATCH (a:Competency {code: $from}), (b:Competency {code: $to})
      MERGE (a)-[:REQUIRES]->(b)
      `,
      { from, to }
    );
  }
}

export async function syncCandidate(params: {
  id: string;
  email: string;
  name: string;
}): Promise<void> {
  await runCypher(
    `
    MERGE (u:Candidate {id: $id})
    SET u.email = $email, u.name = $name, u.updatedAt = datetime()
    `,
    params
  );
}

export async function syncInterviewPlan(params: {
  planId: string;
  candidateId: string;
  companyName?: string;
  jobRole?: string;
}): Promise<void> {
  await runCypher(
    `
    MATCH (u:Candidate {id: $candidateId})
    MERGE (p:InterviewPlan {id: $planId})
    SET p.companyName = $companyName, p.jobRole = $jobRole, p.updatedAt = datetime()
    MERGE (u)-[:HAS_PLAN]->(p)
    `,
    {
      planId: params.planId,
      candidateId: params.candidateId,
      companyName: params.companyName ?? "",
      jobRole: params.jobRole ?? "",
    }
  );
}

export async function syncQuestionOntology(params: {
  externalId: string;
  competencyCode: string;
  level: number;
}): Promise<void> {
  await runCypher(
    `
    MATCH (c:Competency {code: $competencyCode})
    MERGE (q:Question {externalId: $externalId})
    SET q.level = $level, q.updatedAt = datetime()
    MERGE (q)-[:MEASURES]->(c)
    `,
    params
  );
}

export async function syncCompetencyProgress(params: {
  candidateId: string;
  planId: string;
  competency: string;
  status: string;
  theta?: number;
  levelEst?: number;
  percentile?: number;
}): Promise<void> {
  await runCypher(
    `
    MATCH (u:Candidate {id: $candidateId}), (p:InterviewPlan {id: $planId}), (c:Competency {code: $competency})
    MERGE (u)-[r:PROGRESS_ON {planId: $planId}]->(c)
    SET r.status = $status,
        r.theta = $theta,
        r.levelEst = $levelEst,
        r.percentile = $percentile,
        r.updatedAt = datetime()
    WITH u, c, r
    WHERE $status = 'COMPLETED'
    MERGE (u)-[:COMPLETED {planId: $planId, at: datetime()}]->(c)
    `,
    {
      candidateId: params.candidateId,
      planId: params.planId,
      competency: params.competency,
      status: params.status,
      theta: params.theta ?? null,
      levelEst: params.levelEst ?? null,
      percentile: params.percentile ?? null,
    }
  );
}
