import { Console } from "@/components/console";
import fixture from "../../../../fixtures/dashboard.json";
export const metadata = {
  title: "Labeled workflow demo",
  robots: { index: false, follow: false },
};
export default async function Demo({
  searchParams,
}: {
  searchParams: Promise<{ uiState?: string; view?: string }>;
}) {
  const params = await searchParams;
  const state = params.uiState;
  const demoState =
    state === "loading" || state === "error" || state === "empty"
      ? state
      : "ready";
  return (
    <Console
      demo
      demoState={demoState}
      initialView={
        params.view === "library" || demoState !== "ready" ? "library" : "home"
      }
      initialSearch={demoState === "empty" ? "Synthetic absent source" : ""}
      initial={{
        sources:
          demoState === "loading" || demoState === "empty"
            ? []
            : fixture.sources,
        repositories:
          demoState === "ready"
            ? [
                {
                  _id: "synthetic-project",
                  providerId: 1,
                  installationId: 1,
                  fullName: "synthetic/demo-planner",
                  enabled: true,
                  confirmed: false,
                  sha: "a".repeat(40),
                  profileVersion: 1,
                  selectionVersion: 1,
                  status: "connected",
                  snapshotPaths: [],
                  profile:
                    "purpose: Synthetic planning app\n\naudience: Example members and administrators\n\nstage: Synthetic demo\n\ngoals: Review tasks\n\nbusinessModel: unknown\n\nconstraints: Synthetic data only\n\nnonGoals: No real execution\n\nroles: Members review tasks; administrators manage the demo workspace.\n\nfeatures: Synthetic task lists and review.\n\njourneys: Open a task, inspect it and choose a next action.\n\nfoundations: This is a labeled example, not customer research.\n\nevidence: Synthetic fixture only; no real repository was read.",
                  snapshotCoverage: {
                    wholeRepository: true,
                    includedFiles: 10,
                    indexedFiles: 10,
                    omittedFiles: 0,
                    inspectedFiles: 4,
                    wordDocuments: 0,
                    baseSha: "a".repeat(40),
                  },
                },
              ]
            : [],
        githubChoices:
          demoState === "ready"
            ? [{ id: 1, installationId: 1, fullName: "synthetic/demo-planner" }]
            : [],
        proposals: [],
        runs: [],
        notifications: [],
        usage: null,
      }}
      organizationId="demo"
    />
  );
}
