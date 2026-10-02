import type { JobSandbox } from "./sandbox";

export async function hardenSandbox(sandbox: JobSandbox) {
  try {
    await sandbox.lockdown();
    const result = await sandbox.commands.run(
      `python3 - <<'PY'
import os,pathlib
assert os.getuid()==1001
status=pathlib.Path('/proc/self/status').read_text()
assert 'NoNewPrivs:\\t1' in status
assert int(next(x.split(':')[1].strip() for x in status.splitlines() if x.startswith('CapEff:')),16)==0
assert not os.access('/root',os.R_OK) and not os.access('/home/ubuntu',os.R_OK)
PY`,
      { user: "user", timeoutMs: 10000 },
    );
    if (result.exitCode !== 0) throw Error();
  } catch {
    await sandbox.kill();
    throw new Error(
      "Sandbox isolation could not be established. Execution blocked.",
    );
  }
}
