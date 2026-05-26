import { execFileSync, execSync } from "node:child_process";

import { sandboxName } from "../lib/paths.js";
import { getPlatformConfig } from "../lib/platform.js";
import { getProvider } from "../lib/providers/index.js";
import { isRsyncAvailable } from "../lib/rsync.js";
import { getRemotePath, readSandboxConfig, readState } from "../lib/sandbox.js";

export async function send(): Promise<void> {
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

  const { username } = config;
  if (isRsyncAvailable()) {
    console.log(`Syncing to ${remotePath}...`);
    execFileSync(
      "rsync",
      [
        "-avz",
        "--delete",
        "-e",
        `ssh -p ${port} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null`,
        "--filter=:- .gitignore",
        "--exclude=.git",
        "./",
        `${username}@127.0.0.1:${remotePath}/`,
      ],
      { stdio: "inherit" }
    );
  } else {
    console.log(`Syncing to ${remotePath} (via tar)...`);
    const sshCmd = `ssh -p ${port} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${username}@127.0.0.1`;
    execSync(
      `tar czf - --exclude='.git' . | ${sshCmd} 'mkdir -p ${remotePath} && tar xzf - -C ${remotePath}'`,
      { stdio: ["pipe", "inherit", "inherit"] }
    );
  }
}
