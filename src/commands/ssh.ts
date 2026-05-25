import { execFileSync } from "node:child_process";

import { sandboxName } from "../lib/paths.js";
import { getPlatformConfig } from "../lib/platform.js";
import { getProvider } from "../lib/providers/index.js";
import { readState } from "../lib/sandbox.js";

export async function ssh(): Promise<void> {
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

  try {
    execFileSync(
      "ssh",
      [
        "-o",
        "StrictHostKeyChecking=no",
        "-o",
        "UserKnownHostsFile=/dev/null",
        "-p",
        String(state.port),
        "ubuntu@127.0.0.1",
      ],
      { stdio: "inherit" }
    );
  } catch {
    // ssh exits non-zero on normal logout; suppress the error
  }
}
