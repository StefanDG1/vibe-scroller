// Verify operator WorkOS subjects in the matching environment. Emails and
// preferences never grant this personal testing capability.
export function personalAllowed(subject: string) {
  try {
    const subjects = JSON.parse(
      process.env.PERSONAL_ALPHA_SUBJECTS_JSON ?? "[]",
    );
    return (
      process.env.DISABLE_PERSONAL_ANALYSIS !== "true" &&
      Array.isArray(subjects) &&
      subjects.length <= 10 &&
      subjects.includes(subject)
    );
  } catch {
    return false;
  }
}
