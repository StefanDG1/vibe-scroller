"use client";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
export function NoticeToast({
  message,
  kind = "info",
  onDismiss,
  action,
}: {
  message: string;
  kind?: "success" | "error" | "info";
  onDismiss: () => void;
  action?: React.ReactNode;
}) {
  const [paused, setPaused] = useState(false);
  const dismiss = useRef(onDismiss);
  useEffect(() => {
    dismiss.current = onDismiss;
  }, [onDismiss]);
  useEffect(() => {
    if (!message || paused || kind === "error" || action) return;
    const timer = setTimeout(() => dismiss.current(), 6000);
    return () => clearTimeout(timer);
  }, [message, kind, paused, action]);
  const Icon =
    kind === "error" ? AlertCircle : kind === "success" ? CheckCircle2 : Info;
  return (
    <div className="toast-region" aria-label="Updates">
      {message && (
        <div
          className={`notice-toast notice-toast-${kind}`}
          role={kind === "error" ? "alert" : "status"}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false);
          }}
        >
          <Icon size={20} aria-hidden="true" />
          <div>
            <p>{message}</p>
            {action}
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={onDismiss}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
