import Link from "next/link";
import { readLaunchChecks } from "../lib/launchproof";

export async function LaunchChecks({
  organizationId,
}: {
  organizationId: string;
}) {
  const status = await readLaunchChecks(organizationId);
  if (status.state === "disabled" || status.state === "hidden") return null;
  const setupUrl = `/app/${encodeURIComponent(organizationId)}/launch-checks`;
  return (
    <section
      className="card"
      aria-labelledby="launch-checks-heading"
      style={{ marginTop: 24, overflowWrap: "anywhere" }}
    >
      <h2 id="launch-checks-heading">Launch checks</h2>
      {"label" in status && <p>{status.label}</p>}
      {status.state === "available" ? (
        <>
          <p>
            Declared scope: {status.summary.passed} passed,{" "}
            {status.summary.failed} failed, {status.summary.unverified}{" "}
            unverified of {status.summary.required} required checks.
          </p>
          <dl>
            <dt>Reported environment</dt>
            <dd>{status.environmentId}</dd>
            <dt>Reported target</dt>
            <dd>{status.targetOrigin}</dd>
            <dt>Tested commit</dt>
            <dd>{status.testedCommit ?? "Not supplied"}</dd>
            <dt>Tested deployment</dt>
            <dd>{status.testedDeploymentId ?? "Not supplied"}</dd>
            <dt>Uploaded, UTC</dt>
            <dd>
              <time dateTime={status.uploadedAt}>{status.uploadedAt}</time>
            </dd>
            <dt>Retained until, UTC</dt>
            <dd>
              <time dateTime={status.retainedUntil}>
                {status.retainedUntil}
              </time>
            </dd>
            <dt>Summary fetched, UTC</dt>
            <dd>
              <time dateTime={status.fetchedAt}>{status.fetchedAt}</time>
            </dd>
          </dl>
          <p className="muted">
            Executed in customer{" "}
            {status.execution === "customer_ci" ? "CI" : "local tooling"}.
          </p>
          <ul className="muted">
            {status.limitations.map((limit) => (
              <li key={limit}>{limit}</li>
            ))}
          </ul>
          <p>
            <a href={status.reportUrl} rel="noreferrer">
              Open Launch Checks
            </a>
            . A separate LaunchProof sign-in may be required.
          </p>
        </>
      ) : (
        <p className="muted">
          {status.state === "missing"
            ? "Run approved checks in your own local environment or CI, then upload the sanitized report to the mapped LaunchProof application."
            : "An owner can review the mapping and summary token in the application server settings. Your projects remain available."}
        </p>
      )}
      <Link href={setupUrl}>Configure or disconnect LaunchProof</Link>
    </section>
  );
}
