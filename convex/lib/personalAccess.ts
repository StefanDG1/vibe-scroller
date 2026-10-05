// Verify operator WorkOS subjects in the matching environment. Emails and
// preferences never grant this personal testing capability.
export function personalAllowed(subject: string) {
  return (
    process.env.DISABLE_PERSONAL_ANALYSIS !== "true" &&
    personalSubjectAllowed(subject)
  );
}
export function personalSubjectAllowed(subject: string) {
  try {
    const subjects = JSON.parse(
      process.env.PERSONAL_ALPHA_SUBJECTS_JSON ?? "[]",
    );
    return (
      Array.isArray(subjects) &&
      subjects.length <= 10 &&
      subjects.includes(subject)
    );
  } catch {
    return false;
  }
}
