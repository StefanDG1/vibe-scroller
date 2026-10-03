export function inspectSetup(
  env: Record<string, string | undefined>,
  demo?: boolean,
): {
  mode: string;
  ready: boolean;
  checks: { name: string; valid: boolean }[];
  limits: string[];
};
