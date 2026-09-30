import type { Sandbox } from "e2b";

// Run as the trusted broker before exposing any untrusted files or commands.
// E2B's egress proxy accepts TCP before filtering and does not cover MMDS.
export const hardenSandboxCommand = `set -eu
test "$(id -u)" = 0
find / -xdev -type f -perm /6000 -exec chmod a-s {} + 2>/dev/null
if command -v getcap >/dev/null; then
  getcap -r /usr /bin /sbin 2>/dev/null | cut -d ' ' -f 1 | while read -r file; do setcap -r "$file"; done
fi
nft add table inet vibe
nft 'add chain inet vibe output { type filter hook output priority -150; policy accept; }'
nft 'add rule inet vibe output meta skuid != 0 ip daddr != 127.0.0.0/8 reject'
nft 'add rule inet vibe output meta skuid != 0 ip6 daddr != ::1 reject'
test -z "$(find /usr /bin /sbin -xdev -type f -perm /6000 2>/dev/null)"
`;

export async function hardenSandbox(sandbox: Sandbox) {
  try {
    await sandbox.commands.run(hardenSandboxCommand, {
      user: "root",
      timeoutMs: 30000,
      requestTimeoutMs: 30000,
    });
  } catch {
    await sandbox.kill();
    throw new Error(
      "Sandbox isolation could not be established. Execution blocked.",
    );
  }
}
