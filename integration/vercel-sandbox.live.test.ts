import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  createJobSandbox,
  stopJobSandbox,
} from "../packages/providers/sandbox";
import { hardenSandbox } from "../packages/providers/isolation";
import { hardenAcquisition } from "../packages/providers/acquisition-isolation";
import { personalDecoder } from "../packages/media/decoder-personal";
import { decoder } from "../packages/media/decoder";
import { checkPatch } from "../packages/providers/cloud";
import { decoderManifest } from "../packages/media/manifest";
it("short visual tracks retain actual JPEG evidence without inventing frames throughout longer audio", async () => {
  const sandbox = await createJobSandbox("media", 180);
  try {
    await hardenSandbox(sandbox);
    const created = await sandbox.commands.run(
      "mkdir -p /home/user/media && ffmpeg -v error -nostdin -f lavfi -i color=c=blue:s=1280x720:r=12:d=0.083334 -f lavfi -i sine=frequency=440:sample_rate=22050:duration=13 -map 0:v -map 1:a -c:v libx264 -threads 2 -pix_fmt yuv420p -c:a aac -t 13 -f mp4 /home/user/media/input",
      { user: "user", timeoutMs: 30000 },
    );
    expect(created.exitCode).toBe(0);
    for (const [script, pcm] of [
      [decoder, false],
      [personalDecoder, true],
    ] as const) {
      await sandbox.commands.run(
        "rm -f /home/user/media/candidate-*.jpg /home/user/media/frame-*.jpg /home/user/media/audio.mp3 /home/user/media/audio.wav /home/user/media/manifest.json",
        { user: "user" },
      );
      await sandbox.files.write("/home/user/media/decode.py", script);
      const decoded = await sandbox.commands.run(
        "python3 /home/user/media/decode.py",
        {
          user: "user",
          timeoutMs: 90000,
        },
      );
      expect(decoded.exitCode).toBe(0);
      const manifest = decoderManifest(
        JSON.parse(await sandbox.files.read("/home/user/media/manifest.json")),
        pcm,
      );
      expect(manifest.durationSeconds).toBeGreaterThanOrEqual(13);
      expect(manifest.frames).toHaveLength(1);
      expect(manifest.frames[0].timestampMs).toBe(0);
      const frame = await sandbox.files.read(
        "/home/user/media/" + manifest.frames[0].id,
        { format: "bytes" },
      );
      expect([...frame.subarray(0, 3)]).toEqual([255, 216, 255]);
      const audio = await sandbox.files.read(
        "/home/user/media/" + manifest.audio,
        { format: "bytes" },
      );
      expect(audio.length).toBeGreaterThan(1000);
      if (pcm) expect(audio.subarray(0, 4).toString()).toBe("RIFF");
    }
  } finally {
    await sandbox.kill();
  }
}, 180000);
it("real isolated Vercel media snapshot decodes an owned synthetic clip to bounded PCM and JPEG evidence", async () => {
  const sandbox = await createJobSandbox("media", 150);
  try {
    await hardenSandbox(sandbox);
    expect(
      (
        await sandbox.commands.run("mkdir -p /home/user/media", {
          user: "user",
        })
      ).exitCode,
    ).toBe(0);
    await sandbox.files.write(
      "/home/user/media/input",
      readFileSync(
        process.env.VERCEL_OWNED_TEST_CLIP ??
          "outputs/video-acceptance/owned-synthetic-design.mp4",
      ),
      { user: "user" },
    );
    await sandbox.files.write("/home/user/media/decode.py", personalDecoder, {
      user: "user",
    });
    const decoded = await sandbox.commands.run(
      "python3 /home/user/media/decode.py",
      { user: "user", timeoutMs: 90000 },
    );
    expect(decoded.exitCode).toBe(0);
    const manifest = decoderManifest(
      JSON.parse(await sandbox.files.read("/home/user/media/manifest.json")),
      true,
    );
    expect(manifest.coverage).toBe("full_sampled");
    expect(manifest.frames.length).toBeGreaterThan(0);
    const audio = await sandbox.files.read(
      "/home/user/media/" + manifest.audio,
      { format: "bytes" },
    );
    expect(audio.subarray(0, 4).toString()).toBe("RIFF");
    for (const frame of manifest.frames) {
      const bytes = await sandbox.files.read("/home/user/media/" + frame.id, {
        format: "bytes",
      });
      expect([...bytes.subarray(0, 3)]).toEqual([255, 216, 255]);
    }
  } finally {
    await sandbox.kill();
  }
});
it("online acquisition retains the independent private-network and metadata barrier", async () => {
  const sandbox = await createJobSandbox("acquisition", 90, ["example.com"]);
  try {
    await hardenAcquisition(sandbox);
    const result = await sandbox.commands.run(
      `python3 - <<'PY'
import os,pathlib,socket,subprocess,json
checks={'unprivileged':os.getuid()==1001,'sudo_denied':subprocess.run(['sudo','-n','id'],capture_output=True).returncode!=0,'broker_home_denied':not os.access('/home/ubuntu',os.R_OK)}
for name,host,port in [('metadata','169.254.169.254',80),('private','10.0.0.1',443),('loopback','127.0.0.1',49983),('ipv6_private','::1',80)]:
 try: socket.create_connection((host,port),timeout=2);checks[name]=False
 except OSError:checks[name]=True
import urllib.request
proxy=urllib.request.ProxyHandler({'https':os.environ['VIBE_DOWNLOAD_PROXY']})
opener=urllib.request.build_opener(proxy)
with opener.open('https://example.com/',timeout=20) as response:
 checks['allowed_public_https']=response.status==200 and b'Example Domain' in response.read(4096)
for name,target in [('ip_literal','169.254.169.254'),('unapproved_host','www.vercel.com'),('control_host','vercel-sandbox.local')]:
 with socket.create_connection(('127.0.0.1',47891),timeout=3) as peer:
  peer.sendall(('CONNECT '+target+':443 HTTP/1.1\\r\\n\\r\\n').encode())
  checks[name]=b'403 Forbidden' in peer.recv(1024)
print(json.dumps(checks)); assert all(checks.values())
PY`,
      { user: "user", timeoutMs: 15000 },
    );
    expect(result.exitCode).toBe(0);
  } finally {
    await sandbox.kill();
  }
});

it("real ephemeral Vercel adapter checks an owned synthetic patch and refuses symlink evidence", async () => {
  const sandbox = await createJobSandbox("coding", 90);
  try {
    await hardenSandbox(sandbox);
    expect(
      (
        await sandbox.commands.run("pnpm --version", { user: "user" })
      ).stdout.trim(),
    ).toBe("12.3.4");
    const patch = await checkPatch(
      sandbox,
      [
        {
          path: "README.md",
          content: "Owned synthetic fixture.\n",
          mode: "100644",
        },
      ],
      [
        {
          path: "README.md",
          content: "Owned synthetic fixture.\nBounded Vercel verification.\n",
        },
      ],
      ["test $(id -u) = 1001 && grep -q 'Bounded Vercel' README.md"],
    );
    expect(patch.patch).toContain("+Bounded Vercel verification.");
    expect(patch.report).toContain("Exit 0:");
    const attack = await sandbox.commands.run(
      "ln -s /etc/passwd /home/user/job/escaped; printf owned > /home/user/job/evidence; ln /home/user/job/evidence /home/user/job/linked",
      { user: "user", timeoutMs: 10000 },
    );
    expect(attack.exitCode).toBe(0);
    await expect(sandbox.files.read("/home/user/job/escaped")).rejects.toThrow(
      "INVALID_MEDIA_MANIFEST",
    );
    await expect(sandbox.files.read("/home/user/job/linked")).rejects.toThrow(
      "INVALID_MEDIA_MANIFEST",
    );
    const read = await sandbox.files.read("/home/user/job/README.md");
    expect(read).toContain("Bounded Vercel");
    await expect(
      checkPatch(
        sandbox,
        [{ path: "README.md", content: "original\n", mode: "100644" }],
        [{ path: "README.md", content: "approved\n" }],
        ["printf 'changed by check' > README.md"],
      ),
    ).rejects.toThrow("POLICY_BLOCKED");
    await sandbox.commands.run(
      "rm -f /home/user/job/README.md; ln -s /etc/passwd /home/user/job/README.md",
      { user: "user" },
    );
    await expect(
      sandbox.verifySnapshot([
        { path: "README.md", content: "approved\n", executable: false },
      ]),
    ).rejects.toThrow("POLICY_BLOCKED");
    await sandbox.commands.run(
      "rm -f /home/user/job/README.md; printf 'approved\\n' > /home/user/job/README.md; ln /home/user/job/README.md /home/user/job/readme-hardlink",
      { user: "user" },
    );
    await expect(
      sandbox.verifySnapshot([
        { path: "README.md", content: "approved\n", executable: false },
      ]),
    ).rejects.toThrow("POLICY_BLOCKED");
    await stopJobSandbox(sandbox.sandboxId);
    await sandbox.kill();
    await stopJobSandbox(sandbox.sandboxId);
  } finally {
    await sandbox.kill();
  }
});
