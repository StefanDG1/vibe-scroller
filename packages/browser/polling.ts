/** Poll visible, online pages without overlapping requests or retry storms. */
export function startPolling(
  refresh: () => Promise<unknown>,
  interval: number,
) {
  let stopped = false,
    running = false,
    failures = 0;
  let timer: ReturnType<typeof setTimeout>;
  const ready = () =>
    document.visibilityState === "visible" && navigator.onLine;
  const schedule = () => {
    if (!stopped && ready())
      timer = setTimeout(
        () => void run(),
        Math.min(interval * 2 ** failures, 300000),
      );
  };
  async function run() {
    if (stopped || running || !ready()) return;
    clearTimeout(timer);
    running = true;
    try {
      const result = await refresh();
      failures = result === false ? Math.min(failures + 1, 5) : 0;
    } catch {
      failures = Math.min(failures + 1, 5);
    } finally {
      running = false;
      schedule();
    }
  }
  const wake = () => {
    clearTimeout(timer);
    if (ready()) void run();
  };
  timer = setTimeout(() => void run(), 0);
  document.addEventListener("visibilitychange", wake);
  window.addEventListener("online", wake);
  return () => {
    stopped = true;
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", wake);
    window.removeEventListener("online", wake);
  };
}
