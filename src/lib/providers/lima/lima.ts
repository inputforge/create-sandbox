import { execFileSync } from "node:child_process";
import { mkdirSync, openSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { limaHome } from "../../paths.js";
import { getUbuntuImageUrl } from "../../platform.js";
import type { PlatformConfig } from "../../platform.js";
import type { SandboxConfig } from "../../sandbox.js";

const limaEnv = { ...process.env, LIMA_HOME: limaHome };

export function limaInstanceDir(name: string): string {
  return join(limaHome, name);
}

function limaYamlPath(name: string): string {
  return join(limaInstanceDir(name), "lima.yaml");
}

function toLibaSize(s: string): string {
  if (s.endsWith("G")) {
    return `${s.slice(0, -1)}GiB`;
  }
  if (s.endsWith("M")) {
    return `${s.slice(0, -1)}MiB`;
  }
  return s;
}

export interface LimaInstance {
  name: string;
  status: string;
  sshLocalPort: number;
  dir: string;
}

export function getLimaInstance(name: string): LimaInstance | null {
  try {
    const out = execFileSync("limactl", ["list", "--format", "json"], {
      encoding: "utf-8",
      env: limaEnv,
      stdio: ["pipe", "pipe", "pipe"],
    });
    for (const line of out.trim().split("\n")) {
      if (!line.trim()) {
        continue;
      }
      try {
        const entry = JSON.parse(line) as LimaInstance;
        if (entry.name === name) {
          return entry;
        }
      } catch {
        // skip malformed lines
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function isLimaRunning(name: string): boolean {
  return getLimaInstance(name)?.status === "Running";
}

function indentLines(s: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return s
    .split("\n")
    .map((l) => (l.trim() ? `${pad}${l}` : ""))
    .join("\n");
}

export function buildLimaYaml(
  config: SandboxConfig,
  pc: PlatformConfig,
  installScript: string,
  pubKey: string
): string {
  const imageUrl = getUbuntuImageUrl(config.ubuntu, pc.ubuntuArch);
  const limaArch = pc.arch === "arm64" ? "aarch64" : "x86_64";

  const sshKeyScript = [
    "#!/bin/bash",
    "set -euo pipefail",
    "mkdir -p /home/ubuntu/.ssh",
    `echo '${pubKey}' >> /home/ubuntu/.ssh/authorized_keys`,
    "sort -u /home/ubuntu/.ssh/authorized_keys -o /home/ubuntu/.ssh/authorized_keys",
    "chown -R ubuntu:ubuntu /home/ubuntu/.ssh",
    "chmod 700 /home/ubuntu/.ssh",
    "chmod 600 /home/ubuntu/.ssh/authorized_keys",
  ].join("\n");

  const portForwardLines = (config.ports ?? [])
    .map(
      (f) =>
        `  - guestPort: ${f.guest}\n    hostPort: ${f.host}\n    proto: ${f.protocol ?? "tcp"}`
    )
    .join("\n");

  const parts = [
    "vmType: vz",
    "os: Linux",
    "containerd:",
    "  system: false",
    "  user: false",
    `arch: ${limaArch}`,
    "images:",
    `  - location: "${imageUrl}"`,
    `    arch: ${limaArch}`,
    `cpus: ${config.vm.cpus}`,
    `memory: "${toLibaSize(config.vm.memory)}"`,
    `disk: "${toLibaSize(config.vm.disk)}"`,
    "ssh:",
    "  localPort: 0",
    "  loadDotSSHPubKeys: true",
    "provision:",
    "  - mode: system",
    "    script: |",
    indentLines(installScript, 6),
    "  - mode: system",
    "    script: |",
    indentLines(sshKeyScript, 6),
  ];

  if (portForwardLines) {
    parts.push("portForwards:", portForwardLines);
  }

  return `${parts.join("\n")}\n`;
}

export function writeLimaYaml(name: string, yaml: string): void {
  mkdirSync(limaInstanceDir(name), { recursive: true });
  writeFileSync(limaYamlPath(name), yaml, "utf-8");
}

export function checkLimactlInstalled(): void {
  try {
    execFileSync("limactl", ["--version"], { stdio: "ignore" });
  } catch {
    console.error(
      "Lima is required on macOS. Install it with: brew install lima"
    );
    process.exit(1);
  }
}

export function startLimaInstance(name: string, logPath: string): void {
  const logFd = openSync(logPath, "a");
  execFileSync("limactl", ["start", "--tty=false", name], {
    env: limaEnv,
    stdio: ["ignore", logFd, logFd],
  });
}

export function stopLimaInstance(name: string): void {
  execFileSync("limactl", ["stop", name], { env: limaEnv, stdio: "inherit" });
}

export function deleteLimaInstance(name: string): void {
  try {
    execFileSync("limactl", ["stop", "--force", name], {
      env: limaEnv,
      stdio: "ignore",
    });
  } catch {
    // already stopped or doesn't exist
  }
  execFileSync("limactl", ["delete", "--force", name], {
    env: limaEnv,
    stdio: "inherit",
  });
}
