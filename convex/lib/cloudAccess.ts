// A worker isolation check is separate from public product release approval.
// Before release, only explicitly verified subjects may run acceptance tasks.
export function cloudExecutionAllowed(subject: string) {
  if (
    process.env.CLOUD_VERIFIED !== "true" ||
    process.env.DISABLE_CLOUD === "true"
  )
    return false;
  if (process.env.CLOUD_PUBLIC_RELEASE_APPROVED === "true") return true;
  try {
    const subjects = JSON.parse(
      process.env.CLOUD_EXECUTION_SUBJECTS_JSON ?? "[]",
    );
    return (
      Array.isArray(subjects) &&
      subjects.length <= 10 &&
      subjects.every(
        (value) => typeof value === "string" && value.length <= 200,
      ) &&
      subjects.includes(subject)
    );
  } catch {
    return false;
  }
}
