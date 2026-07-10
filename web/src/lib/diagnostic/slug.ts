export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^\w\uAC00-\uD7A3\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
}

export function uniqueSlug(base: string, existing: Set<string>): string {
  let slug = slugify(base) || "team";
  let n = 1;
  while (existing.has(slug)) {
    slug = `${slugify(base)}-${n}`;
    n += 1;
  }
  existing.add(slug);
  return slug;
}

export function waveSlug(orgId: string, waveNumber: number): string {
  return `w-${orgId.slice(0, 8)}-${waveNumber}`;
}
