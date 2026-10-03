import { github } from "./github";
import { ensure } from "../policy";
export async function discoverRepositories(token: string) {
  const installations = [];
  for (let page = 1; page <= 10; page++) {
    const batch = await github(
      `/user/installations?per_page=100&page=${page}`,
      token,
    );
    for (const i of batch.installations.filter(
      (i: any) =>
        i.app_id === Number(process.env.GITHUB_APP_ID) && !i.suspended_at,
    )) {
      const repositories = [];
      for (let rp = 1; rp <= 10; rp++) {
        const selected = await github(
          `/user/installations/${i.id}/repositories?per_page=100&page=${rp}`,
          token,
        );
        repositories.push(
          ...selected.repositories
            .filter(
              (r: any) =>
                r.permissions?.push ||
                r.permissions?.maintain ||
                r.permissions?.admin,
            )
            .map((r: any) => ({ id: r.id, fullName: r.full_name })),
        );
        if (selected.repositories.length < 100) break;
        ensure(
          rp < 10,
          "REPO_TOO_LARGE",
          "Select fewer repositories for this installation.",
        );
      }
      installations.push({ installationId: i.id, repositories });
    }
    if (batch.installations.length < 100) break;
    ensure(page < 10, "REPO_TOO_LARGE", "Too many installations.");
  }
  return installations;
}
