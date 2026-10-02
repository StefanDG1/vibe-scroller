"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
type Frame = { id: string; startMs: number };
export function EvidenceViewer({
  frames,
  initialId,
  onClose,
}: {
  frames: Frame[];
  initialId: string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(
    Math.max(
      0,
      frames.findIndex((f) => f.id === initialId),
    ),
  );
  const [loaded, setLoaded] = useState<string>();
  const [failed, setFailed] = useState<string>();
  const frame = frames[index];
  useEffect(() => {
    const d = dialog.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const dismiss = (event: MouseEvent) => {
      if (event.target === element) onClose();
    };
    const navigate = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setIndex((i) => Math.min(frames.length - 1, i + 1));
      }
    };
    element.addEventListener("click", dismiss);
    element.addEventListener("keydown", navigate);
    return () => {
      element.removeEventListener("click", dismiss);
      element.removeEventListener("keydown", navigate);
    };
  }, [frames.length, onClose]);
  if (!frame) return null;
  return (
    <dialog
      ref={dialog}
      className="evidence-viewer"
      aria-label="Video frame"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="evidence-viewer-content">
        <header>
          <span>
            {(frame.startMs / 1000).toFixed(1)}s · {index + 1} / {frames.length}
          </span>
          <button type="button" onClick={onClose} aria-label="Close image">
            <X size={22} />
          </button>
        </header>
        <div className="evidence-viewer-image">
          {failed === frame.id ? (
            <p role="alert">This image is unavailable.</p>
          ) : (
            <>
              {loaded !== frame.id && (
                <Loader2 className="spinner" aria-label="Loading image" />
              )}
              <Image
                key={frame.id}
                src={`/api/evidence/${encodeURIComponent(frame.id)}?inline=true`}
                alt={`Video frame at ${(frame.startMs / 1000).toFixed(1)} seconds`}
                width={1280}
                height={960}
                unoptimized
                onLoad={() => setLoaded(frame.id)}
                onError={() => setFailed(frame.id)}
              />
            </>
          )}
        </div>
        {frames.length > 1 && (
          <footer>
            <button
              type="button"
              disabled={index === 0}
              onClick={() => setIndex((i) => i - 1)}
              aria-label="Previous frame"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              disabled={index === frames.length - 1}
              onClick={() => setIndex((i) => i + 1)}
              aria-label="Next frame"
            >
              <ChevronRight size={22} />
            </button>
          </footer>
        )}
      </div>
    </dialog>
  );
}
