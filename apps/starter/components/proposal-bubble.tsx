export function ProposalBubble({ count }: { count?: number }) {
  if (!count) return null;
  return (
    <span
      className="hybrid-proposal-bubble"
      aria-label={`${count} open ${count === 1 ? "proposal" : "proposals"}`}
    >
      {count}
    </span>
  );
}
