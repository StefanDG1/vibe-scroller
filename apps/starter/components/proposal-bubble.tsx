export function ProposalBubble({ count }: { count?: number }) {
  if (!count) return null;
  return (
    <span
      className="hybrid-proposal-bubble"
      data-single={count === 1}
      aria-label={`${count} open ${count === 1 ? "proposal" : "proposals"}`}
    >
      {count > 1 ? count : null}
    </span>
  );
}
