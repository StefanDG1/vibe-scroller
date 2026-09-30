type Base = { repositoryId: string; sha: string; profileVersion: number };
type Repository = {
  _id: string;
  sha: string;
  profileVersion: number;
  enabled: boolean;
  confirmed: boolean;
};
export function selectionCurrent(
  selection: { generation: number; bases: Base[] } | undefined,
  source: { generation: number },
  repositories: Repository[],
) {
  const current = repositories
    .filter((r) => r.enabled && r.confirmed)
    .sort((a, b) => a._id.localeCompare(b._id));
  return (
    selection?.generation === source.generation &&
    Array.isArray(selection.bases) &&
    selection.bases.length === current.length &&
    current.every(
      (repo, index) =>
        selection.bases[index].repositoryId === repo._id &&
        selection.bases[index].sha === repo.sha &&
        selection.bases[index].profileVersion === repo.profileVersion,
    )
  );
}
