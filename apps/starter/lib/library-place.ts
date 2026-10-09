export type LibraryPlace = {
  representation: "tree" | "folders";
  topicId?: string;
  filing?: "Personal" | "Business";
  closedTopicId?: string;
  insightId?: string;
  scrollTop?: number;
  rowScroll?: number[];
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
      ...(value.filing === "Personal" || value.filing === "Business"
        ? { filing: value.filing }
        : {}),
      ...(typeof value.closedTopicId === "string" &&
      topics.some((t) => t.id === value.closedTopicId)
        ? { closedTopicId: value.closedTopicId }
        : {}),
      ...(typeof value.insightId === "string" && value.insightId.length <= 160
        ? { insightId: value.insightId }
        : {}),
      ...(Number.isFinite(value.scrollTop) &&
      value.scrollTop >= 0 &&
      value.scrollTop <= 100000
        ? { scrollTop: value.scrollTop }
        : {}),
      ...(Array.isArray(value.rowScroll) &&
      value.rowScroll.length <= 8 &&
      value.rowScroll.every(
        (x: any) => Number.isFinite(x) && x >= 0 && x <= 20000,
      )
        ? { rowScroll: value.rowScroll }
        : {}),
      ...(typeof value.topicId === "string" &&
      topics.some((topic) => topic.id === value.topicId)
        ? { topicId: value.topicId }
        : {}),
    };
  } catch {
    return null;
  }
}

export function restoredLibraryPlace(
  raw: string | null,
  topics: {
    id: string;
    name?: string;
    parentId?: string;
    autoCategory?: boolean;
  }[],
): LibraryPlace {
  const saved = permittedLibraryPlace(raw, topics);
  const filing = topics.some(
    (t) => !t.parentId && t.autoCategory && t.name === "Business",
  )
    ? "Business"
    : topics.some((t) => !t.parentId && t.autoCategory && t.name === "Personal")
      ? "Personal"
      : "Business";
  if (!saved) return { representation: "tree", filing };
  const savedFiling = topics.some(
    (t) => !t.parentId && t.autoCategory && t.name === saved.filing,
  )
    ? saved.filing
    : filing;
  // An unavailable branch cannot carry its insight or geometry into the overview.
  if (!saved.topicId)
    return {
      representation: saved.representation,
      filing: savedFiling,
    };
  return { ...saved, filing: savedFiling };
}
