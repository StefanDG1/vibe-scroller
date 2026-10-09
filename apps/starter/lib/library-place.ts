export type LibraryPlace = {
  representation: "tree" | "folders";
  topicId?: string;
};
export function clearLibraryPlaces(
  storage: Pick<Storage, "length" | "key" | "removeItem">,
  organizationId?: string,
) {
  const prefix = organizationId
    ? `vibescroll-library-place:${encodeURIComponent(organizationId)}:`
    : "vibescroll-library-place:";
  const keys = Array.from({ length: storage.length }, (_, index) =>
    storage.key(index),
  );
  for (const key of keys) if (key?.startsWith(prefix)) storage.removeItem(key);
}
export function libraryPlaceKey(organizationId: string, scope: string) {
  return `vibescroll-library-place:${encodeURIComponent(organizationId)}:${encodeURIComponent(scope)}`;
}
export function permittedLibraryPlace(
  raw: string | null,
  topics: { id: string }[],
): LibraryPlace | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (value?.representation !== "tree" && value?.representation !== "folders")
      return null;
    return {
      representation: value.representation,
      ...(typeof value.topicId === "string" &&
      topics.some((topic) => topic.id === value.topicId)
        ? { topicId: value.topicId }
        : {}),
    };
  } catch {
    return null;
  }
}
