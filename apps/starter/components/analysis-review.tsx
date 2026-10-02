"use client";
import { useId, useState } from "react";
import { Check, Loader2 } from "lucide-react";
const choices = [
  ["accurate", "Accurate"],
  ["missing_details", "Missing details"],
  ["incorrect", "Incorrect"],
  ["unsure", "Unsure"],
] as const;
type SavedReview = {
  verdict: string;
  note: string;
  reviewedAt: number;
  generation: number;
};
export function AnalysisReview({
  sourceId,
  generation,
  analysisHash,
  initial,
  disabled,
  call,
  onSaved,
}: {
  sourceId: string;
  generation: number;
  analysisHash: string;
  initial?: SavedReview;
  disabled: boolean;
  call: (operation: string, args: unknown) => Promise<any>;
  onSaved: (review: SavedReview) => void;
}) {
  const group = useId();
  const [verdict, setVerdict] = useState(initial?.verdict ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const unchanged = saved?.verdict === verdict && saved.note === note.trim();
  return (
    <details className="analysis-review">
      <summary>
        Review analysis{saved && <Check size={16} aria-label="Review saved" />}
      </summary>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!verdict || disabled || busy) return;
          setBusy(true);
          setError("");
          try {
            const result = await call("reviewAnalysis", {
              id: sourceId,
              generation,
              analysisHash,
              verdict,
              note,
            });
            if (!result) throw Error();
            setSaved(result);
            onSaved(result);
          } catch {
            setError(
              "Review was not saved. Check access and reload if the analysis changed.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={disabled || busy}>
          <legend>Does this analysis match the source?</legend>
          <div className="review-choices">
            {choices.map(([value, text]) => (
              <label
                key={value}
                className={verdict === value ? "selected" : ""}
              >
                <input
                  type="radio"
                  name={group}
                  value={value}
                  checked={verdict === value}
                  onChange={() => {
                    setVerdict(value);
                    setError("");
                  }}
                  required
                />
                {text}
              </label>
            ))}
          </div>
          <label className="review-note">
            Notes <span className="fine">optional</span>
            <textarea
              maxLength={2000}
              rows={3}
              value={note}
              onChange={(event) => {
                setNote(event.target.value);
                setError("");
              }}
              placeholder="What was missed, incorrect or useful for your project?"
            />
          </label>
        </fieldset>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="actions">
          <button
            type="submit"
            className="secondary"
            disabled={disabled || busy || !verdict || unchanged}
            aria-busy={busy || undefined}
          >
            {busy && (
              <Loader2 size={16} className="spinner" aria-hidden="true" />
            )}
            {busy ? "Saving…" : "Save review"}
          </button>
          <output aria-live="polite">
            {saved && unchanged ? "Review saved" : ""}
          </output>
        </div>
      </form>
    </details>
  );
}
