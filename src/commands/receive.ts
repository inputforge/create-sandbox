import { execFileSync, execSync } from "node:child_process";

import { sandboxName } from "../lib/paths.js";
import { getPlatformConfig } from "../lib/platform.js";
import { getProvider } from "../lib/providers/index.js";
import { isRsyncAvailable } from "../lib/rsync.js";
import { getRemotePath, readSandboxConfig, readState } from "../lib/sandbox.js";

export async function receive(): Promise<void> {
  const name = sandboxName();
  const provider = getProvider(getPlatformConfig());

  if (!(await provider.isRunning(name))) {
    console.error(
      `Sandbox "${name}" is not running. Start it first: create-sandbox start`
    );
    process.exit(1);
  }

  const state = readState();
  if (!state) {
    console.error("No state found. The sandbox may need to be restarted.");
    process.exit(1);
  }

  const config = readSandboxConfig();
  const remotePath = getRemotePath(config);
  const port = String(state.port);

  if (isRsyncAvailable()) {
    console.log(`Receiving from ${remotePath}...`);
    execFileSync(
      "rsync",
      [
        "-avz",
        "-e",
        `ssh -p ${port} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null`,
        `ubuntu@127.0.0.1:${remotePath}/`,
        "./",
      ],
      { stdio: "inherit" }
    );
  } else {
    console.log(`Receiving from ${remotePath} (via tar)...`);
    const sshCmd = `ssh -p ${port} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ubuntu@127.0.0.1`;
    execSync(`${sshCmd} 'tar czf - -C ${remotePath} .' | tar xzf -`, {
      stdio: ["pipe", "inherit", "inherit"],
    });
  }
}
