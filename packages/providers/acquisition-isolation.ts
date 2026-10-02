import type { Sandbox } from "e2b";

// The provider egress proxy restricts public hostnames. This independent kernel
// layer blocks private destinations, metadata, control services and DNS rebinding.
export const acquisitionIsolationCommand = `set -eu
test "$(id -u)" = 0
find / -xdev -type f -perm /6000 -exec chmod a-s {} + 2>/dev/null
getcap -r /usr /bin /sbin 2>/dev/null | cut -d ' ' -f 1 | while read -r file; do setcap -r "$file"; done
nft add table inet vibe_acquisition
nft 'add chain inet vibe_acquisition output { type filter hook output priority -150; policy accept; }'
python3 - <<'PY'
import ipaddress, pathlib, subprocess
def rule(*args):
    subprocess.run(['nft', 'add', 'rule', 'inet', 'vibe_acquisition', 'output', *args], check=True)
for line in pathlib.Path('/etc/resolv.conf').read_text().splitlines():
    parts = line.split()
    if len(parts) == 2 and parts[0] == 'nameserver':
        address = ipaddress.ip_address(parts[1])
        family = 'ip' if address.version == 4 else 'ip6'
        for transport in ['udp', 'tcp']:
            rule('meta', 'skuid', '!=', '0', family, 'daddr', str(address), transport, 'dport', '53', 'accept')
rule('meta', 'skuid', '!=', '0', 'ip', 'daddr', '{', '0.0.0.0/8,', '10.0.0.0/8,', '100.64.0.0/10,',
     '127.0.0.0/8,', '169.254.0.0/16,', '172.16.0.0/12,', '192.0.0.0/24,', '192.168.0.0/16,',
     '198.18.0.0/15,', '224.0.0.0/4,', '240.0.0.0/4', '}', 'reject')
rule('meta', 'skuid', '!=', '0', 'ip6', 'daddr', '{', '::/128,', '::1/128,', '::ffff:0:0/96,',
     'fc00::/7,', 'fe80::/10,', 'ff00::/8', '}', 'reject')
rule('meta', 'skuid', '!=', '0', 'tcp', 'dport', '{', '80,', '443', '}', 'accept')
rule('meta', 'skuid', '!=', '0', 'reject')
PY
test -z "$(find /usr /bin /sbin -xdev -type f -perm /6000 2>/dev/null)"
`;

export async function hardenAcquisition(sandbox: Sandbox) {
  try {
    await sandbox.commands.run(acquisitionIsolationCommand, {
      user: "root",
      timeoutMs: 30000,
      requestTimeoutMs: 30000,
    });
  } catch {
    await sandbox.kill();
    throw new Error(
      "Link retrieval isolation could not be established. Execution blocked.",
    );
  }
}
