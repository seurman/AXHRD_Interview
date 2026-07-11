export type ApprovedOrgOption = { id: string; name: string };

let cachedOptions: ApprovedOrgOption[] | null = null;
let loadPromise: Promise<ApprovedOrgOption[]> | null = null;

/** 클라이언트 — 세션당 1회만 기관 피커 목록 로드 */
export function loadApprovedOrgOptions(): Promise<ApprovedOrgOption[]> {
  if (cachedOptions) return Promise.resolve(cachedOptions);
  if (!loadPromise) {
    loadPromise = fetch("/api/admin/organizations/picker")
      .then(async (res) => {
        if (!res.ok) throw new Error("기관 목록을 불러오지 못했습니다.");
        const data = (await res.json()) as { organizations: ApprovedOrgOption[] };
        cachedOptions = data.organizations;
        return cachedOptions;
      })
      .catch((err) => {
        loadPromise = null;
        throw err;
      });
  }
  return loadPromise;
}

export function invalidateApprovedOrgOptionsCache() {
  cachedOptions = null;
  loadPromise = null;
}
