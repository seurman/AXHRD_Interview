/**
 * Neo4j graph client — ontology-backed competency progress.
 * Optional: NEO4J_ENABLED=false 시 no-op (로컬 DB만 사용).
 */

import neo4j, { type Driver } from "neo4j-driver";

let driver: Driver | null = null;

function isEnabled(): boolean {
  return process.env.NEO4J_ENABLED !== "false" && !!process.env.NEO4J_URI;
}

export function getNeo4jDriver(): Driver | null {
  if (!isEnabled()) return null;
  if (driver) return driver;

  const uri = process.env.NEO4J_URI ?? "bolt://localhost:7687";
  const user = process.env.NEO4J_USER ?? "neo4j";
  const password = process.env.NEO4J_PASSWORD ?? "hrin_graph_2026";

  try {
    driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
    return driver;
  } catch (e) {
    console.warn("[Neo4j] Driver init failed:", e);
    return null;
  }
}

export async function runCypher(
  query: string,
  params: Record<string, unknown> = {}
): Promise<void> {
  await queryCypher(query, params);
}

/** Neo4j 비활성·실패 시 빈 배열 — 호출부는 Postgres 폴백을 쓰면 됨 */
export async function queryCypher(
  query: string,
  params: Record<string, unknown> = {}
): Promise<Array<Record<string, unknown>>> {
  const d = getNeo4jDriver();
  if (!d) return [];

  const session = d.session();
  try {
    const result = await session.run(query, params);
    return result.records.map((r) => r.toObject() as Record<string, unknown>);
  } catch (e) {
    console.warn("[Neo4j] Query failed:", e);
    return [];
  } finally {
    await session.close();
  }
}

export async function closeNeo4j(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}
