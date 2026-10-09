"use client";
import { useEffect, useSyncExternalStore } from "react";

const key = "vibescroll-interface-motion";
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener("vibescroll-motion", listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener("vibescroll-motion", listener);
  };
}
let pageEnabled = true;
function snapshot() {
  try {
    return localStorage.getItem(key) !== "off";
  } catch {
    return pageEnabled;
  }
}
function subscribeDeviceMotion(listener: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}
function deviceMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
export function useInterfaceMotion() {
  const enabled = useSyncExternalStore(subscribe, snapshot, () => true);
  const reduced = useSyncExternalStore(
    subscribeDeviceMotion,
    deviceMotionSnapshot,
    () => true,
  );
  return enabled && !reduced;
}
export function MotionPreference({ control = false }: { control?: boolean }) {
  const enabled = useSyncExternalStore(subscribe, snapshot, () => true);
  useEffect(() => {
    const sync = () => {
      document.documentElement.dataset.pageHidden = String(document.hidden);
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.motion = enabled ? "on" : "off";
  }, [enabled]);
  if (!control) return null;
  return (
    <label className="motion-preference">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(event) => {
          const value = event.target.checked;
          pageEnabled = value;
          try {
            localStorage.setItem(key, value ? "on" : "off");
          } catch {
            /* Apply for this page when persistence is unavailable. */
          }
          window.dispatchEvent(new Event("vibescroll-motion"));
        }}
      />
      Interface motion
      <span>
        Scroll stays visible. Your device’s reduced-motion setting also applies.
      </span>
    </label>
  );
}
