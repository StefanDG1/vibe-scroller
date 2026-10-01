import { Console } from "@/components/console";
import fixture from "../../../../fixtures/dashboard.json";
export const metadata = {
  title: "Labeled workflow demo",
  robots: { index: false, follow: false },
};
export default async function Demo({
  searchParams,
}: {
  searchParams: Promise<{ uiState?: string }>;
}) {
  const state = (await searchParams).uiState;
  const demoState =
    state === "loading" || state === "error" || state === "empty"
      ? state
      : "ready";
  return (
    <Console
      demo
      demoState={demoState}
      initialView={demoState === "ready" ? "home" : "library"}
      initialSearch={demoState === "empty" ? "Synthetic absent source" : ""}
      initial={{
        sources:
          demoState === "loading" || demoState === "empty"
            ? []
            : fixture.sources,
        repositories: [],
        proposals: [],
        runs: [],
        notifications: [],
        usage: null,
      }}
      organizationId="demo"
    />
  );
}
