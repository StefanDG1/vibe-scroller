import { personalSubjectAllowed } from "./personalAccess";
export function repositoryAllowance(tier: string, subject: string) {
  const normal = tier === "pro" ? 15 : 3;
  const override = Number(process.env.PERSONAL_REPOSITORY_LIMIT ?? normal);
  return personalSubjectAllowed(subject) &&
    Number.isSafeInteger(override) &&
    override >= normal &&
    override <= 1000
    ? override
    : normal;
}
