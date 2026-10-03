export function reviewedDependencyPatches(
  patches: unknown,
  readFile: (path: string) => Buffer,
): { package: string; path: string; sha256: string; content: Buffer }[];
