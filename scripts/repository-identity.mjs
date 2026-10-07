// GitHub preserves this repository identity across the owner-authorized rename.
// Matching a display name alone would also trust a replacement repository.
export function isVibeScrollRepository(name, id) {
  return (
    String(id) === "1396686369" &&
    ["StefanDG1/vibe-scroller", "StefanDG1/vibescroll"].includes(name)
  );
}
